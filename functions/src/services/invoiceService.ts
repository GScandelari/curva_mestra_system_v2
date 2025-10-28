import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase-admin/firestore';
import FirestoreService from './firestoreService';
import InventoryService from './inventoryService';
import ProductService from './productService';
import { Invoice, InvoiceProduct, Product } from '../models/types';

export class InvoiceService {
  
  /**
   * Create a new invoice for a clinic
   */
  static async createInvoice(
    clinicId: string, 
    invoiceData: Omit<Invoice, 'invoice_id' | 'clinic_id' | 'created_at'>
  ): Promise<Invoice> {
    // Validate products and handle non-existent ones
    const validatedProducts = await this.validateAndProcessProducts(clinicId, invoiceData.products);
    
    // Check for duplicate invoice number
    const duplicateExists = await this.invoiceNumberExists(clinicId, invoiceData.invoice_number);
    if (duplicateExists) {
      throw new Error('Duplicate invoice number');
    }

    const invoice: Invoice = {
      invoice_id: uuidv4(),
      clinic_id: clinicId,
      created_at: Timestamp.now(),
      ...invoiceData,
      products: validatedProducts
    };

    await FirestoreService.createInvoice(clinicId, invoice);

    // If invoice is approved, update inventory immediately
    if (invoice.status === 'approved') {
      await this.updateInventoryFromInvoice(clinicId, invoice);
    }

    // Update dashboard activity (import dynamically to avoid circular dependency)
    try {
      const { DashboardService } = await import('./dashboardService');
      await DashboardService.updateRecentActivity(clinicId, {
        type: 'invoice',
        action: 'created',
        resource_id: invoice.invoice_id,
        description: `Invoice ${invoice.invoice_number} created`,
        user_id: invoice.created_by
      });
    } catch (error) {
      console.warn('Failed to update dashboard activity:', error);
    }

    return invoice;
  }

  /**
   * Get invoice by ID within a clinic
   */
  static async getInvoice(clinicId: string, invoiceId: string): Promise<Invoice | null> {
    return FirestoreService.getInvoiceById(clinicId, invoiceId);
  }

  /**
   * List all invoices for a clinic
   */
  static async listInvoices(clinicId: string): Promise<Invoice[]> {
    return FirestoreService.listInvoices(clinicId);
  }

