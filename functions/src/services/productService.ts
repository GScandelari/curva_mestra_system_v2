import { Timestamp } from 'firebase-admin/firestore';
import { Product, ApprovalEntry, InventoryItem } from '../models/types';
import FirestoreService from './firestoreService';
import NotificationService from './notificationService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Product Service for managing product operations
 */
export class ProductService {
  
  /**
   * Create a new product
   */
  static async createProduct(productData: {
    name: string;
    description: string;
    rennova_code: string;
    category: string;
    unit_type: 'ml' | 'units' | 'vials';
    status?: 'approved' | 'pending';
    requested_by_clinic_id?: string;
  }): Promise<Product> {
    const product: Product = {
      product_id: uuidv4(),
      name: productData.name,
      description: productData.description,
      rennova_code: productData.rennova_code,
      category: productData.category,
      unit_type: productData.unit_type,
      status: productData.status || 'pending',
      requested_by_clinic_id: productData.requested_by_clinic_id,
      approval_history: [],
      created_at: Timestamp.now()
    };

    await FirestoreService.createProduct(product);

    // Send notification to system admins if product is pending
    if (product.status === 'pending' && product.requested_by_clinic_id) {
      await NotificationService.notifySystemAdminsNewProduct(
        product.product_id,
        product.name,
        product.requested_by_clinic_id
      );
    }

    return product;
  }

  /**
   * Get product by ID
   */
  static async getProductById(productId: string): Promise<Product | null> {
    return await FirestoreService.getProductById(productId);
  }

  /**
   * List products with optional status filter
   */
  static async listProducts(status?: 'approved' | 'pending'): Promise<Product[]> {
    return await FirestoreService.listProducts(status);
  }

  /**
   * Approve a pending product
   */
  static async approveProduct(
    productId: string, 
    approvedBy: string, 
    notes?: string
  ): Promise<Product> {
    const product = await FirestoreService.getProductById(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.status === 'approved') {
      throw new Error('Product is already approved');
    }

    const approvalEntry: ApprovalEntry = {
      approved_by: approvedBy,
      approved_at: Timestamp.now(),
      notes
    };

    const updates: Partial<Product> = {
      status: 'approved',
      approval_history: [...product.approval_history, approvalEntry]
    };

    await FirestoreService.updateProduct(productId, updates);

    const updatedProduct = {
      ...product,
      ...updates
    };

    // Add product to requesting clinic's inventory if it was requested by a clinic
    if (product.requested_by_clinic_id) {
      await this.addProductToClinicInventory(product.requested_by_clinic_id, updatedProduct);
      
      // Notify clinic about approval
      await NotificationService.notifyClinicProductApproved(
        productId,
        product.name,
        product.requested_by_clinic_id
      );
    }

    return updatedProduct;
  }

  /**
   * Update product information
   */
  static async updateProduct(
    productId: string, 
    updates: Partial<Pick<Product, 'name' | 'description' | 'category' | 'unit_type'>>
  ): Promise<Product> {
    const product = await FirestoreService.getProductById(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }

    await FirestoreService.updateProduct(productId, updates);

    return {
      ...product,
      ...updates
    };
  }

  /**
   * Check if product exists by rennova_code
   */
  static async getProductByRennovaCode(rennovaCode: string): Promise<Product | null> {
    const products = await FirestoreService.listProducts();
    return products.find(product => product.rennova_code === rennovaCode) || null;
  }

  /**
   * Get pending products for system admin review
   */
  static async getPendingProducts(): Promise<Product[]> {
    return await FirestoreService.listProducts('pending');
  }

  /**
   * Get approved products for general use
   */
  static async getApprovedProducts(): Promise<Product[]> {
    return await FirestoreService.listProducts('approved');
  }

  /**
   * Add approved product to clinic inventory
   */
  private static async addProductToClinicInventory(clinicId: string, product: Product): Promise<void> {
    try {
      // Check if product already exists in clinic inventory
      const existingInventory = await FirestoreService.getInventoryByProduct(clinicId, product.product_id);
      
      if (!existingInventory) {
        // Create new inventory item with zero stock
        const inventoryItem: InventoryItem = {
          inventory_id: uuidv4(),
          clinic_id: clinicId,
          product_id: product.product_id,
          quantity_in_stock: 0,
          minimum_stock_level: 1, // Default minimum stock level
          expiration_dates: [],
          last_update: Timestamp.now(),
          last_movement: {
            type: 'in',
            quantity: 0,
            reference_id: 'product_approval',
            timestamp: Timestamp.now()
          }
        };

        await FirestoreService.createInventoryItem(clinicId, inventoryItem);
        console.log(`Added product ${product.name} to clinic ${clinicId} inventory`);
      } else {
        console.log(`Product ${product.name} already exists in clinic ${clinicId} inventory`);
      }
    } catch (error) {
      console.error('Error adding product to clinic inventory:', error);
      // Don't throw error to avoid breaking the approval process
    }
  }

  /**
   * Validate product data
   */
  static validateProductData(productData: {
    name?: string;
    description?: string;
    rennova_code?: string;
    category?: string;
    unit_type?: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (productData.name !== undefined) {
      if (!productData.name || productData.name.trim().length === 0) {
        errors.push('Product name is required');
      } else if (productData.name.length > 100) {
        errors.push('Product name must be 100 characters or less');
      }
    }

    if (productData.description !== undefined) {
      if (!productData.description || productData.description.trim().length === 0) {
        errors.push('Product description is required');
      } else if (productData.description.length > 500) {
        errors.push('Product description must be 500 characters or less');
      }
    }

    if (productData.rennova_code !== undefined) {
      if (!productData.rennova_code || productData.rennova_code.trim().length === 0) {
        errors.push('Rennova code is required');
      } else if (!/^[A-Z0-9-]+$/.test(productData.rennova_code)) {
        errors.push('Rennova code must contain only uppercase letters, numbers, and hyphens');
      }
    }

    if (productData.category !== undefined) {
      if (!productData.category || productData.category.trim().length === 0) {
        errors.push('Product category is required');
      }
    }

    if (productData.unit_type !== undefined) {
      if (!['ml', 'units', 'vials'].includes(productData.unit_type)) {
        errors.push('Unit type must be one of: ml, units, vials');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default ProductService;