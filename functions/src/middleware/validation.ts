import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationService } from '../services/validationService';

/**
 * Generic validation middleware factory
 */
export const validateRequest = (schema: Joi.ObjectSchema, target: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = req[target];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert types when possible
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: validationErrors,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    // Replace the original data with validated and sanitized data
    req[target] = value;
    next();
  };
};

/**
 * Business rule validation middleware
 */
export const validateBusinessRules = (
  validationFn: (data: any, user: any) => Promise<{ valid: boolean; errors: string[] }>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validation = await validationFn(req.body, req.user);
      
      if (!validation.valid) {
        res.status(400).json({
          error: {
            code: 'BUSINESS_RULE_VIOLATION',
            message: 'Business rule validation failed',
            details: validation.errors,
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Business rule validation error:', error);
      res.status(500).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate business rules',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
    }
  };
};

/**
 * Clinic isolation validation middleware
 */
export const validateClinicIsolation = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
    return;
  }

  const requestedClinicId = req.params.clinic_id || req.params.id;
  
  if (!requestedClinicId) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Clinic ID required in URL',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
    return;
  }

  // Validate clinic access using ValidationService
  if (!ValidationService.validateClinicAccess(req.user.clinic_id || null, requestedClinicId)) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied to this clinic',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
    return;
  }

  next();
};

/**
 * Data sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Recursively sanitize strings in request body
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/[<>]/g, ''); // Basic XSS prevention
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * Rate limiting validation (basic implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const validateRateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      requestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    
    if (clientData.count >= maxRequests) {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }
    
    clientData.count++;
    next();
  };
};

/**
 * File upload validation middleware
 * Note: Requires multer middleware to be applied first
 */
export const validateFileUpload = (
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf'],
  maxSize: number = 5 * 1024 * 1024 // 5MB
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Type assertion for multer file properties
    const multerReq = req as any;
    
    if (!multerReq.file && !multerReq.files) {
      next();
      return;
    }

    const files = multerReq.files ? 
      (Array.isArray(multerReq.files) ? multerReq.files : [multerReq.files]) : 
      [multerReq.file];
    
    for (const file of files) {
      if (!file) continue;
      
      if (!allowedTypes.includes(file.mimetype)) {
        res.status(400).json({
          error: {
            code: 'INVALID_FILE_TYPE',
            message: `File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }
      
      if (file.size > maxSize) {
        res.status(400).json({
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`,
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }
    }

    next();
  };
};

/**
 * Validation schemas for common use cases
 */
export const commonSchemas = {
  // ID validation
  mongoId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  uuid: Joi.string().uuid().required(),
  
  // Date validation
  dateString: Joi.string().isoDate(),
  dateRange: Joi.object({
    start_date: Joi.string().isoDate().required(),
    end_date: Joi.string().isoDate().required()
  }).custom((value, helpers) => {
    if (new Date(value.start_date) >= new Date(value.end_date)) {
      return helpers.error('date.range');
    }
    return value;
  }).messages({
    'date.range': 'Start date must be before end date'
  }),
  
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('asc', 'desc').default('desc'),
    sort_by: Joi.string().default('created_at')
  }),
  
  // Search
  search: Joi.object({
    q: Joi.string().min(1).max(100).trim(),
    fields: Joi.array().items(Joi.string()).default(['name'])
  }),
  
  // Brazilian specific validations
  brazilianPhone: Joi.string().pattern(/^(\+55\s?)?\(?[1-9]{2}\)?\s?9?[0-9]{4}-?[0-9]{4}$/),
  brazilianCPF: Joi.string().pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/),
  brazilianCNPJ: Joi.string().pattern(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/),
  brazilianCEP: Joi.string().pattern(/^\d{5}-?\d{3}$/)
};

/**
 * Enhanced validation service with additional business rules
 */
export class EnhancedValidationService extends ValidationService {
  
  /**
   * Validate invoice business rules
   */
  static async validateInvoiceBusinessRules(invoiceData: any, user: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Check if emission date is not in the future
    const emissionDate = new Date(invoiceData.emission_date);
    if (emissionDate > new Date()) {
      errors.push('Invoice emission date cannot be in the future');
    }
    
    // Check if emission date is not too old (more than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (emissionDate < oneYearAgo) {
      errors.push('Invoice emission date cannot be more than 1 year old');
    }
    
    // Validate product expiration dates
    if (invoiceData.products) {
      for (const product of invoiceData.products) {
        const expirationDate = new Date(product.expiration_date);
        if (expirationDate <= new Date()) {
          errors.push(`Product ${product.product_id} has already expired`);
        }
        
        // Check if expiration date is reasonable (not more than 10 years in future)
        const tenYearsFromNow = new Date();
        tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);
        if (expirationDate > tenYearsFromNow) {
          errors.push(`Product ${product.product_id} expiration date seems unrealistic`);
        }
      }
    }
    
    // Calculate and validate total value
    if (invoiceData.products && invoiceData.total_value !== undefined) {
      const calculatedTotal = invoiceData.products.reduce((sum: number, product: any) => {
        return sum + (product.quantity * product.unit_price);
      }, 0);
      
      const tolerance = 0.01; // Allow 1 cent difference for rounding
      if (Math.abs(calculatedTotal - invoiceData.total_value) > tolerance) {
        errors.push('Total value does not match sum of product values');
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * Validate patient business rules
   */
  static async validatePatientBusinessRules(patientData: any, user: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Check if birth date makes sense
    const birthDate = new Date(patientData.birth_date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < 0) {
      errors.push('Birth date cannot be in the future');
    }
    
    if (age > 150) {
      errors.push('Birth date indicates unrealistic age');
    }
    
    // For aesthetic treatments, typically minimum age is 18
    if (age < 18) {
      errors.push('Patient must be at least 18 years old for aesthetic treatments');
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * Validate request business rules
   */
  static async validateRequestBusinessRules(requestData: any, user: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Check if request date is not in the future
    const requestDate = new Date(requestData.request_date);
    if (requestDate > new Date()) {
      errors.push('Request date cannot be in the future');
    }
    
    // Check if request date is not too old (more than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (requestDate < thirtyDaysAgo) {
      errors.push('Request date cannot be more than 30 days old');
    }
    
    // Validate product quantities are reasonable
    if (requestData.products_used) {
      for (const product of requestData.products_used) {
        if (product.quantity > 100) {
          errors.push(`Product ${product.product_id} quantity seems unreasonably high`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
}