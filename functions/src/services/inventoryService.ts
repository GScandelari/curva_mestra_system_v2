import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase-admin/firestore';
import FirestoreService from './firestoreService';
import { InventoryItem, ExpirationEntry, ProductUsage } from '../models/types';

export class InventoryService {
  
  /**
   * Create a new inventory item for a clinic
   */
  static async createInventoryItem(
    clinicId: string, 
    productId: string,
    initialQuantity: number = 0,
    minimumStockLevel: number = 0
  ): Promise<InventoryItem> {
    const inventoryItem: InventoryItem = {
      inventory_id: uuidv4(),
      clinic_id: clinicId,
      product_id: productId,
      quantity_in_stock: initialQuantity,
      minimum_stock_level: minimumStockLevel,
      expiration_dates: [],
      last_update: Timestamp.now(),
      last_movement: {
        type: 'in',
        quantity: initialQuantity,
        reference_id: 'initial_stock',
        timestamp: Timestamp.now()
      }
    };

    await FirestoreService.createInventoryItem(clinicId, inventoryItem);
    return inventoryItem;
  }

  /**
   * Get inventory item by product ID
   */
  static async getInventoryByProduct(
    clinicId: string, 
    productId: string
  ): Promise<InventoryItem | null> {
    return FirestoreService.getInventoryByProduct(clinicId, productId);
  }

  /**
   * List all inventory items for a clinic
   */
  static async listInventory(clinicId: string): Promise<InventoryItem[]> {
    return FirestoreService.listInventory(clinicId);
  }

  /**
   * Add stock to inventory (from invoice)
   */
  static async addStock(
    clinicId: string,
    productId: string,
    quantity: number,
    expirationDate: Date,
    lot: string,
    referenceId: string // invoice_id
  ): Promise<void> {
    let inventoryItem = await this.getInventoryByProduct(clinicId, productId);
    
    // Create inventory item if it doesn't exist
    if (!inventoryItem) {
      inventoryItem = await this.createInventoryItem(clinicId, productId);
    }

    // Add to expiration dates array
    const existingExpirationIndex = inventoryItem.expiration_dates.findIndex(
      exp => exp.date.getTime() === expirationDate.getTime() && exp.lot === lot
    );

    if (existingExpirationIndex >= 0) {
      // Update existing expiration entry
      inventoryItem.expiration_dates[existingExpirationIndex].quantity += quantity;
    } else {
      // Add new expiration entry
      inventoryItem.expiration_dates.push({
        date: expirationDate,
        lot: lot,
        quantity: quantity
      });
    }

    // Update total quantity and last movement
    const updates: Partial<InventoryItem> = {
      quantity_in_stock: inventoryItem.quantity_in_stock + quantity,
      expiration_dates: inventoryItem.expiration_dates,
      last_update: Timestamp.now(),
      last_movement: {
        type: 'in',
        quantity: quantity,
        reference_id: referenceId,
        timestamp: Timestamp.now()
      }
    };

    await FirestoreService.updateInventoryItem(clinicId, inventoryItem.inventory_id, updates);
    
    // Trigger dashboard update (import dynamically to avoid circular dependency)
    try {
      const { DashboardService } = await import('./dashboardService');
      await DashboardService.updateDashboardMetrics(clinicId);
    } catch (error) {
      console.warn('Failed to update dashboard metrics:', error);
    }
  }

  /**
   * Remove stock from inventory (for requests)
   */
  static async removeStock(
    clinicId: string,
    productUsage: ProductUsage[],
    referenceId: string // request_id
  ): Promise<void> {
    const batch = FirestoreService.getBatch();

    for (const usage of productUsage) {
      const inventoryItem = await this.getInventoryByProduct(clinicId, usage.product_id);
      
      if (!inventoryItem) {
        throw new Error(`Product ${usage.product_id} not found in inventory`);
      }

      if (inventoryItem.quantity_in_stock < usage.quantity) {
        throw new Error(`Insufficient stock for product ${usage.product_id}`);
      }

      // Find and update the specific expiration entry
      const expirationIndex = inventoryItem.expiration_dates.findIndex(
        exp => exp.date.getTime() === usage.expiration_date.getTime() && exp.lot === usage.lot
      );

      if (expirationIndex === -1) {
        throw new Error(`Expiration entry not found for product ${usage.product_id}, lot ${usage.lot}`);
      }

      if (inventoryItem.expiration_dates[expirationIndex].quantity < usage.quantity) {
        throw new Error(`Insufficient quantity in lot ${usage.lot} for product ${usage.product_id}`);
      }

      // Update expiration entry
      inventoryItem.expiration_dates[expirationIndex].quantity -= usage.quantity;
      
      // Remove expiration entry if quantity becomes 0
      if (inventoryItem.expiration_dates[expirationIndex].quantity === 0) {
        inventoryItem.expiration_dates.splice(expirationIndex, 1);
      }

      // Update inventory item
      const updates: Partial<InventoryItem> = {
        quantity_in_stock: inventoryItem.quantity_in_stock - usage.quantity,
        expiration_dates: inventoryItem.expiration_dates,
        last_update: Timestamp.now(),
        last_movement: {
          type: 'out',
          quantity: usage.quantity,
          reference_id: referenceId,
          timestamp: Timestamp.now()
        }
      };

      const inventoryRef = FirestoreService.getInventoryCollection(clinicId)
                                         .doc(inventoryItem.inventory_id);
      batch.update(inventoryRef, updates);
    }

    await batch.commit();
    
    // Trigger dashboard update (import dynamically to avoid circular dependency)
    try {
      const { DashboardService } = await import('./dashboardService');
      await DashboardService.updateDashboardMetrics(clinicId);
    } catch (error) {
      console.warn('Failed to update dashboard metrics:', error);
    }
  }

