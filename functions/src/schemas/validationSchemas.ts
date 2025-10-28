import Joi from 'joi';
import { UserRole } from '../config/auth';

/**
 * Enhanced validation schemas with comprehensive business rules
 */

// Common field validations
const commonFields = {
  id: Joi.string().min(1).max(50).required(),
  email: Joi.string().email().max(255).required(),
  name: Joi.string().min(2).max(100).trim().required(),
  description: Joi.string().min(1).max(1000).trim(),
  phone: Joi.string().pattern(/^(\+55\s?)?\(?[1-9]{2}\)?\s?9?[0-9]{4}-?[0-9]{4}$/).required(),
  date: Joi.date().iso().required(),
  positiveNumber: Joi.number().positive().required(),
  nonNegativeNumber: Joi.number().min(0).required(),
  currency: Joi.number().precision(2).min(0).required(),
  percentage: Joi.number().min(0).max(100).required(),
  url: Joi.string().uri().max(500),
  notes: Joi.string().max(2000).trim().allow('').default('')
};

// Address schema (Brazilian format)
export const addressSchema = Joi.object({
  street: Joi.string().min(5).max(200).trim().required(),
  number: Joi.string().min(1).max(20).trim().required(),
  complement: Joi.string().max(100).trim().allow('').optional(),
  neighborhood: Joi.string().min(2).max(100).trim().required(),
  city: Joi.string().min(2).max(100).trim().required(),
  state: Joi.string().min(2).max(50).trim().required(),
  zip_code: Joi.string().pattern(/^\d{5}-?\d{3}$/).required(),
  country: Joi.string().valid('Brazil', 'Brasil').default('Brazil')
});

// User schemas
export const userProfileSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).trim().required(),
  last_name: Joi.string().min(2).max(50).trim().required(),
  phone: commonFields.phone.optional()
});

export const createUserSchema = Joi.object({
  email: commonFields.email,
  password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    }),
  role: Joi.string().valid(...Object.values(UserRole)).required(),
  clinic_id: Joi.string().when('role', {
    is: Joi.string().valid(UserRole.CLINIC_ADMIN, UserRole.CLINIC_USER),
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  profile: userProfileSchema.required(),
  permissions: Joi.array().items(Joi.string()).optional()
});

export const updateUserSchema = Joi.object({
  profile: userProfileSchema.optional(),
  permissions: Joi.array().items(Joi.string()).optional()
});

// Clinic schemas
export const clinicSettingsSchema = Joi.object({
  timezone: Joi.string().default('America/Sao_Paulo'),
  notification_preferences: Joi.object({
    low_stock_alerts: Joi.boolean().default(true),
    expiration_alerts: Joi.boolean().default(true),
    email_notifications: Joi.boolean().default(true),
    alert_threshold_days: Joi.number().integer().min(1).max(365).default(30)
  }).default({})
}).default({});

export const createClinicSchema = Joi.object({
  name: commonFields.name,
  address: Joi.string().min(10).max(300).trim().required(),
  admin_email: commonFields.email,
  admin_profile: userProfileSchema.required(),
  admin_password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
  settings: clinicSettingsSchema.optional()
});

export const updateClinicSchema = Joi.object({
  name: commonFields.name.optional(),
  address: Joi.string().min(10).max(300).trim().optional(),
  settings: clinicSettingsSchema.optional()
});

// Product schemas
export const createProductSchema = Joi.object({
  name: commonFields.name,
  description: commonFields.description.required(),
  rennova_code: Joi.string().pattern(/^REN-[A-Z0-9]{6,10}$/).required()
    .messages({
      'string.pattern.base': 'Rennova code must follow format REN-XXXXXX'
    }),
  category: Joi.string().min(2).max(50).trim().required(),
  unit_type: Joi.string().valid('ml', 'units', 'vials').required(),
  status: Joi.string().valid('approved', 'pending').default('pending'),
  requested_by_clinic_id: Joi.string().optional()
});

export const updateProductSchema = Joi.object({
  name: commonFields.name.optional(),
  description: commonFields.description.optional(),
  category: Joi.string().min(2).max(50).trim().optional(),
  unit_type: Joi.string().valid('ml', 'units', 'vials').optional()
});

// Invoice schemas
export const invoiceProductSchema = Joi.object({
  product_id: commonFields.id,
  quantity: commonFields.positiveNumber,
  unit_price: commonFields.currency,
  expiration_date: Joi.date().greater('now').required()
    .messages({
      'date.greater': 'Product expiration date must be in the future'
    }),
  lot: Joi.string().min(1).max(50).trim().required(),
  batch_number: Joi.string().max(50).trim().optional()
});

