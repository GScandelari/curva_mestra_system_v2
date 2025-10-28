import * as admin from 'firebase-admin';
import { UserRole } from '../config/auth';
import FirestoreService from './firestoreService';

/**
 * Notification Service for managing real-time notifications
 */
export class NotificationService {
  private static realtimeDb: admin.database.Database | null = null;

  private static getRealtimeDb() {
    if (!this.realtimeDb) {
      this.realtimeDb = admin.database();
    }
    return this.realtimeDb;
  }

  /**
   * Send notification to system admins about new product requests
   */
  static async notifySystemAdminsNewProduct(productId: string, productName: string, clinicId: string): Promise<void> {
    try {
      // Get all system admin users
      const systemAdmins = await this.getSystemAdminUsers();
      
      const notification = {
        type: 'new_product_request',
        message: `New product request: ${productName}`,
        product_id: productId,
        clinic_id: clinicId,
        read: false,
        timestamp: admin.database.ServerValue.TIMESTAMP
      };

      // Send notification to each system admin
      const promises = systemAdmins.map(admin => 
        this.sendNotificationToUser(admin.user_id, notification)
      );

      await Promise.all(promises);
      
      console.log(`Notification sent to ${systemAdmins.length} system admins for product: ${productName}`);
    } catch (error) {
      console.error('Error sending notification to system admins:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Send notification to clinic about product approval
   */
  static async notifyClinicProductApproved(productId: string, productName: string, clinicId: string): Promise<void> {
    try {
      // Get clinic admin users
      const clinicAdmins = await this.getClinicAdminUsers(clinicId);
      
      const notification = {
        type: 'product_approved',
        message: `Product approved: ${productName}`,
        product_id: productId,
        read: false,
        timestamp: admin.database.ServerValue.TIMESTAMP
      };

      // Send notification to clinic admins
      const promises = clinicAdmins.map(admin => 
        this.sendNotificationToUser(admin.user_id, notification)
      );

      await Promise.all(promises);
      
      console.log(`Notification sent to ${clinicAdmins.length} clinic admins for approved product: ${productName}`);
    } catch (error) {
      console.error('Error sending notification to clinic:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Send notification to specific user
   */
  private static async sendNotificationToUser(userId: string, notification: any): Promise<void> {
    const notificationId = this.getRealtimeDb().ref().child('notifications').push().key;
    
    if (!notificationId) {
      throw new Error('Failed to generate notification ID');
    }

    await this.getRealtimeDb()
      .ref(`users/${userId}/notifications/${notificationId}`)
      .set(notification);
  }

  /**
   * Get all system admin users
   */
  private static async getSystemAdminUsers(): Promise<Array<{ user_id: string; email: string }>> {
    try {
      const snapshot = await FirestoreService.usersCollection
        .where('role', '==', UserRole.SYSTEM_ADMIN)
        .get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          user_id: data.user_id,
          email: data.email
        };
      });
    } catch (error) {
      console.error('Error getting system admin users:', error);
      return [];
    }
  }

  /**
   * Get clinic admin users for a specific clinic
   */
  private static async getClinicAdminUsers(clinicId: string): Promise<Array<{ user_id: string; email: string }>> {
    try {
      const snapshot = await FirestoreService.usersCollection
        .where('role', '==', UserRole.CLINIC_ADMIN)
        .where('clinic_id', '==', clinicId)
        .get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          user_id: data.user_id,
          email: data.email
        };
      });
    } catch (error) {
      console.error('Error getting clinic admin users:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      await this.getRealtimeDb()
        .ref(`users/${userId}/notifications/${notificationId}/read`)
        .set(true);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const snapshot = await this.getRealtimeDb()
        .ref(`users/${userId}/notifications`)
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
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  /**
   * Clear old notifications (older than 30 days)
   */
  static async clearOldNotifications(): Promise<void> {
    try {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      // This would typically be run as a scheduled function
      const snapshot = await this.getRealtimeDb()
        .ref('users')
        .once('value');
      
      const promises: Promise<void>[] = [];
      
      snapshot.forEach(userSnapshot => {
        const userId = userSnapshot.key;
        if (!userId) return;
        
        const notificationsRef = this.getRealtimeDb().ref(`users/${userId}/notifications`);
        
        promises.push(
          notificationsRef
            .orderByChild('timestamp')
            .endAt(thirtyDaysAgo)
            .once('value')
            .then(oldNotifications => {
              const deletePromises: Promise<void>[] = [];
              oldNotifications.forEach(notification => {
                if (notification.key) {
                  deletePromises.push(
                    notificationsRef.child(notification.key).remove()
                  );
                }
              });
              return Promise.all(deletePromises);
            })
            .then(() => {})
        );
      });
      
      await Promise.all(promises);
      console.log('Old notifications cleared successfully');
    } catch (error) {
      console.error('Error clearing old notifications:', error);
    }
  }

  /**
   * Send low stock alert notification
   */
  static async notifyLowStock(clinicId: string, productName: string, currentStock: number, minimumLevel: number): Promise<void> {
    try {
      const clinicUsers = await this.getClinicUsers(clinicId);
      
      const notification = {
        type: 'low_stock',
        message: `Low stock alert: ${productName} (${currentStock} remaining, minimum: ${minimumLevel})`,
        product_name: productName,
        current_stock: currentStock,
        minimum_level: minimumLevel,
        read: false,
        timestamp: admin.database.ServerValue.TIMESTAMP
      };

      const promises = clinicUsers.map(user => 
        this.sendNotificationToUser(user.user_id, notification)
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Error sending low stock notification:', error);
    }
  }

  /**
   * Send expiration alert notification
   */
  static async notifyExpiringProducts(clinicId: string, productName: string, expirationDate: Date, daysUntilExpiration: number): Promise<void> {
    try {
      const clinicUsers = await this.getClinicUsers(clinicId);
      
      const notification = {
        type: 'expiring_product',
        message: `Product expiring soon: ${productName} expires in ${daysUntilExpiration} days`,
        product_name: productName,
        expiration_date: expirationDate.toISOString(),
        days_until_expiration: daysUntilExpiration,
        read: false,
        timestamp: admin.database.ServerValue.TIMESTAMP
      };

      const promises = clinicUsers.map(user => 
        this.sendNotificationToUser(user.user_id, notification)
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Error sending expiration notification:', error);
    }
  }

  /**
   * Get all users for a clinic (admins and users)
   */
  private static async getClinicUsers(clinicId: string): Promise<Array<{ user_id: string; email: string }>> {
    try {
      const snapshot = await FirestoreService.usersCollection
        .where('clinic_id', '==', clinicId)
        .get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          user_id: data.user_id,
          email: data.email
        };
      });
    } catch (error) {
      console.error('Error getting clinic users:', error);
      return [];
    }
  }
}

export default NotificationService;