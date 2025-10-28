import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { trackAdminMetrics, adminPerformanceMonitoring, adminSessionTracking } from '../services/monitoring';

// Hook for tracking admin page views and performance
export const useAdminPageTracking = (pageName: string) => {
  const { user } = useAuth();
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    
    // Track admin page view
    if (user) {
      trackAdminMetrics.adminDashboardViewed();
    }

    // Track page load time when component unmounts
    return () => {
      const loadTime = Date.now() - startTimeRef.current;
      trackAdminMetrics.adminPageLoadTime(pageName, loadTime);
    };
  }, [pageName, user]);
};

// Hook for tracking admin sessions
export const useAdminSessionTracking = () => {
  const { userData } = useAuth();
  const sessionStartRef = useRef<number>(Date.now());
  const actionsCountRef = useRef<number>(0);

  useEffect(() => {
    if (userData) {
      sessionStartRef.current = Date.now();
      actionsCountRef.current = 0;
      adminSessionTracking.startAdminSession(userData.user_id, userData.role || '');
    }

    return () => {
      if (userData) {
        const sessionDuration = Date.now() - sessionStartRef.current;
        adminSessionTracking.endAdminSession(sessionDuration, actionsCountRef.current);
      }
    };
  }, [userData]);

  const trackAction = useCallback((actionType: string, targetResource?: string) => {
    actionsCountRef.current += 1;
    adminSessionTracking.trackAdminAction(actionType, targetResource);
  }, []);

  return { trackAction };
};

// Hook for tracking admin API calls
export const useAdminApiTracking = () => {
  const trackApiCall = useCallback(async <T>(
    apiName: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    return adminPerformanceMonitoring.measureAdminApiCall(apiName, apiCall);
  }, []);

  const trackBulkOperation = useCallback(async <T>(
    operationName: string,
    itemCount: number,
    operation: () => Promise<T>
  ): Promise<T> => {
    return adminPerformanceMonitoring.measureBulkOperation(operationName, itemCount, operation);
  }, []);

  return { trackApiCall, trackBulkOperation };
};

// Hook for tracking admin business actions
export const useAdminBusinessTracking = () => {
  const { trackAction } = useAdminSessionTracking();

  const trackProductApproval = useCallback((productId: string, clinicId: string) => {
    trackAdminMetrics.productApproved(productId, clinicId);
    trackAction('product_approval', productId);
  }, [trackAction]);

  const trackProductRejection = useCallback((productId: string, clinicId: string) => {
    trackAdminMetrics.productRejected(productId, clinicId);
    trackAction('product_rejection', productId);
  }, [trackAction]);

  const trackProductCreation = useCallback((productId: string) => {
    trackAdminMetrics.productCreated(productId);
    trackAction('product_creation', productId);
  }, [trackAction]);

  const trackClinicCreation = useCallback((clinicId: string) => {
    trackAdminMetrics.clinicCreated(clinicId);
    trackAction('clinic_creation', clinicId);
  }, [trackAction]);

  const trackClinicUpdate = useCallback((clinicId: string) => {
    trackAdminMetrics.clinicUpdated(clinicId);
    trackAction('clinic_update', clinicId);
  }, [trackAction]);

  const trackClinicDeletion = useCallback((clinicId: string) => {
    trackAdminMetrics.clinicDeleted(clinicId);
    trackAction('clinic_deletion', clinicId);
  }, [trackAction]);

  const trackUserCreation = useCallback((userId: string, clinicId: string, role: string) => {
    trackAdminMetrics.userCreated(userId, clinicId, role);
    trackAction('user_creation', userId);
  }, [trackAction]);

  const trackUserUpdate = useCallback((userId: string, clinicId: string) => {
    trackAdminMetrics.userUpdated(userId, clinicId);
    trackAction('user_update', userId);
  }, [trackAction]);

  const trackUserDeletion = useCallback((userId: string, clinicId: string) => {
    trackAdminMetrics.userDeleted(userId, clinicId);
    trackAction('user_deletion', userId);
  }, [trackAction]);

  const trackLogsViewed = useCallback((filterCriteria?: Record<string, any>) => {
    trackAdminMetrics.logsViewed(filterCriteria);
    trackAction('logs_viewed', 'system_logs');
  }, [trackAction]);

  const trackClinicSwitch = useCallback((fromClinicId: string, toClinicId: string) => {
    trackAdminMetrics.clinicSwitched(fromClinicId, toClinicId);
    trackAction('clinic_switch', toClinicId);
  }, [trackAction]);

  const trackBulkProductApproval = useCallback((productCount: number) => {
    trackAdminMetrics.bulkProductApproval(productCount);
    trackAction('bulk_product_approval', `${productCount}_products`);
  }, [trackAction]);

  const trackBulkUserUpdate = useCallback((userCount: number, clinicId: string) => {
    trackAdminMetrics.bulkUserUpdate(userCount, clinicId);
    trackAction('bulk_user_update', `${userCount}_users`);
  }, [trackAction]);

  return {
    trackProductApproval,
    trackProductRejection,
    trackProductCreation,
    trackClinicCreation,
    trackClinicUpdate,
    trackClinicDeletion,
    trackUserCreation,
    trackUserUpdate,
    trackUserDeletion,
    trackLogsViewed,
    trackClinicSwitch,
    trackBulkProductApproval,
    trackBulkUserUpdate
  };
};

// Hook for admin error tracking
export const useAdminErrorTracking = () => {
  const trackError = useCallback((error: Error, context?: string) => {
    trackAdminMetrics.adminErrorOccurred(
      error.name || 'UnknownError',
      error.message || 'No error message',
      context
    );
  }, []);

  return { trackError };
};

// Hook for system health monitoring
export const useSystemHealthTracking = () => {
  const trackSystemMetrics = useCallback((metrics: {
    totalClinics: number;
    totalUsers: number;
    totalProducts: number;
    pendingProducts: number;
    activeRequests: number;
  }) => {
    trackAdminMetrics.systemHealthChecked();
    // Additional system health tracking logic
  }, []);

  return { trackSystemMetrics };
};

export default {
  useAdminPageTracking,
  useAdminSessionTracking,
  useAdminApiTracking,
  useAdminBusinessTracking,
  useAdminErrorTracking,
  useSystemHealthTracking
};