export const createInvoiceSchema = Joi.object({
  invoice_number: Joi.string().min(1).max(50).trim().required(),
  supplier: Joi.string().min(2).max(100).trim().required(),
  emission_date: Joi.date().max('now').required()
    .messages({
      'date.max': 'Invoice emission date cannot be in the future'
    }),
  products: Joi.array().items(invoiceProductSchema).min(1).max(100).required(),
  total_value: commonFields.currency,
  status: Joi.string().valid('pending', 'approved', 'rejected').default('pending'),
  attachments: Joi.array().items(Joi.string().uri()).max(10).default([]),
  notes: commonFields.notes
}).custom((value, helpers) => {
  // Validate that total_value matches sum of products
  const calculatedTotal = value.products.reduce((sum: number, product: any) => {
    return sum + (product.quantity * product.unit_price);
  }, 0);
  
  const tolerance = 0.01; // Allow 1 cent difference for rounding
  if (Math.abs(calculatedTotal - value.total_value) > tolerance) {
    return helpers.error('invoice.totalMismatch');
  }
  
  return value;
}).messages({
  'invoice.totalMismatch': 'Total value must match the sum of product values'
});

export const updateInvoiceSchema = Joi.object({
  invoice_number: Joi.string().min(1).max(50).trim().optional(),
  supplier: Joi.string().min(2).max(100).trim().optional(),
  emission_date: Joi.date().max('now').optional(),
  products: Joi.array().items(invoiceProductSchema).min(1).max(100).optional(),
  total_value: commonFields.currency.optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
  attachments: Joi.array().items(Joi.string().uri()).max(10).optional(),
  notes: commonFields.notes.optional()
});

// Patient schemas
export const createPatientSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).trim().required(),
  last_name: Joi.string().min(2).max(50).trim().required(),
  birth_date: Joi.date().max('now').custom((value, helpers) => {
    const age = new Date().getFullYear() - value.getFullYear();
    if (age < 18) {
      return helpers.error('patient.minAge');
    }
    if (age > 150) {
      return helpers.error('patient.maxAge');
    }
    return value;
  }).required().messages({
    'patient.minAge': 'Patient must be at least 18 years old',
    'patient.maxAge': 'Patient age seems unrealistic',
    'date.max': 'Birth date cannot be in the future'
  }),
  phone: commonFields.phone,
  email: commonFields.email,
  address: addressSchema.optional(),
  medical_history: Joi.array().items(Joi.object({
    date: commonFields.date,
    notes: Joi.string().min(1).max(1000).required(),
    created_by: commonFields.id
  })).default([])
});

export const updatePatientSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).trim().optional(),
  last_name: Joi.string().min(2).max(50).trim().optional(),
  birth_date: Joi.date().max('now').custom((value, helpers) => {
    const age = new Date().getFullYear() - value.getFullYear();
    if (age < 18) {
      return helpers.error('patient.minAge');
    }
    if (age > 150) {
      return helpers.error('patient.maxAge');
    }
    return value;
  }).optional(),
  phone: commonFields.phone.optional(),
  email: commonFields.email.optional(),
  address: addressSchema.optional()
});

export const medicalHistoryEntrySchema = Joi.object({
  notes: Joi.string().min(1).max(1000).trim().required()
});

// Request schemas
export const productUsageSchema = Joi.object({
  product_id: commonFields.id,
  quantity: Joi.number().positive().max(100).required()
    .messages({
      'number.max': 'Product quantity seems unreasonably high'
    }),
  lot: Joi.string().min(1).max(50).trim().required(),
  expiration_date: Joi.date().greater('now').required()
});

export const createRequestSchema = Joi.object({
  patient_id: commonFields.id,
  request_date: Joi.date().max('now').min(Joi.ref('$thirtyDaysAgo')).required()
    .messages({
      'date.max': 'Request date cannot be in the future',
      'date.min': 'Request date cannot be more than 30 days old'
    }),
  treatment_type: Joi.string().min(2).max(100).trim().required(),
  products_used: Joi.array().items(productUsageSchema).min(1).max(50).required(),
  notes: commonFields.notes,
  performed_by: commonFields.id
}).external(async (value) => {
  // Add context for date validation
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return { ...value, $thirtyDaysAgo: thirtyDaysAgo };
});

export const updateRequestSchema = Joi.object({
  request_date: Joi.date().max('now').optional(),
  treatment_type: Joi.string().min(2).max(100).trim().optional(),
  products_used: Joi.array().items(productUsageSchema).min(1).max(50).optional(),
  notes: commonFields.notes.optional(),
  performed_by: commonFields.id.optional()
});

