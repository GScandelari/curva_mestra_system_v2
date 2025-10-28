import * as admin from 'firebase-admin';
import FirestoreService from './firestoreService';
import InventoryService from './inventoryService';
import { PatientService } from './patientService';
import { RequestService } from './requestService';
import NotificationService from './notificationService';

/**
 * Dashboard Service for managing real-time dashboard data and notifications
 */
export class DashboardService {
  private static realtimeDb: admin.database.Database | null = null;

  private static getRealtimeDb() {
    if (!this.realtimeDb) {
      this.realtimeDb = admin.database();
    }
    return this.realtimeDb;
  }

  /**
   * Update dashboard metrics in Realtime Database
   */
  static async updateDashboardMetrics(clinicId: string): Promise<void> {
    try {
      // Get current dashboard data
      const dashboardData = await InventoryService.getDashboardData(clinicId);
      const lowStockItems = await InventoryService.getLowStockItems(clinicId);
      const expiringItems = await InventoryService.getExpiringItems(clinicId, 30);
      
      // Get recent activity count (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentRequests = await RequestService.getRequestsByDateRange(
        clinicId, 
        sevenDaysAgo, 
        new Date()
      );

      // Get patient count
      const patients = await PatientService.listPatients(clinicId);

      // Prepare dashboard metrics
      const metrics = {
        total_products: dashboardData.totalProducts,
        low_stock_alerts: lowStockItems.length,
        expiring_soon: expiringItems.length,
        total_patients: patients.length,
        recent_activity_count: recentRequests.length,
        last_update: admin.database.ServerValue.TIMESTAMP
      };

      // Update in Realtime Database
      await this.getRealtimeDb()
        .ref(`clinics/${clinicId}/dashboard`)
        .set(metrics);

      console.log(`Dashboard metrics updated for clinic: ${clinicId}`);
    } catch (error) {
      console.error('Error updating dashboard metrics:', error);
      throw new Error(`Failed to update dashboard metrics: ${error}`);
    }
  }

  /**
   * Get dashboard metrics from Realtime Database
   */
  static async getDashboardMetrics(clinicId: string): Promise<any> {
    try {
      const snapshot = await this.getRealtimeDb()
        .ref(`clinics/${clinicId}/dashboard`)
        .once('value');
      
      return snapshot.val() || null;
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      return null;
    }
  }

  /**
   * Create notification for low stock alert
   */
  static async createLowStockNotification(
    clinicId: string, 
    productId: string, 
    productName: string, 
    currentStock: number, 
    minimumLevel: number
  ): Promise<void> {
    try {
      const notification = {
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${productName} is running low (${currentStock} remaining, minimum: ${minimumLevel})`,
        product_id: productId,
        current_stock: currentStock,
        minimum_level: minimumLevel,
        severity: 'warning',
        read: false,
        timestamp: admin.database.ServerValue.TIMESTAMP
      };

      // Add to clinic notifications
      const notificationId = this.getRealtimeDb().ref().child('notifications').push().key;
      
      if (notificationId) {
        await this.getRealtimeDb()
          .ref(`clinics/${clinicId}/notifications/${notificationId}`)
          .set(notification);

        // Also send to notification service for user notifications
        await NotificationService.notifyLowStock(clinicId, productName, currentStock, minimumLevel);
      }
    } catch (error) {
      console.error('Error creating low stock notification:', error);
    }
  }

  /**
   * Create notification for expiring products
   */
  static async createExpirationNotification(
    clinicId: string, 
    productId: string, 
    productName: string, 
    expirationDate: Date, 
    daysUntilExpiration: number,
    lot: string
  ): Promise<void> {
    try {
      const notification = {
        type: 'expiring_product',
        title: 'Product Expiring Soon',
        message: `${productName} (Lot: ${lot}) expires in ${daysUntilExpiration} days`,
        product_id: productId,
        expiration_date: expirationDate.toISOString(),
        days_until_expiration: daysUntilExpiration,
        lot: lot,
        severity: daysUntilExpiration <= 7 ? 'error' : 'warning',
        read: false,
        timestamp: admin.database.ServerValue.TIMESTAMP
      };

      // Add to clinic notifications
      const notificationId = this.getRealtimeDb().ref().child('notifications').push().key;
      
      if (notificationId) {
        await this.getRealtimeDb()
          .ref(`clinics/${clinicId}/notifications/${notificationId}`)
          .set(notification);

        // Also send to notification service for user notifications
        await NotificationService.notifyExpiringProducts(clinicId, productName, expirationDate, daysUntilExpiration);
      }
    } catch (error) {
      console.error('Error creating expiration notification:', error);
    }
  }

  /**
   * Get clinic notifications
   */
  static async getClinicNotifications(clinicId: string, limit: number = 50): Promise<any[]> {
    try {
      const snapshot = await this.getRealtimeDb()
        .ref(`clinics/${clinicId}/notifications`)
        .orderByChild('timestamp')
        .limitToLast(limit)
        .once('value');
      
      const notifications: any[] = [];
      snapshot.forEach(child => {
        notifications.push({
          id: child.key,
          ...child.val()
        });
      });
      
      // Return in reverse order (newest first)
      return notifications.reverse();
    } catch (error) {
      console.error('Error getting clinic notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(clinicId: string, notificationId: string): Promise<void> {
    try {
      await this.getRealtimeDb()
        .ref(`clinics/${clinicId}/notifications/${notificationId}/read`)
        .set(true);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Clear old notifications (older than 30 days)
   */
  static async clearOldNotifications(clinicId: string): Promise<void> {
    try {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      const snapshot = await this.getRealtimeDb()
        .ref(`clinics/${clinicId}/notifications`)
        .orderByChild('timestamp')
        .endAt(thirtyDaysAgo)
        .once('value');
      
      const deletePromises: Promise<void>[] = [];
      snapshot.forEach(notification => {
        if (notification.key) {
          deletePromises.push(
            this.getRealtimeDb()
              .ref(`clinics/${clinicId}/notifications/${notification.key}`)
              .remove()
          );
        }
      });
      
      await Promise.all(deletePromises);
      console.log(`Old notifications cleared for clinic: ${clinicId}`);
    } catch (error) {
      console.error('Error clearing old notifications:', error);
    }
  }

  /**
   * Check and create alerts for low stock and expiring products
   */
  static async checkAndCreateAlerts(clinicId: string): Promise<void> {
    try {
      // Get clinic settings for alert thresholds
      const clinic = await FirestoreService.getClinicById(clinicId);
      if (!clinic) {
        throw new Error('Clinic not found');
      }

      const alertThresholdDays = clinic.settings.notification_preferences.alert_threshold_days || 30;

      // Check for low stock items
      const lowStockItems = await InventoryService.getLowStockItems(clinicId);
      
      for (const item of lowStockItems) {
        // Get product details
        const product = await FirestoreService.getProductById(item.product_id);
        if (product) {
          await this.createLowStockNotification(
            clinicId,
            item.product_id,
            product.name,
            item.quantity_in_stock,
            item.minimum_stock_level
          );
        }
      }

      // Check for expiring items
      const expiringItems = await InventoryService.getExpiringItems(clinicId, alertThresholdDays);
      
      for (const { item, expiringEntries } of expiringItems) {
        // Get product details
        const product = await FirestoreService.getProductById(item.product_id);
        if (product) {
          for (const entry of expiringEntries) {
            const daysUntilExpiration = Math.ceil((entry.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            
            await this.createExpirationNotification(
              clinicId,
              item.product_id,
              product.name,
              entry.date,
              daysUntilExpiration,
              entry.lot
            );
          }
        }
      }

      console.log(`Alerts checked and created for clinic: ${clinicId}`);
    } catch (error) {
      console.error('Error checking and creating alerts:', error);
    }
  }

  /**
   * Update recent activity in dashboard
   */
  static async updateRecentActivity(clinicId: string, activity: {
    type: 'invoice' | 'request' | 'patient';
    action: 'created' | 'updated' | 'deleted';
    resource_id: string;
    description: string;
    user_id: string;
  }): Promise<void> {
    try {
      const activityEntry = {
        ...activity,
        timestamp: admin.database.ServerValue.TIMESTAMP
      };

      // Add to recent activity list (keep last 50 entries)
      const activityRef = this.getRealtimeDb().ref(`clinics/${clinicId}/recent_activity`);
      
      // Push new activity
      await activityRef.push(activityEntry);
      
      // Keep only last 50 entries
      const snapshot = await activityRef
        .orderByChild('timestamp')
        .limitToLast(51) // Get 51 to identify the oldest
        .once('value');
      
      const activities: any[] = [];
      snapshot.forEach(child => {
        activities.push({
          key: child.key,
          ...child.val()
        });
      });
      
      // If we have more than 50, remove the oldest
      if (activities.length > 50) {
        const oldestKey = activities[0].key;
        await activityRef.child(oldestKey).remove();
      }

    } catch (error) {
      console.error('Error updating recent activity:', error);
    }
  }

  /**
   * Get recent activity for dashboard
   */
  static async getRecentActivity(clinicId: string, limit: number = 20): Promise<any[]> {
    try {
      const snapshot = await this.getRealtimeDb()
        .ref(`clinics/${clinicId}/recent_activity`)
        .orderByChild('timestamp')
        .limitToLast(limit)
        .once('value');
      
      const activities: any[] = [];
      snapshot.forEach(child => {
        activities.push({
          id: child.key,
          ...child.val()
        });
      });
      
      // Return in reverse order (newest first)
      return activities.reverse();
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }
}

export default DashboardService;