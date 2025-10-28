import { Request, Response, NextFunction } from 'express';
import AuditService from '../services/auditService';

/**
 * Error types and interfaces
 */
export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    request_id: string;
    stack?: string;
  };
}

/**
 * Custom error classes
 */
export class ValidationError extends Error implements ApiError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  isOperational = true;
  details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends Error implements ApiError {
  statusCode = 401;
  code = 'AUTHENTICATION_ERROR';
  isOperational = true;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements ApiError {
  statusCode = 403;
  code = 'AUTHORIZATION_ERROR';
  isOperational = true;

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements ApiError {
  statusCode = 404;
  code = 'NOT_FOUND';
  isOperational = true;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements ApiError {
  statusCode = 409;
  code = 'CONFLICT';
  isOperational = true;

  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class BusinessRuleError extends Error implements ApiError {
  statusCode = 422;
  code = 'BUSINESS_RULE_VIOLATION';
  isOperational = true;
  details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'BusinessRuleError';
    this.details = details;
  }
}

export class ExternalServiceError extends Error implements ApiError {
  statusCode = 502;
  code = 'EXTERNAL_SERVICE_ERROR';
  isOperational = true;
  service: string;

  constructor(message: string, service: string) {
    super(message);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

export class RateLimitError extends Error implements ApiError {
  statusCode = 429;
  code = 'RATE_LIMIT_EXCEEDED';
  isOperational = true;

  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Error classification helper
 */
export const classifyError = (error: any): ApiError => {
  // Firebase Auth errors
  if (error.code?.startsWith('auth/')) {
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return new AuthenticationError('Invalid credentials');
      case 'auth/email-already-exists':
        return new ConflictError('Email already exists');
      case 'auth/invalid-email':
        return new ValidationError('Invalid email format');
      case 'auth/weak-password':
        return new ValidationError('Password is too weak');
      case 'auth/too-many-requests':
        return new RateLimitError('Too many authentication attempts');
      default:
        return new AuthenticationError(error.message);
    }
  }

  // Firestore errors
  if (error.code?.startsWith('firestore/')) {
    switch (error.code) {
      case 'firestore/permission-denied':
        return new AuthorizationError('Database access denied');
      case 'firestore/not-found':
        return new NotFoundError('Document not found');
      case 'firestore/already-exists':
        return new ConflictError('Document already exists');
      case 'firestore/resource-exhausted':
        return new RateLimitError('Database quota exceeded');
      default:
        return new ExternalServiceError(error.message, 'Firestore');
    }
  }

  // Joi validation errors
  if (error.isJoi) {
    const details = error.details.map((detail: any) => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));
    return new ValidationError('Validation failed', details);
  }

  // HTTP errors from external services
  if (error.response?.status) {
    const status = error.response.status;
    if (status >= 400 && status < 500) {
      return new ValidationError(`External service error: ${error.message}`);
    } else if (status >= 500) {
      return new ExternalServiceError(error.message, 'External API');
    }
  }

  // Already classified errors
  if (error.isOperational) {
    return error as ApiError;
  }

  // Default to internal server error
  const internalError = new Error(error.message || 'Internal server error') as ApiError;
  internalError.statusCode = 500;
  internalError.code = 'INTERNAL_ERROR';
  internalError.isOperational = false;
  return internalError;
};

/**
 * Global error handling middleware
 */
export const globalErrorHandler = async (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const classifiedError = classifyError(error);
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    // Log error details
    const errorLog = {
      error_code: classifiedError.code,
      error_message: classifiedError.message,
      status_code: classifiedError.statusCode,
      request_id: requestId,
      url: req.url,
      method: req.method,
      user_id: req.user?.uid,
      clinic_id: req.user?.clinic_id,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      stack: classifiedError.stack,
      details: classifiedError.details,
      timestamp: new Date().toISOString()
    };

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', errorLog);
    }

    // Log operational errors to audit system
    if (classifiedError.isOperational && req.user) {
      try {
        await AuditService.logError(req, classifiedError, 'globalErrorHandler');
      } catch (auditError) {
        console.error('Failed to log error to audit system:', auditError);
      }
    }

    // Prepare error response
    const errorResponse: ErrorResponse = {
      error: {
        code: classifiedError.code || 'INTERNAL_ERROR',
        message: classifiedError.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        request_id: requestId
      }
    };

    // Add details for operational errors
    if (classifiedError.isOperational && classifiedError.details) {
      errorResponse.error.details = classifiedError.details;
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development' && classifiedError.stack) {
      errorResponse.error.stack = classifiedError.stack;
    }

    // Send error response
    const statusCode = classifiedError.statusCode || 500;
    res.status(statusCode).json(errorResponse);

  } catch (handlerError) {
    // Fallback error handling
    console.error('Error in error handler:', handlerError);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
};

/**
 * Error monitoring and alerting
 */
export class ErrorMonitor {
  private static errorCounts = new Map<string, number>();
  private static lastReset = Date.now();
  private static readonly RESET_INTERVAL = 60000; // 1 minute
  private static readonly ALERT_THRESHOLD = 10; // errors per minute

  static recordError(error: ApiError, req: Request): void {
    const now = Date.now();
    
    // Reset counters every minute
    if (now - this.lastReset > this.RESET_INTERVAL) {
      this.errorCounts.clear();
      this.lastReset = now;
    }

    // Count errors by type
    const errorKey = `${error.code}_${error.statusCode}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    // Check for alert threshold
    if (currentCount + 1 >= this.ALERT_THRESHOLD) {
      this.sendAlert(error, currentCount + 1, req);
    }
  }

  private static sendAlert(error: ApiError, count: number, req: Request): void {
    // In a real application, this would send alerts to monitoring services
    console.warn(`HIGH ERROR RATE ALERT: ${error.code} occurred ${count} times in the last minute`);
    
    // Could integrate with services like:
    // - Slack notifications
    // - Email alerts
    // - PagerDuty
    // - Datadog
    // - Sentry
  }

  static getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }
}

/**
 * Health check endpoint error handler
 */
export const healthCheckErrorHandler = (error: any): { status: string; error?: string } => {
  const classifiedError = classifyError(error);
  
  return {
    status: 'unhealthy',
    error: classifiedError.message
  };
};

/**
 * Graceful shutdown error handler
 */
export const gracefulShutdown = (server: any) => {
  return (signal: string) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close((err: any) => {
      if (err) {
        console.error('Error during server shutdown:', err);
        process.exit(1);
      }
      
      console.log('Server closed successfully');
      process.exit(0);
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };
};

/**
 * Process error handlers
 */
export const setupProcessErrorHandlers = (): void => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    
    // Log to external service if available
    try {
      // Could send to error tracking service
      console.error('Uncaught exception details:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Failed to log uncaught exception:', logError);
    }
    
    // Exit gracefully
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Log to external service if available
    try {
      console.error('Unhandled rejection details:', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Failed to log unhandled rejection:', logError);
    }
    
    // Don't exit for unhandled rejections in production
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

  // Handle SIGTERM and SIGINT for graceful shutdown
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach(signal => {
    process.on(signal, () => {
      console.log(`Received ${signal}. Shutting down gracefully...`);
      process.exit(0);
    });
  });
};

/**
 * Error context helper
 */
export const createErrorContext = (req: Request) => {
  return {
    request_id: req.headers['x-request-id'] as string,
    user_id: req.user?.uid,
    clinic_id: req.user?.clinic_id,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  };
};

/**
 * Error response helper
 */
export const createErrorResponse = (
  error: ApiError,
  requestId: string,
  includeStack: boolean = false
): ErrorResponse => {
  const response: ErrorResponse = {
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      request_id: requestId
    }
  };

  if (error.details) {
    response.error.details = error.details;
  }

  if (includeStack && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
};

export default {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
  ExternalServiceError,
  RateLimitError,
  classifyError,
  globalErrorHandler,
  asyncHandler,
  notFoundHandler,
  ErrorMonitor,
  healthCheckErrorHandler,
  gracefulShutdown,
  setupProcessErrorHandlers,
  createErrorContext,
  createErrorResponse
};