// Inventory schemas
export const inventoryItemSchema = Joi.object({
  product_id: commonFields.id,
  quantity_in_stock: commonFields.nonNegativeNumber,
  minimum_stock_level: commonFields.nonNegativeNumber,
  expiration_dates: Joi.array().items(Joi.object({
    date: Joi.date().greater('now').required(),
    lot: Joi.string().min(1).max(50).trim().required(),
    quantity: commonFields.positiveNumber
  })).min(0).required()
});

// Query parameter schemas
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid('asc', 'desc').default('desc'),
  sort_by: Joi.string().default('created_at')
});

export const searchSchema = Joi.object({
  q: Joi.string().min(1).max(100).trim().optional(),
  fields: Joi.array().items(Joi.string()).default(['name'])
});

export const dateRangeSchema = Joi.object({
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).required()
    .messages({
      'date.min': 'End date must be after start date'
    })
});

export const statusFilterSchema = Joi.object({
  status: Joi.string().optional()
});

// Authentication schemas
export const loginSchema = Joi.object({
  email: commonFields.email,
  password: Joi.string().min(1).max(128).required()
});

export const passwordResetSchema = Joi.object({
  email: commonFields.email
});

export const changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
});

// File upload schemas
export const fileUploadSchema = Joi.object({
  filename: Joi.string().max(255).required(),
  mimetype: Joi.string().valid(
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ).required(),
  size: Joi.number().max(10 * 1024 * 1024).required() // 10MB max
});

// Notification schemas
export const notificationSchema = Joi.object({
  type: Joi.string().valid('low_stock', 'expiring', 'new_product', 'system_alert').required(),
  title: Joi.string().min(1).max(200).required(),
  message: Joi.string().min(1).max(1000).required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  data: Joi.object().optional()
});

// Dashboard schemas
export const dashboardFilterSchema = Joi.object({
  period: Joi.string().valid('today', 'week', 'month', 'quarter', 'year').default('month'),
  clinic_id: Joi.string().optional()
});

// Audit log schemas
export const auditLogSchema = Joi.object({
  action: Joi.string().min(1).max(100).required(),
  resource_type: Joi.string().min(1).max(50).required(),
  resource_id: Joi.string().optional(),
  old_values: Joi.object().optional(),
  new_values: Joi.object().optional(),
  ip_address: Joi.string().ip().optional(),
  user_agent: Joi.string().max(500).optional()
});

// Validation helper functions
export const validateId = (id: string): boolean => {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length >= 1 && id.length <= 50;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^(\+55\s?)?\(?[1-9]{2}\)?\s?9?[0-9]{4}-?[0-9]{4}$/;
  return phoneRegex.test(phone);
};

export const validateRennovaCode = (code: string): boolean => {
  const codeRegex = /^REN-[A-Z0-9]{6,10}$/;
  return codeRegex.test(code);
};

export const validateCurrency = (value: number): boolean => {
  return value >= 0 && Number.isFinite(value) && Number(value.toFixed(2)) === value;
};

export const validateDateRange = (startDate: Date, endDate: Date): boolean => {
  return startDate <= endDate;
};

export const validateAge = (birthDate: Date, minAge: number = 18, maxAge: number = 150): boolean => {
  const age = new Date().getFullYear() - birthDate.getFullYear();
  return age >= minAge && age <= maxAge;
};

// Schema validation helper
export const getValidationSchema = (entityType: string, operation: 'create' | 'update' | 'query' = 'create'): Joi.ObjectSchema => {
  const schemaMap: Record<string, Record<string, Joi.ObjectSchema>> = {
    user: {
      create: createUserSchema,
      update: updateUserSchema
    },
    clinic: {
      create: createClinicSchema,
      update: updateClinicSchema
    },
    product: {
      create: createProductSchema,
      update: updateProductSchema
    },
    invoice: {
      create: createInvoiceSchema,
      update: updateInvoiceSchema
    },
    patient: {
      create: createPatientSchema,
      update: updatePatientSchema
    },
    request: {
      create: createRequestSchema,
      update: updateRequestSchema
    },
    pagination: {
      query: paginationSchema
    },
    search: {
      query: searchSchema
    },
    dateRange: {
      query: dateRangeSchema
    }
  };

  const entitySchemas = schemaMap[entityType];
  if (!entitySchemas) {
    throw new Error(`No validation schema found for entity type: ${entityType}`);
  }

  const schema = entitySchemas[operation];
  if (!schema) {
    throw new Error(`No ${operation} schema found for entity type: ${entityType}`);
  }

  return schema;
};