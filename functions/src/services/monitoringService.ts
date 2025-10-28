import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

// Performance monitoring for Firebase Functions
export class FunctionMonitoring {
  private static instance: FunctionMonitoring;
  private db: admin.firestore.Firestore | null = null;

  private constructor() {
    // Initialize lazily
  }

  private getDb() {
    if (!this.db) {
      this.db = admin.firestore();
    }
    return this.db;
  }

  public static getInstance(): FunctionMonitoring {
    if (!FunctionMonitoring.instance) {
      FunctionMonitoring.instance = new FunctionMonitoring();
    }
    return FunctionMonitoring.instance;
  }

  // Track function execution metrics
  async trackFunctionExecution(
    functionName: string,
    executionTime: number,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const metricsDoc = {
        function_name: functionName,
        execution_time: executionTime,
        success: success,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: metadata || {},
        environment: process.env.NODE_ENV || 'development'
      };

      await this.getDb().collection('function_metrics').add(metricsDoc);

      // Log to Cloud Logging
      logger.info('Function execution tracked', {
        functionName,
        executionTime,
        success,
        metadata
      });
    } catch (error) {
      logger.error('Failed to track function execution', error);
    }
  }

  // Track API endpoint performance
  async trackApiEndpoint(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    clinicId?: string
  ): Promise<void> {
    try {
      const apiMetricsDoc = {
        endpoint,
        method,
        status_code: statusCode,
        response_time: responseTime,
        user_id: userId || null,
        clinic_id: clinicId || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        environment: process.env.NODE_ENV || 'development'
      };

      await this.getDb().collection('api_metrics').add(apiMetricsDoc);
    } catch (error) {
      logger.error('Failed to track API endpoint', error);
    }
  }

  // Track business metrics
  async trackBusinessEvent(
    eventType: string,
    eventData: Record<string, any>,
    userId?: string,
    clinicId?: string
  ): Promise<void> {
    try {
      const businessEventDoc = {
        event_type: eventType,
        event_data: eventData,
        user_id: userId || null,
        clinic_id: clinicId || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        environment: process.env.NODE_ENV || 'development'
      };

      await this.getDb().collection('business_metrics').add(businessEventDoc);
    } catch (error) {
      logger.error('Failed to track business event', error);
    }
  }

  // Track errors and exceptions
  async trackError(
    error: Error,
    context: string,
    userId?: string,
    clinicId?: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    try {
      const errorDoc = {
        error_name: error.name,
        error_message: error.message,
        error_stack: error.stack,
        context,
        user_id: userId,
        clinic_id: clinicId,
        additional_data: additionalData || {},
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        environment: process.env.NODE_ENV || 'development'
      };

      await this.getDb().collection('error_logs').add(errorDoc);

      // Log to Cloud Logging with error level
      logger.error('Application error tracked', {
        error: error.message,
        context,
        userId,
        clinicId,
        additionalData
      });
    } catch (trackingError) {
      logger.error('Failed to track error', trackingError);
    }
  }

  // Get system health metrics
  async getSystemHealthMetrics(): Promise<{
    totalClinics: number;
    totalUsers: number;
    totalProducts: number;
    pendingProducts: number;
    activeRequests: number;
    avgResponseTime: number;
    errorRate: number;
  }> {
    try {
      const [
        clinicsSnapshot,
        usersSnapshot,
        productsSnapshot,
        pendingProductsSnapshot,
        requestsSnapshot
      ] = await Promise.all([
        this.getDb().collection('clinics').get(),
        this.getDb().collection('users').get(),
        this.getDb().collection('products').where('status', '==', 'approved').get(),
        this.getDb().collection('products').where('status', '==', 'pending').get(),
        this.getDb().collectionGroup('requests').where('status', '==', 'pending').get()
      ]);

      // Calculate average response time from recent API metrics
      const recentMetrics = await this.getDb()
        .collection('api_metrics')
        .where('timestamp', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
        .get();

      let avgResponseTime = 0;
      let errorCount = 0;
      
      if (!recentMetrics.empty) {
        const totalResponseTime = recentMetrics.docs.reduce((sum, doc) => {
          const data = doc.data();
          if (data.status_code >= 400) errorCount++;
          return sum + (data.response_time || 0);
        }, 0);
        
        avgResponseTime = totalResponseTime / recentMetrics.size;
      }

      const errorRate = recentMetrics.empty ? 0 : (errorCount / recentMetrics.size) * 100;

      return {
        totalClinics: clinicsSnapshot.size,
        totalUsers: usersSnapshot.size,
        totalProducts: productsSnapshot.size,
        pendingProducts: pendingProductsSnapshot.size,
        activeRequests: requestsSnapshot.size,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100
      };
    } catch (error) {
      logger.error('Failed to get system health metrics', error);
      throw error;
    }
  }
}

// Middleware for automatic API monitoring
export const monitoringMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const monitoring = FunctionMonitoring.getInstance();

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const responseTime = Date.now() - startTime;
    
    // Track API endpoint performance
    monitoring.trackApiEndpoint(
      req.path || req.url,
      req.method,
      res.statusCode,
      responseTime,
      req.user?.uid,
      req.user?.clinic_id
    );

    originalEnd.apply(this, args);
  };

  next();
};

// Function execution wrapper for automatic monitoring
export const monitorFunction = <T extends any[], R>(
  functionName: string,
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const monitoring = FunctionMonitoring.getInstance();

    try {
      const result = await fn(...args);
      const executionTime = Date.now() - startTime;
      
      await monitoring.trackFunctionExecution(functionName, executionTime, true);
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      await monitoring.trackFunctionExecution(functionName, executionTime, false, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      if (error instanceof Error) {
        await monitoring.trackError(error, `Function: ${functionName}`);
      }
      
      throw error;
    }
  };
};

export default FunctionMonitoring;