  /**
   * Check if sufficient stock is available for a request
   */
  static async checkStockAvailability(
    clinicId: string,
    productUsage: ProductUsage[]
  ): Promise<{ available: boolean; issues: string[] }> {
    const issues: string[] = [];

    for (const usage of productUsage) {
      const inventoryItem = await this.getInventoryByProduct(clinicId, usage.product_id);
      
      if (!inventoryItem) {
        issues.push(`Product ${usage.product_id} not found in inventory`);
        continue;
      }

      if (inventoryItem.quantity_in_stock < usage.quantity) {
        issues.push(`Insufficient stock for product ${usage.product_id}. Available: ${inventoryItem.quantity_in_stock}, Required: ${usage.quantity}`);
        continue;
      }

      // Check specific lot availability
      const expirationEntry = inventoryItem.expiration_dates.find(
        exp => exp.date.getTime() === usage.expiration_date.getTime() && exp.lot === usage.lot
      );

      if (!expirationEntry) {
        issues.push(`Lot ${usage.lot} not found for product ${usage.product_id}`);
        continue;
      }

      if (expirationEntry.quantity < usage.quantity) {
        issues.push(`Insufficient quantity in lot ${usage.lot} for product ${usage.product_id}. Available: ${expirationEntry.quantity}, Required: ${usage.quantity}`);
      }
    }

    return {
      available: issues.length === 0,
      issues
    };
  }

  /**
   * Get low stock items
   */
  static async getLowStockItems(clinicId: string): Promise<InventoryItem[]> {
    const inventory = await this.listInventory(clinicId);
    
    return inventory.filter(item => 
      item.quantity_in_stock <= item.minimum_stock_level
    );
  }

  /**
   * Get items expiring soon
   */
  static async getExpiringItems(
    clinicId: string, 
    daysAhead: number = 30
  ): Promise<{ item: InventoryItem; expiringEntries: ExpirationEntry[] }[]> {
    const inventory = await this.listInventory(clinicId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    const expiringItems: { item: InventoryItem; expiringEntries: ExpirationEntry[] }[] = [];

    inventory.forEach(item => {
      const expiringEntries = item.expiration_dates.filter(
        entry => entry.date <= cutoffDate && entry.quantity > 0
      );

      if (expiringEntries.length > 0) {
        expiringItems.push({ item, expiringEntries });
      }
    });

    return expiringItems;
  }

  /**
   * Update minimum stock level
   */
  static async updateMinimumStockLevel(
    clinicId: string,
    productId: string,
    minimumLevel: number
  ): Promise<void> {
    const inventoryItem = await this.getInventoryByProduct(clinicId, productId);
    
    if (!inventoryItem) {
      throw new Error(`Product ${productId} not found in inventory`);
    }

    await FirestoreService.updateInventoryItem(clinicId, inventoryItem.inventory_id, {
      minimum_stock_level: minimumLevel,
      last_update: Timestamp.now()
    });
  }

  /**
   * Get inventory dashboard data
   */
  static async getDashboardData(clinicId: string): Promise<{
    totalProducts: number;
    lowStockCount: number;
    expiringCount: number;
    totalValue: number;
  }> {
    const inventory = await this.listInventory(clinicId);
    const lowStockItems = await this.getLowStockItems(clinicId);
    const expiringItems = await this.getExpiringItems(clinicId, 30);

    return {
      totalProducts: inventory.length,
      lowStockCount: lowStockItems.length,
      expiringCount: expiringItems.length,
      totalValue: 0 // This would need product pricing information
    };
  }

  /**
   * Get available lots for a product
   */
  static async getAvailableLots(
    clinicId: string,
    productId: string
  ): Promise<ExpirationEntry[]> {
    const inventoryItem = await this.getInventoryByProduct(clinicId, productId);
    
    if (!inventoryItem) {
      return [];
    }

    return inventoryItem.expiration_dates
      .filter(entry => entry.quantity > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort by expiration date
  }
}

export default InventoryService;