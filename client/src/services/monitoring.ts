import { logEvent } from 'firebase/analytics';
import { trace } from 'firebase/performance';
import { analytics, performance } from '../config/firebase';

// Analytics Events
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (analytics && process.env.NODE_ENV === 'production') {
    logEvent(analytics, eventName, parameters);
  }
};

// Business Metrics Tracking
export const trackBusinessMetrics = {
  // User Actions
  userLogin: (method: string) => {
    trackEvent('login', { method });
  },

  userLogout: () => {
    trackEvent('logout');
  },

  // Inventory Management
  invoiceCreated: (clinicId: string, productCount: number, totalValue: number) => {
    trackEvent('invoice_created', {
      clinic_id: clinicId,
      product_count: productCount,
      total_value: totalValue
    });
  },

  patientRegistered: (clinicId: string) => {
    trackEvent('patient_registered', {
      clinic_id: clinicId
    });
  },

  requestCreated: (clinicId: string, productCount: number) => {
    trackEvent('request_created', {
      clinic_id: clinicId,
      product_count: productCount
    });
  },

  // Dashboard Usage
  dashboardViewed: (clinicId: string) => {
    trackEvent('dashboard_viewed', {
      clinic_id: clinicId
    });
  },

  inventoryViewed: (clinicId: string) => {
    trackEvent('inventory_viewed', {
      clinic_id: clinicId
    });
  },

  // Alerts and Notifications
  expirationAlertViewed: (clinicId: string, productCount: number) => {
    trackEvent('expiration_alert_viewed', {
      clinic_id: clinicId,
      product_count: productCount
    });
  },

  lowStockAlertViewed: (clinicId: string, productCount: number) => {
    trackEvent('low_stock_alert_viewed', {
      clinic_id: clinicId,
      product_count: productCount
    });
  },

  // Error Tracking
  errorOccurred: (errorType: string, errorMessage: string, context?: string) => {
    trackEvent('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      context: context || 'unknown'
    });
  },

  // Performance Metrics
  pageLoadTime: (pageName: string, loadTime: number) => {
    trackEvent('page_load_time', {
      page_name: pageName,
      load_time: loadTime
    });
  }
};

// Performance Monitoring
export const performanceMonitoring = {
  // Create custom traces for critical operations
  createTrace: (traceName: string) => {
    if (performance && process.env.NODE_ENV === 'production') {
      return trace(performance, traceName);
    }
    return null;
  },

  // Measure API call performance
  measureApiCall: async <T>(
    apiName: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const customTrace = performanceMonitoring.createTrace(`api_${apiName}`);
    
    if (customTrace) {
      customTrace.start();
    }

    const startTime = Date.now();
    
    try {
      const result = await apiCall();
      const duration = Date.now() - startTime;
      
      // Track successful API call
      trackEvent('api_call_success', {
        api_name: apiName,
        duration: duration
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Track failed API call
      trackEvent('api_call_error', {
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

  // Measure component render performance
  measureComponentRender: (componentName: string, renderFunction: () => void) => {
    const customTrace = performanceMonitoring.createTrace(`component_${componentName}`);
    
    if (customTrace) {
      customTrace.start();
    }

    const startTime = Date.now();
    
    try {
      renderFunction();
      const duration = Date.now() - startTime;
      
      trackEvent('component_render', {
        component_name: componentName,
        render_time: duration
      });
    } finally {
      if (customTrace) {
        customTrace.stop();
      }
    }
  }
};

// Error Reporting
export const reportError = (error: Error, context?: string, additionalData?: Record<string, any>) => {
  console.error('Application Error:', error, { context, additionalData });
  
  // Track error in analytics
  trackBusinessMetrics.errorOccurred(
    error.name || 'UnknownError',
    error.message || 'No error message',
    context
  );
  
  // In production, you might want to send to external error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to external service like Sentry, LogRocket, etc.
    // sentryReportError(error, context, additionalData);
  }
};

// User Properties (for analytics segmentation)
export const setUserProperties = (properties: Record<string, string>) => {
  if (analytics && process.env.NODE_ENV === 'production') {
    // Set user properties for analytics segmentation
    Object.entries(properties).forEach(([key, value]) => {
      // Note: Firebase Analytics setUserProperties is not directly available in v9
      // You might need to use gtag or implement custom user property tracking
      trackEvent('user_property_set', { property: key, value });
    });
  }
};

// Session Tracking
export const sessionTracking = {
  startSession: (userId: string, clinicId: string, role: string) => {
    trackEvent('session_start', {
      user_id: userId,
      clinic_id: clinicId,
      user_role: role
    });
    
    setUserProperties({
      user_role: role,
      clinic_id: clinicId
    });
  },

  endSession: (sessionDuration: number) => {
    trackEvent('session_end', {
      session_duration: sessionDuration
    });
  }
};

export default {
  trackEvent,
  trackBusinessMetrics,
  performanceMonitoring,
  reportError,
  setUserProperties,
  sessionTracking
};