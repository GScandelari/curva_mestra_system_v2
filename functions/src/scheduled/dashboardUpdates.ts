import { onSchedule } from 'firebase-functions/v2/scheduler';
import { DashboardService } from '../services/dashboardService';
import FirestoreService from '../services/firestoreService';

/**
 * Scheduled function to update dashboard metrics and check for alerts
 * Runs every 15 minutes
 */
export const updateDashboardMetrics = onSchedule('*/15 * * * *', async (event) => {
  console.log('Starting scheduled dashboard metrics update...');
  
  try {
    // Get all clinics
    const clinics = await FirestoreService.listClinics();
    
    // Update metrics for each clinic
    const updatePromises = clinics.map(async (clinic) => {
      try {
        // Update dashboard metrics
        await DashboardService.updateDashboardMetrics(clinic.clinic_id);
        
        // Check and create alerts if notifications are enabled
        if (clinic.settings.notification_preferences.low_stock_alerts || 
            clinic.settings.notification_preferences.expiration_alerts) {
          await DashboardService.checkAndCreateAlerts(clinic.clinic_id);
        }
        
        console.log(`Dashboard updated for clinic: ${clinic.clinic_id}`);
      } catch (error) {
        console.error(`Failed to update dashboard for clinic ${clinic.clinic_id}:`, error);
      }
    });
    
    await Promise.all(updatePromises);
    console.log(`Dashboard metrics updated for ${clinics.length} clinics`);
  } catch (error) {
    console.error('Error in scheduled dashboard update:', error);
  }
});

/**
 * Scheduled function to clean up old notifications
 * Runs daily at 2 AM
 */
export const cleanupOldNotifications = onSchedule('0 2 * * *', async (event) => {
  console.log('Starting scheduled notification cleanup...');
  
  try {
    // Get all clinics
    const clinics = await FirestoreService.listClinics();
    
    // Clean up notifications for each clinic
    const cleanupPromises = clinics.map(async (clinic) => {
      try {
        await DashboardService.clearOldNotifications(clinic.clinic_id);
        console.log(`Notifications cleaned up for clinic: ${clinic.clinic_id}`);
      } catch (error) {
        console.error(`Failed to cleanup notifications for clinic ${clinic.clinic_id}:`, error);
      }
    });
    
    await Promise.all(cleanupPromises);
    console.log(`Notifications cleaned up for ${clinics.length} clinics`);
  } catch (error) {
    console.error('Error in scheduled notification cleanup:', error);
  }
});

/**
 * Scheduled function to check for expiring products and send alerts
 * Runs daily at 9 AM
 */
export const checkExpiringProducts = onSchedule('0 9 * * *', async (event) => {
  console.log('Starting scheduled expiring products check...');
  
  try {
    // Get all clinics
    const clinics = await FirestoreService.listClinics();
    
    // Check expiring products for each clinic
    const checkPromises = clinics.map(async (clinic) => {
      try {
        // Only check if expiration alerts are enabled
        if (clinic.settings.notification_preferences.expiration_alerts) {
          await DashboardService.checkAndCreateAlerts(clinic.clinic_id);
          console.log(`Expiring products checked for clinic: ${clinic.clinic_id}`);
        }
      } catch (error) {
        console.error(`Failed to check expiring products for clinic ${clinic.clinic_id}:`, error);
      }
    });
    
    await Promise.all(checkPromises);
    console.log(`Expiring products checked for ${clinics.length} clinics`);
  } catch (error) {
    console.error('Error in scheduled expiring products check:', error);
  }
});