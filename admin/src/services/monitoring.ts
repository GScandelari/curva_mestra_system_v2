import { logEvent } from 'firebase/analytics';
import { trace } from 'firebase/performance';
import { analytics, performance } from '../config/firebase';

// Analytics Events
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (analytics && process.env.NODE_ENV === 'production') {
    logEvent(analytics, eventName, parameters);
  }
};

// Admin-specific Business Metrics Tracking
export const trackAdminMetrics = {
  // Authentication
  adminLogin: (method: string) => {
    trackEvent('admin_login', { method });
  },

  adminLogout: () => {
    trackEvent('admin_logout');
  },

  // Product Management
  productApproved: (productId: string, clinicId: string) => {
    trackEvent('product_approved', {
      product_id: productId,
      requesting_clinic_id: clinicId
    });
  },

  productRejected: (productId: string, clinicId: string) => {
    trackEvent('product_rejected', {
      product_id: productId,
      requesting_clinic_id: clinicId
    });
  },

  productCreated: (productId: string) => {
    trackEvent('admin_product_created', {
      product_id: productId
    });
  },

  // Clinic Management
  clinicCreated: (clinicId: string) => {
    trackEvent('clinic_created', {
      clinic_id: clinicId
    });
  },

  clinicUpdated: (clinicId: string) => {
    trackEvent('clinic_updated', {
      clinic_id: clinicId
    });
  },

  clinicDeleted: (clinicId: string) => {
    trackEvent('clinic_deleted', {
      clinic_id: clinicId
    });
  },

  // User Management
  userCreated: (userId: string, clinicId: string, role: string) => {
    trackEvent('admin_user_created', {
      user_id: userId,
      clinic_id: clinicId,
      user_role: role
    });
  },

  userUpdated: (userId: string, clinicId: string) => {
    trackEvent('admin_user_updated', {
      user_id: userId,
      clinic_id: clinicId
    });
  },

  userDeleted: (userId: string, clinicId: string) => {
    trackEvent('admin_user_deleted', {
      user_id: userId,
      clinic_id: clinicId
    });
  },

  // System Monitoring
  logsViewed: (filterCriteria?: Record<string, any>) => {
    trackEvent('admin_logs_viewed', {
      filter_criteria: filterCriteria || {}
    });
  },

  systemHealthChecked: () => {
    trackEvent('admin_system_health_checked');
  },

  // Dashboard Usage
  adminDashboardViewed: () => {
    trackEvent('admin_dashboard_viewed');
  },

  clinicSwitched: (fromClinicId: string, toClinicId: string) => {
    trackEvent('admin_clinic_switched', {
      from_clinic_id: fromClinicId,
      to_clinic_id: toClinicId
    });
  },

  // Bulk Operations
  bulkProductApproval: (productCount: number) => {
    trackEvent('admin_bulk_product_approval', {
      product_count: productCount
    });
  },

  bulkUserUpdate: (userCount: number, clinicId: string) => {
    trackEvent('admin_bulk_user_update', {
      user_count: userCount,
      clinic_id: clinicId
    });
  },

  // Error Tracking
  adminErrorOccurred: (errorType: string, errorMessage: string, context?: string) => {
    trackEvent('admin_error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      context: context || 'unknown'
    });
  },

  // Performance Metrics
  adminPageLoadTime: (pageName: string, loadTime: number) => {
    trackEvent('admin_page_load_time', {
      page_name: pageName,
      load_time: loadTime
    });
  }
};

// Performance Monitoring for Admin Operations
export const adminPerformanceMonitoring = {
  // Create custom traces for admin operations
  createTrace: (traceName: string) => {
    if (performance && process.env.NODE_ENV === 'production') {
      return trace(performance, `admin_${traceName}`);
    }
    return null;
  },

  // Measure admin API calls
  measureAdminApiCall: async <T>(
    apiName: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const customTrace = adminPerformanceMonitoring.createTrace(`api_${apiName}`);
    
    if (customTrace) {
      customTrace.start();
    }

    const startTime = Date.now();
    
    try {
      const result = await apiCall();
      const duration = Date.now() - startTime;
      
      trackEvent('admin_api_call_success', {
        api_name: apiName,
        duration: duration
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      trackEvent('admin_api_call_error', {
        api_name: apiName,
        duration: duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    } finally {
      if (customTrace) {
        customTrace.stop();
      }
    }
  },

  // Measure bulk operations performance
  measureBulkOperation: async <T>(
    operationName: string,
    itemCount: number,
    operation: () => Promise<T>
  ): Promise<T> => {
    const customTrace = adminPerformanceMonitoring.createTrace(`bulk_${operationName}`);
    
    if (customTrace) {
      customTrace.start();
    }

    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      trackEvent('admin_bulk_operation_success', {
        operation_name: operationName,
        item_count: itemCount,
        duration: duration,
        items_per_second: itemCount / (duration / 1000)
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      trackEvent('admin_bulk_operation_error', {
        operation_name: operationName,
        item_count: itemCount,
        duration: duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    } finally {
      if (customTrace) {
        customTrace.stop();
      }
    }
  }
};

// Admin Error Reporting
export const reportAdminError = (error: Error, context?: string, additionalData?: Record<string, any>) => {
  console.error('Admin Application Error:', error, { context, additionalData });
  
  trackAdminMetrics.adminErrorOccurred(
    error.name || 'UnknownError',
    error.message || 'No error message',
    context
  );
  
  // Enhanced error reporting for admin interface
  if (process.env.NODE_ENV === 'production') {
    // Send to external monitoring service with admin context
    // This could include additional admin-specific metadata
  }
};

// Admin Session Tracking
export const adminSessionTracking = {
  startAdminSession: (userId: string, role: string) => {
    trackEvent('admin_session_start', {
      user_id: userId,
      user_role: role,
      session_type: 'admin'
    });
  },

  endAdminSession: (sessionDuration: number, actionsPerformed: number) => {
    trackEvent('admin_session_end', {
      session_duration: sessionDuration,
      actions_performed: actionsPerformed,
      session_type: 'admin'
    });
  },

  trackAdminAction: (actionType: string, targetResource?: string) => {
    trackEvent('admin_action_performed', {
      action_type: actionType,
      target_resource: targetResource || 'unknown'
    });
  }
};

// System Health Monitoring
export const systemHealthMonitoring = {
  trackSystemMetrics: (metrics: {
    totalClinics: number;
    totalUsers: number;
    totalProducts: number;
    pendingProducts: number;
    activeRequests: number;
  }) => {
    trackEvent('system_health_metrics', metrics);
  },

  trackPerformanceMetrics: (metrics: {
    avgResponseTime: number;
    errorRate: number;
    activeConnections: number;
  }) => {
    trackEvent('system_performance_metrics', metrics);
  }
};

export default {
  trackEvent,
  trackAdminMetrics,
  adminPerformanceMonitoring,
  reportAdminError,
  adminSessionTracking,
  systemHealthMonitoring
};