  /**
   * Update invoice status
   */
  static async updateInvoiceStatus(
    clinicId: string, 
    invoiceId: string, 
    status: 'pending' | 'approved' | 'rejected'
  ): Promise<void> {
    const invoice = await this.getInvoice(clinicId, invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const previousStatus = invoice.status;
    
    const invoiceRef = FirestoreService.getInvoicesCollection(clinicId).doc(invoiceId);
    await invoiceRef.update({ status });

    // If invoice is being approved, update inventory
    if (status === 'approved' && previousStatus !== 'approved') {
      await this.updateInventoryFromInvoice(clinicId, { ...invoice, status });
    }
  }

  /**
   * Add products to an existing invoice
   */
  static async addProductsToInvoice(
    clinicId: string, 
    invoiceId: string, 
    products: InvoiceProduct[]
  ): Promise<void> {
    const invoice = await this.getInvoice(clinicId, invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const updatedProducts = [...invoice.products, ...products];
    const totalValue = updatedProducts.reduce((sum, product) => 
      sum + (product.quantity * product.unit_price), 0
    );

    const invoiceRef = FirestoreService.getInvoicesCollection(clinicId).doc(invoiceId);
    await invoiceRef.update({ 
      products: updatedProducts,
      total_value: totalValue
    });
  }

  /**
   * Get invoices by status
   */
  static async getInvoicesByStatus(
    clinicId: string, 
    status: 'pending' | 'approved' | 'rejected'
  ): Promise<Invoice[]> {
    const snapshot = await FirestoreService.getInvoicesCollection(clinicId)
      .where('status', '==', status)
      .orderBy('created_at', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Invoice);
  }

  /**
   * Get invoices within date range
   */
  static async getInvoicesByDateRange(
    clinicId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<Invoice[]> {
    const snapshot = await FirestoreService.getInvoicesCollection(clinicId)
      .where('emission_date', '>=', startDate)
      .where('emission_date', '<=', endDate)
      .orderBy('emission_date', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Invoice);
  }

  /**
   * Update invoice
   */
  static async updateInvoice(
    clinicId: string, 
    invoiceId: string, 
    updates: Partial<Omit<Invoice, 'invoice_id' | 'clinic_id' | 'created_at'>>
  ): Promise<Invoice> {
    const currentInvoice = await this.getInvoice(clinicId, invoiceId);
    if (!currentInvoice) {
      throw new Error('Invoice not found');
    }

    // Validate products if they are being updated
    if (updates.products) {
      updates.products = await this.validateAndProcessProducts(clinicId, updates.products);
      updates.total_value = updates.products.reduce((sum, product) => 
        sum + (product.quantity * product.unit_price), 0
      );
    }

    // Check for duplicate invoice number if it's being updated
    if (updates.invoice_number && updates.invoice_number !== currentInvoice.invoice_number) {
      const duplicateExists = await this.invoiceNumberExists(clinicId, updates.invoice_number, invoiceId);
      if (duplicateExists) {
        throw new Error('Duplicate invoice number');
      }
    }

    const invoiceRef = FirestoreService.getInvoicesCollection(clinicId).doc(invoiceId);
    await invoiceRef.update(updates);
    
    const updatedDoc = await invoiceRef.get();
    if (!updatedDoc.exists) {
      throw new Error('Invoice not found after update');
    }
    
    const updatedInvoice = updatedDoc.data() as Invoice;

    // If invoice status changed to approved, update inventory
    if (updates.status === 'approved' && currentInvoice.status !== 'approved') {
      await this.updateInventoryFromInvoice(clinicId, updatedInvoice);
    }
    
    return updatedInvoice;
  }

  /**
   * Delete invoice
   */
  static async deleteInvoice(clinicId: string, invoiceId: string): Promise<void> {
    const invoice = await this.getInvoice(clinicId, invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Prevent deletion of approved invoices that may have affected inventory
    if (invoice.status === 'approved') {
      throw new Error('Cannot delete approved invoice. Please reject it first if needed.');
    }

    const invoiceRef = FirestoreService.getInvoicesCollection(clinicId).doc(invoiceId);
    await invoiceRef.delete();
  }

  /**
   * Check if invoice number exists in clinic
   */
  static async invoiceNumberExists(clinicId: string, invoiceNumber: string, excludeId?: string): Promise<boolean> {
    let query = FirestoreService.getInvoicesCollection(clinicId)
      .where('invoice_number', '==', invoiceNumber);
    
    const snapshot = await query.get();
    
    if (excludeId) {
      return snapshot.docs.some(doc => doc.id !== excludeId);
    }
    
    return !snapshot.empty;
  }

  /**
   * Validate products and create pending products for non-existent ones
   */
  private static async validateAndProcessProducts(
    clinicId: string, 
    products: InvoiceProduct[]
  ): Promise<InvoiceProduct[]> {
    const validatedProducts: InvoiceProduct[] = [];

    for (const product of products) {
      // Check if product exists in approved catalog
      const existingProduct = await ProductService.getProductById(product.product_id);
      
      if (!existingProduct) {
        // Create pending product request
        const newProduct = await ProductService.createProduct({
          name: `Product ${product.product_id}`, // This should be provided in the request
          description: 'Product requested via invoice',
          rennova_code: product.product_id, // Assuming product_id is the rennova_code
          category: 'General',
          unit_type: 'units',
          status: 'pending',
          requested_by_clinic_id: clinicId
        });
        
        // Update the product_id to the newly created product
        validatedProducts.push({
          ...product,
          product_id: newProduct.product_id
        });
      } else if (existingProduct.status !== 'approved') {
        throw new Error(`Product ${product.product_id} is not approved for use`);
      } else {
        validatedProducts.push(product);
      }
    }

    return validatedProducts;
  }

  /**
   * Update inventory from approved invoice
   */
  private static async updateInventoryFromInvoice(clinicId: string, invoice: Invoice): Promise<void> {
    try {
      for (const product of invoice.products) {
        await InventoryService.addStock(
          clinicId,
          product.product_id,
          product.quantity,
          product.expiration_date,
          product.lot,
          invoice.invoice_id
        );
      }
      console.log(`Inventory updated for invoice ${invoice.invoice_id} in clinic ${clinicId}`);
    } catch (error: any) {
      console.error('Error updating inventory from invoice:', error);
      throw new Error(`Failed to update inventory: ${error.message}`);
    }
  }

  /**
   * Get products that need approval from an invoice
   */
  static async getPendingProductsFromInvoice(clinicId: string, invoiceId: string): Promise<Product[]> {
    const invoice = await this.getInvoice(clinicId, invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const pendingProducts: Product[] = [];

    for (const invoiceProduct of invoice.products) {
      const product = await ProductService.getProductById(invoiceProduct.product_id);
      if (product && product.status === 'pending' && product.requested_by_clinic_id === clinicId) {
        pendingProducts.push(product);
      }
    }

    return pendingProducts;
  }

  /**
   * Validate invoice products against approved catalog
   */
  static async validateInvoiceProducts(products: InvoiceProduct[]): Promise<{
    valid: boolean;
    issues: string[];
    pendingProducts: string[];
  }> {
    const issues: string[] = [];
    const pendingProducts: string[] = [];

    for (const product of products) {
      const existingProduct = await ProductService.getProductById(product.product_id);
      
      if (!existingProduct) {
        pendingProducts.push(product.product_id);
      } else if (existingProduct.status !== 'approved') {
        issues.push(`Product ${product.product_id} is not approved`);
      }

      // Validate product data
      if (product.quantity <= 0) {
        issues.push(`Invalid quantity for product ${product.product_id}`);
      }
      
      if (product.unit_price <= 0) {
        issues.push(`Invalid unit price for product ${product.product_id}`);
      }
      
      if (!product.lot || product.lot.trim().length === 0) {
        issues.push(`Lot number required for product ${product.product_id}`);
      }
      
      if (product.expiration_date <= new Date()) {
        issues.push(`Expiration date must be in the future for product ${product.product_id}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      pendingProducts
    };
  }
}

export default InvoiceService;