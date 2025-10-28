import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { trackBusinessMetrics, performanceMonitoring, sessionTracking } from '../services/monitoring';

// Hook for tracking page views and performance
export const usePageTracking = (pageName: string) => {
    const { profile } = useAuth();
    const startTimeRef = useRef<number>(Date.now());

    useEffect(() => {
        startTimeRef.current = Date.now();

        // Track page view
        if (profile) {
            trackBusinessMetrics.dashboardViewed(profile.clinic_id || '');
        }

        // Track page load time when component unmounts
        return () => {
            const loadTime = Date.now() - startTimeRef.current;
            trackBusinessMetrics.pageLoadTime(pageName, loadTime);
        };
    }, [pageName, profile]);
};

// Hook for tracking user sessions
export const useSessionTracking = () => {
    const { profile } = useAuth();
    const sessionStartRef = useRef<number>(Date.now());

    useEffect(() => {
        if (profile) {
            sessionStartRef.current = Date.now();
            sessionTracking.startSession(profile.user_id, profile.clinic_id || '', profile.role || '');
        }

        // Track session end on unmount or user change
        return () => {
            if (profile) {
                const sessionDuration = Date.now() - sessionStartRef.current;
                sessionTracking.endSession(sessionDuration);
            }
        };
    }, [profile]);
};

// Hook for tracking API calls with performance monitoring
export const useApiTracking = () => {
    const trackApiCall = useCallback(async <T>(
        apiName: string,
        apiCall: () => Promise<T>
    ): Promise<T> => {
        return performanceMonitoring.measureApiCall(apiName, apiCall);
    }, []);

    return { trackApiCall };
};

// Hook for tracking business actions
export const useBusinessTracking = () => {
    const { profile } = useAuth();

    const trackInvoiceCreated = useCallback((productCount: number, totalValue: number) => {
        if (profile?.clinic_id) {
            trackBusinessMetrics.invoiceCreated(profile.clinic_id, productCount, totalValue);
        }
    }, [profile]);

    const trackPatientRegistered = useCallback(() => {
        if (profile?.clinic_id) {
            trackBusinessMetrics.patientRegistered(profile.clinic_id);
        }
    }, [profile]);

    const trackRequestCreated = useCallback((productCount: number) => {
        if (profile?.clinic_id) {
            trackBusinessMetrics.requestCreated(profile.clinic_id, productCount);
        }
    }, [profile]);

    const trackInventoryViewed = useCallback(() => {
        if (profile?.clinic_id) {
            trackBusinessMetrics.inventoryViewed(profile.clinic_id);
        }
    }, [profile]);

    const trackExpirationAlert = useCallback((productCount: number) => {
        if (profile?.clinic_id) {
            trackBusinessMetrics.expirationAlertViewed(profile.clinic_id, productCount);
        }
    }, [profile]);

    const trackLowStockAlert = useCallback((productCount: number) => {
        if (profile?.clinic_id) {
            trackBusinessMetrics.lowStockAlertViewed(profile.clinic_id, productCount);
        }
    }, [profile]);

    return {
        trackInvoiceCreated,
        trackPatientRegistered,
        trackRequestCreated,
        trackInventoryViewed,
        trackExpirationAlert,
        trackLowStockAlert
    };
};

// Hook for error tracking
export const useErrorTracking = () => {
    const trackError = useCallback((error: Error, context?: string) => {
        trackBusinessMetrics.errorOccurred(
            error.name || 'UnknownError',
            error.message || 'No error message',
            context
        );
    }, []);

    return { trackError };
};

// Hook for performance monitoring of components
export const useComponentPerformance = (componentName: string) => {
    const renderStartRef = useRef<number>();

    useEffect(() => {
        renderStartRef.current = Date.now();
    });

    useEffect(() => {
        if (renderStartRef.current) {
            const renderTime = Date.now() - renderStartRef.current;
            performanceMonitoring.measureComponentRender(componentName, () => {
                // Component render tracking
            });
        }
    });
};

export default {
    usePageTracking,
    useSessionTracking,
    useApiTracking,
    useBusinessTracking,
    useErrorTracking,
    useComponentPerformance
};