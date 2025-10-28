import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { ClinicService, CreateClinicRequest, UpdateClinicRequest } from '../services/clinicService';
import { UserService } from '../services/userService';
import { InvoiceService } from '../services/invoiceService';
import { PatientService } from '../services/patientService';
import { RequestService } from '../services/requestService';
import { InventoryService } from '../services/inventoryService';
import { DashboardService } from '../services/dashboardService';
import FirestoreService from '../services/firestoreService';
import { UserRole } from '../config/auth';
import { authenticateToken, addRequestId, logRequest } from '../middleware/auth';
import { validatePermissions } from '../middleware/permissions';
import { Invoice, Patient, Request as TreatmentRequest } from '../models/types';

const router = Router();
const clinicService = new ClinicService();
const userService = new UserService();

// Validation schemas
const createClinicSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  cnpj: Joi.string().min(14).max(18).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(10).max(20).required(),
  address: Joi.string().min(5).max(200).required(),
  city: Joi.string().min(2).max(100).required(),
  admin_email: Joi.string().email().required(),
  admin_profile: Joi.object({
    first_name: Joi.string().min(2).max(50).required(),
    last_name: Joi.string().min(2).max(50).required(),
    phone: Joi.string().optional()
  }).required(),
  admin_password: Joi.string().min(8).required(),
  settings: Joi.object({
    timezone: Joi.string().optional(),
    notification_preferences: Joi.object({
      low_stock_alerts: Joi.boolean().optional(),
      expiration_alerts: Joi.boolean().optional(),
      email_notifications: Joi.boolean().optional(),
      alert_threshold_days: Joi.number().min(1).max(365).optional()
    }).optional()
  }).optional()
});

const updateClinicSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().min(10).max(20).optional(),
  address: Joi.string().min(5).max(200).optional(),
  city: Joi.string().min(2).max(100).optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  settings: Joi.object({
    timezone: Joi.string().optional(),
    notification_preferences: Joi.object({
      low_stock_alerts: Joi.boolean().optional(),
      expiration_alerts: Joi.boolean().optional(),
      email_notifications: Joi.boolean().optional(),
      alert_threshold_days: Joi.number().min(1).max(365).optional()
    }).optional()
  }).optional()
});

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid(UserRole.CLINIC_ADMIN, UserRole.CLINIC_USER).required(),
  profile: Joi.object({
    first_name: Joi.string().min(2).max(50).required(),
    last_name: Joi.string().min(2).max(50).required(),
    phone: Joi.string().optional()
  }).required(),
  permissions: Joi.array().items(Joi.string()).optional()
});

const updateUserSchema = Joi.object({
  profile: Joi.object({
    first_name: Joi.string().min(2).max(50).optional(),
    last_name: Joi.string().min(2).max(50).optional(),
    phone: Joi.string().optional()
  }).optional(),
  permissions: Joi.array().items(Joi.string()).optional()
});

const invoiceProductSchema = Joi.object({
  product_id: Joi.string().required(),
  quantity: Joi.number().positive().required(),
  unit_price: Joi.number().positive().required(),
  expiration_date: Joi.date().required(),
  lot: Joi.string().required(),
  batch_number: Joi.string().optional()
});

const createInvoiceSchema = Joi.object({
  invoice_number: Joi.string().min(1).max(50).required(),
  supplier: Joi.string().min(2).max(100).required(),
  emission_date: Joi.date().required(),
  products: Joi.array().items(invoiceProductSchema).min(1).required(),
  total_value: Joi.number().positive().required(),
  status: Joi.string().valid('pending', 'approved', 'rejected').default('pending'),
  attachments: Joi.array().items(Joi.string()).default([])
});

const updateInvoiceSchema = Joi.object({
  invoice_number: Joi.string().min(1).max(50).optional(),
  supplier: Joi.string().min(2).max(100).optional(),
  emission_date: Joi.date().optional(),
  products: Joi.array().items(invoiceProductSchema).min(1).optional(),
  total_value: Joi.number().positive().optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
  attachments: Joi.array().items(Joi.string()).optional()
});

const addressSchema = Joi.object({
  street: Joi.string().min(5).max(200).required(),
  city: Joi.string().min(2).max(100).required(),
  state: Joi.string().min(2).max(50).required(),
  zip_code: Joi.string().min(5).max(20).required(),
  country: Joi.string().min(2).max(50).required()
});

const createPatientSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).required(),
  last_name: Joi.string().min(2).max(50).required(),
  birth_date: Joi.date().required(),
  phone: Joi.string().min(10).max(20).required(),
  email: Joi.string().email().required(),
  address: addressSchema.optional()
});

const updatePatientSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).optional(),
  last_name: Joi.string().min(2).max(50).optional(),
  birth_date: Joi.date().optional(),
  phone: Joi.string().min(10).max(20).optional(),
  email: Joi.string().email().optional(),
  address: addressSchema.optional()
});

const medicalEntrySchema = Joi.object({
  notes: Joi.string().min(1).max(1000).required()
});

// Apply middleware
router.use(addRequestId);
router.use(logRequest);
router.use(authenticateToken);

/**
 * POST /clinics
 * Create a new clinic (system_admin only)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createClinicSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const createClinicRequest: CreateClinicRequest = value;

    // Create the clinic
    const clinic = await clinicService.createClinic(
      createClinicRequest,
      req.user.uid,
      req.user.role
    );

    return res.status(201).json({
      message: 'Clinic created successfully',
      clinic: {
        clinic_id: clinic.clinic_id,
        name: clinic.name,
        cnpj: clinic.cnpj,
        email: clinic.email,
        phone: clinic.phone,
        address: clinic.address,
        city: clinic.city,
        admin_user_id: clinic.admin_user_id,
        status: clinic.status,
        created_at: clinic.created_at,
        updated_at: clinic.updated_at,
        settings: clinic.settings
      }
    });
  } catch (error: any) {
    console.error('Create clinic error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Insufficient permissions')) {
      statusCode = 403;
      errorCode = 'FORBIDDEN';
      message = error.message;
    } else if (error.message.includes('email-already-exists')) {
      statusCode = 409;
      errorCode = 'EMAIL_EXISTS';
      message = 'Admin email address is already in use';
    } else if (error.message.includes('CNPJ already exists')) {
      statusCode = 409;
      errorCode = 'CNPJ_EXISTS';
      message = 'A clinic with this CNPJ already exists';
    } else if (error.message.includes('clinic with this email already exists')) {
      statusCode = 409;
      errorCode = 'CLINIC_EMAIL_EXISTS';
      message = 'A clinic with this email already exists';
    } else if (error.message.includes('Invalid CNPJ')) {
      statusCode = 400;
      errorCode = 'INVALID_CNPJ';
      message = 'Invalid CNPJ format';
    } else if (error.message.includes('Invalid phone')) {
      statusCode = 400;
      errorCode = 'INVALID_PHONE';
      message = 'Invalid phone format';
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics
 * List clinics with search, filtering, and sorting support
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Parse query parameters
    const search = req.query.search as string || '';
    const status = req.query.status as 'active' | 'inactive' | 'all' || 'all';
    const sortBy = req.query.sort_by as 'name' | 'created_at' | 'city' || 'name';
    const sortOrder = req.query.sort_order as 'asc' | 'desc' || 'asc';

    const filters = {
      status,
      sortBy,
      sortOrder
    };

    let clinics;
    
    if (search) {
      // Use search functionality
      clinics = await clinicService.searchClinics(
        search,
        filters,
        req.user.role,
        req.user.clinic_id
      );
    } else {
      // Use regular list with filters
      clinics = await clinicService.listClinics(
        req.user.role,
        req.user.clinic_id
      );
    }

    return res.status(200).json({
      clinics: clinics.map(clinic => ({
        clinic_id: clinic.clinic_id,
        name: clinic.name,
        cnpj: clinic.cnpj,
        email: clinic.email,
        phone: clinic.phone,
        address: clinic.address,
        city: clinic.city,
        admin_user_id: clinic.admin_user_id,
        status: clinic.status,
        created_at: clinic.created_at,
        updated_at: clinic.updated_at,
        settings: clinic.settings
      }))
    });
  } catch (error: any) {
    console.error('List clinics error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Insufficient permissions')) {
      statusCode = 403;
      errorCode = 'FORBIDDEN';
      message = error.message;
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id
 * Get clinic details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    // Check permissions
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to access this clinic',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinic = await clinicService.getClinicById(clinicId);

    if (!clinic) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Clinic not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    return res.status(200).json({
      clinic: {
        clinic_id: clinic.clinic_id,
        name: clinic.name,
        cnpj: clinic.cnpj,
        email: clinic.email,
        phone: clinic.phone,
        address: clinic.address,
        city: clinic.city,
        admin_user_id: clinic.admin_user_id,
        status: clinic.status,
        created_at: clinic.created_at,
        updated_at: clinic.updated_at,
        settings: clinic.settings
      }
    });
  } catch (error: any) {
    console.error('Get clinic error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get clinic',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * PUT /clinics/:id
 * Update clinic information
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = updateClinicSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const updateRequest: UpdateClinicRequest = value;

    const updatedClinic = await clinicService.updateClinic(
      clinicId,
      updateRequest,
      req.user.role,
      req.user.clinic_id,
      req.user.uid
    );

    return res.status(200).json({
      message: 'Clinic updated successfully',
      clinic: {
        clinic_id: updatedClinic.clinic_id,
        name: updatedClinic.name,
        cnpj: updatedClinic.cnpj,
        email: updatedClinic.email,
        phone: updatedClinic.phone,
        address: updatedClinic.address,
        city: updatedClinic.city,
        admin_user_id: updatedClinic.admin_user_id,
        status: updatedClinic.status,
        created_at: updatedClinic.created_at,
        updated_at: updatedClinic.updated_at,
        settings: updatedClinic.settings
      }
    });
  } catch (error: any) {
    console.error('Update clinic error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Insufficient permissions')) {
      statusCode = 403;
      errorCode = 'FORBIDDEN';
      message = error.message;
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'Clinic not found';
    } else if (error.message.includes('clinic with this email already exists')) {
      statusCode = 409;
      errorCode = 'CLINIC_EMAIL_EXISTS';
      message = 'A clinic with this email already exists';
    } else if (error.message.includes('Invalid phone')) {
      statusCode = 400;
      errorCode = 'INVALID_PHONE';
      message = 'Invalid phone format';
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * DELETE /clinics/:id
 * Delete clinic (system_admin only)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    await clinicService.deleteClinic(clinicId, req.user.role);

    return res.status(200).json({
      message: 'Clinic deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete clinic error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Insufficient permissions')) {
      statusCode = 403;
      errorCode = 'FORBIDDEN';
      message = error.message;
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'Clinic not found';
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * PUT /clinics/:id/status
 * Toggle clinic status between active and inactive
 */
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const statusSchema = Joi.object({
      status: Joi.string().valid('active', 'inactive').required()
    });

    const { error, value } = statusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    // Only system_admin can toggle clinic status
    if (req.user.role !== UserRole.SYSTEM_ADMIN) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to change clinic status',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const updatedClinic = await clinicService.toggleClinicStatus(
      clinicId,
      value.status,
      req.user.role,
      req.user.uid
    );

    return res.status(200).json({
      message: `Clinic ${value.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      clinic: {
        clinic_id: updatedClinic.clinic_id,
        name: updatedClinic.name,
        status: updatedClinic.status,
        updated_at: updatedClinic.updated_at
      }
    });
  } catch (error: any) {
    console.error('Toggle clinic status error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Insufficient permissions')) {
      statusCode = 403;
      errorCode = 'FORBIDDEN';
      message = error.message;
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'Clinic not found';
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id/audit-logs
 * Get clinic audit logs with pagination
 */
router.get('/:id/audit-logs', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    // Only system_admin can access audit logs
    if (req.user.role !== UserRole.SYSTEM_ADMIN) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to access audit logs',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Parse pagination parameters
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PAGINATION',
          message: 'Limit must be between 1 and 100',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    if (offset < 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PAGINATION',
          message: 'Offset must be non-negative',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const auditLogs = await clinicService.getClinicAuditLogs(clinicId, limit, offset);

    return res.status(200).json({
      audit_logs: auditLogs.map(log => ({
        log_id: log.log_id,
        action_type: log.action_type,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        user_id: log.user_id,
        details: log.details,
        timestamp: log.timestamp
      })),
      pagination: {
        limit,
        offset,
        has_more: auditLogs.length === limit
      }
    });
  } catch (error: any) {
    console.error('Get clinic audit logs error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Insufficient permissions')) {
      statusCode = 403;
      errorCode = 'FORBIDDEN';
      message = error.message;
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'Clinic not found';
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id/stats
 * Get clinic statistics
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    const stats = await clinicService.getClinicStats(
      clinicId,
      req.user.role,
      req.user.clinic_id
    );

    return res.status(200).json({
      stats
    });
  } catch (error: any) {
    console.error('Get clinic stats error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Insufficient permissions')) {
      statusCode = 403;
      errorCode = 'FORBIDDEN';
      message = error.message;
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * POST /clinics/:id/users
 * Create user within clinic (clinic_admin only)
 */
router.post('/:id/users', validatePermissions(['manage_users']), async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    // Ensure clinic_admin can only create users in their own clinic
    if (req.user.role === UserRole.CLINIC_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot create users for other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const createUserRequest = {
      ...value,
      clinic_id: clinicId
    };

    const userProfile = await userService.createUser(
      createUserRequest,
      req.user.uid,
      req.user.role,
      req.user.clinic_id
    );

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        user_id: userProfile.user_id,
        email: userProfile.email,
        role: userProfile.role,
        clinic_id: userProfile.clinic_id,
        permissions: userProfile.permissions,
        profile: userProfile.profile,
        created_at: userProfile.created_at
      }
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('email-already-exists')) {
      statusCode = 409;
      errorCode = 'EMAIL_EXISTS';
      message = 'Email address is already in use';
    } else if (error.message.includes('Insufficient permissions')) {
      statusCode = 403;
      errorCode = 'FORBIDDEN';
      message = error.message;
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id/users
 * List users in clinic (clinic_admin only)
 */
router.get('/:id/users', validatePermissions(['manage_users']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    // Ensure clinic_admin can only list users in their own clinic
    if (req.user.role === UserRole.CLINIC_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot access users from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const users = await userService.getUsersByClinic(clinicId);

    return res.status(200).json({
      users: users.map(user => ({
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        clinic_id: user.clinic_id,
        permissions: user.permissions,
        profile: user.profile,
        created_at: user.created_at,
        last_login: user.last_login
      }))
    });
  } catch (error: any) {
    console.error('List users error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list users',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * PUT /clinics/:id/users/:userId
 * Update user within clinic (clinic_admin only)
 */
router.put('/:id/users/:userId', validatePermissions(['manage_users']), async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const userId = req.params.userId;

    // Ensure clinic_admin can only update users in their own clinic
    if (req.user.role === UserRole.CLINIC_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot update users from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Get current user to verify they belong to this clinic
    const currentUser = await userService.getUserProfile(userId);
    if (!currentUser || currentUser.clinic_id !== clinicId) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found in this clinic',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const updatedUser = await userService.updateUserProfile(
      userId,
      value,
      req.user.uid
    );

    return res.status(200).json({
      message: 'User updated successfully',
      user: {
        user_id: updatedUser.user_id,
        email: updatedUser.email,
        role: updatedUser.role,
        clinic_id: updatedUser.clinic_id,
        permissions: updatedUser.permissions,
        profile: updatedUser.profile,
        created_at: updatedUser.created_at,
        last_login: updatedUser.last_login
      }
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'User not found';
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * DELETE /clinics/:id/users/:userId
 * Delete user from clinic (clinic_admin only)
 */
router.delete('/:id/users/:userId', validatePermissions(['manage_users']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const userId = req.params.userId;

    // Ensure clinic_admin can only delete users in their own clinic
    if (req.user.role === UserRole.CLINIC_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot delete users from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Get current user to verify they belong to this clinic
    const currentUser = await userService.getUserProfile(userId);
    if (!currentUser || currentUser.clinic_id !== clinicId) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found in this clinic',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Prevent deleting the clinic admin
    if (currentUser.role === UserRole.CLINIC_ADMIN) {
      return res.status(400).json({
        error: {
          code: 'INVALID_OPERATION',
          message: 'Cannot delete clinic administrator',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    await userService.deleteUser(userId, req.user.uid);

    return res.status(200).json({
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'User not found';
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * POST /clinics/:id/invoices
 * Create invoice for clinic
 */
router.post('/:id/invoices', validatePermissions(['create_invoice']), async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createInvoiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    // Ensure user can only create invoices for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot create invoices for other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Validate invoice products first
    const validation = await InvoiceService.validateInvoiceProducts(value.products);
    
    const invoiceData = {
      ...value,
      created_by: req.user.uid
    };

    const invoice = await InvoiceService.createInvoice(clinicId, invoiceData);

    // Include validation info in response
    const response: any = {
      message: 'Invoice created successfully',
      invoice: {
        invoice_id: invoice.invoice_id,
        clinic_id: invoice.clinic_id,
        invoice_number: invoice.invoice_number,
        supplier: invoice.supplier,
        emission_date: invoice.emission_date,
        products: invoice.products,
        total_value: invoice.total_value,
        status: invoice.status,
        attachments: invoice.attachments,
        created_by: invoice.created_by,
        created_at: invoice.created_at
      }
    };

    if (validation.pendingProducts.length > 0) {
      response.warnings = {
        pending_products: validation.pendingProducts,
        message: 'Some products were not found and have been submitted for approval'
      };
    }

    return res.status(201).json(response);
  } catch (error: any) {
    console.error('Create invoice error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Product not found')) {
      statusCode = 400;
      errorCode = 'INVALID_PRODUCT';
      message = error.message;
    } else if (error.message.includes('Duplicate invoice number')) {
      statusCode = 409;
      errorCode = 'DUPLICATE_INVOICE';
      message = 'Invoice number already exists';
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id/invoices
 * List invoices for clinic
 */
router.get('/:id/invoices', validatePermissions(['read_invoice']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    // Ensure user can only access invoices for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot access invoices from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Parse query parameters for filtering
    const status = req.query.status as 'pending' | 'approved' | 'rejected' | undefined;
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;

    let invoices: Invoice[];

    if (status) {
      invoices = await InvoiceService.getInvoicesByStatus(clinicId, status);
    } else if (startDate && endDate) {
      invoices = await InvoiceService.getInvoicesByDateRange(clinicId, startDate, endDate);
    } else {
      invoices = await InvoiceService.listInvoices(clinicId);
    }

    return res.status(200).json({
      invoices: invoices.map(invoice => ({
        invoice_id: invoice.invoice_id,
        clinic_id: invoice.clinic_id,
        invoice_number: invoice.invoice_number,
        supplier: invoice.supplier,
        emission_date: invoice.emission_date,
        products: invoice.products,
        total_value: invoice.total_value,
        status: invoice.status,
        attachments: invoice.attachments,
        created_by: invoice.created_by,
        created_at: invoice.created_at
      }))
    });
  } catch (error: any) {
    console.error('List invoices error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list invoices',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id/invoices/:invoiceId
 * Get invoice details
 */
router.get('/:id/invoices/:invoiceId', validatePermissions(['read_invoice']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const invoiceId = req.params.invoiceId;

    // Ensure user can only access invoices for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot access invoices from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const invoice = await InvoiceService.getInvoice(clinicId, invoiceId);

    if (!invoice) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Invoice not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    return res.status(200).json({
      invoice: {
        invoice_id: invoice.invoice_id,
        clinic_id: invoice.clinic_id,
        invoice_number: invoice.invoice_number,
        supplier: invoice.supplier,
        emission_date: invoice.emission_date,
        products: invoice.products,
        total_value: invoice.total_value,
        status: invoice.status,
        attachments: invoice.attachments,
        created_by: invoice.created_by,
        created_at: invoice.created_at
      }
    });
  } catch (error: any) {
    console.error('Get invoice error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get invoice',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * PUT /clinics/:id/invoices/:invoiceId
 * Update invoice
 */
router.put('/:id/invoices/:invoiceId', validatePermissions(['update_invoice']), async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = updateInvoiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const invoiceId = req.params.invoiceId;

    // Ensure user can only update invoices for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot update invoices from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Check if invoice exists
    const existingInvoice = await InvoiceService.getInvoice(clinicId, invoiceId);
    if (!existingInvoice) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Invoice not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const updatedInvoice = await InvoiceService.updateInvoice(clinicId, invoiceId, value);

    return res.status(200).json({
      message: 'Invoice updated successfully',
      invoice: {
        invoice_id: updatedInvoice.invoice_id,
        clinic_id: updatedInvoice.clinic_id,
        invoice_number: updatedInvoice.invoice_number,
        supplier: updatedInvoice.supplier,
        emission_date: updatedInvoice.emission_date,
        products: updatedInvoice.products,
        total_value: updatedInvoice.total_value,
        status: updatedInvoice.status,
        attachments: updatedInvoice.attachments,
        created_by: updatedInvoice.created_by,
        created_at: updatedInvoice.created_at
      }
    });
  } catch (error: any) {
    console.error('Update invoice error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Product not found')) {
      statusCode = 400;
      errorCode = 'INVALID_PRODUCT';
      message = error.message;
    } else if (error.message.includes('Duplicate invoice number')) {
      statusCode = 409;
      errorCode = 'DUPLICATE_INVOICE';
      message = 'Invoice number already exists';
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * PUT /clinics/:id/invoices/:invoiceId/status
 * Update invoice status (approve/reject)
 */
router.put('/:id/invoices/:invoiceId/status', validatePermissions(['update_invoice']), async (req: Request, res: Response) => {
  try {
    const statusSchema = Joi.object({
      status: Joi.string().valid('approved', 'rejected').required()
    });

    const { error, value } = statusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const invoiceId = req.params.invoiceId;

    // Ensure user can only update invoices for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot update invoices from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    await InvoiceService.updateInvoiceStatus(clinicId, invoiceId, value.status);

    const message = value.status === 'approved' 
      ? 'Invoice approved and inventory updated successfully'
      : 'Invoice rejected successfully';

    return res.status(200).json({
      message,
      status: value.status
    });
  } catch (error: any) {
    console.error('Update invoice status error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Invoice not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'Invoice not found';
    } else if (error.message.includes('Failed to update inventory')) {
      statusCode = 400;
      errorCode = 'INVENTORY_UPDATE_FAILED';
      message = error.message;
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * DELETE /clinics/:id/invoices/:invoiceId
 * Delete invoice
 */
router.delete('/:id/invoices/:invoiceId', validatePermissions(['delete_invoice']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const invoiceId = req.params.invoiceId;

    // Ensure user can only delete invoices for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot delete invoices from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Check if invoice exists
    const existingInvoice = await InvoiceService.getInvoice(clinicId, invoiceId);
    if (!existingInvoice) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Invoice not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    await InvoiceService.deleteInvoice(clinicId, invoiceId);

    return res.status(200).json({
      message: 'Invoice deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete invoice error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Cannot delete approved invoice')) {
      statusCode = 400;
      errorCode = 'INVALID_OPERATION';
      message = error.message;
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * POST /clinics/:id/patients
 * Create patient for clinic
 */
router.post('/:id/patients', validatePermissions(['create_patient']), async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createPatientSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    // Ensure user can only create patients for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot create patients for other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Check for duplicate email or phone
    const existingPatientByEmail = await PatientService.getPatientByEmail(clinicId, value.email);
    if (existingPatientByEmail) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_EMAIL',
          message: 'Patient with this email already exists',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const existingPatientByPhone = await PatientService.getPatientByPhone(clinicId, value.phone);
    if (existingPatientByPhone) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_PHONE',
          message: 'Patient with this phone number already exists',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const patient = await PatientService.createPatient(clinicId, value);

    return res.status(201).json({
      message: 'Patient created successfully',
      patient: {
        patient_id: patient.patient_id,
        clinic_id: patient.clinic_id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        birth_date: patient.birth_date,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        medical_history: patient.medical_history,
        treatment_history: patient.treatment_history,
        created_at: patient.created_at,
        updated_at: patient.updated_at
      }
    });
  } catch (error: any) {
    console.error('Create patient error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id/patients
 * List patients for clinic with optional search
 */
router.get('/:id/patients', validatePermissions(['read_patient']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    // Ensure user can only access patients for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot access patients from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Parse query parameters for search
    const searchTerm = req.query.search as string;

    let patients: Patient[];

    if (searchTerm) {
      patients = await PatientService.searchPatientsByName(clinicId, searchTerm);
    } else {
      patients = await PatientService.listPatients(clinicId);
    }

    return res.status(200).json({
      patients: patients.map(patient => ({
        patient_id: patient.patient_id,
        clinic_id: patient.clinic_id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        birth_date: patient.birth_date,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        medical_history: patient.medical_history,
        treatment_history: patient.treatment_history,
        created_at: patient.created_at,
        updated_at: patient.updated_at
      }))
    });
  } catch (error: any) {
    console.error('List patients error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list patients',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id/patients/:patientId
 * Get patient details
 */
router.get('/:id/patients/:patientId', validatePermissions(['read_patient']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const patientId = req.params.patientId;

    // Ensure user can only access patients for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot access patients from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const patient = await PatientService.getPatient(clinicId, patientId);

    if (!patient) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Patient not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    return res.status(200).json({
      patient: {
        patient_id: patient.patient_id,
        clinic_id: patient.clinic_id,
        first_name: patient.first_name,
        last_name: patient.last_name,
        birth_date: patient.birth_date,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        medical_history: patient.medical_history,
        treatment_history: patient.treatment_history,
        created_at: patient.created_at,
        updated_at: patient.updated_at
      }
    });
  } catch (error: any) {
    console.error('Get patient error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get patient',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * PUT /clinics/:id/patients/:patientId
 * Update patient information
 */
router.put('/:id/patients/:patientId', validatePermissions(['update_patient']), async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = updatePatientSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const patientId = req.params.patientId;

    // Ensure user can only update patients for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot update patients from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Check if patient exists
    const existingPatient = await PatientService.getPatient(clinicId, patientId);
    if (!existingPatient) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Patient not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Check for duplicate email or phone if they are being updated
    if (value.email && value.email !== existingPatient.email) {
      const existingPatientByEmail = await PatientService.getPatientByEmail(clinicId, value.email);
      if (existingPatientByEmail) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_EMAIL',
            message: 'Patient with this email already exists',
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id']
          }
        });
      }
    }

    if (value.phone && value.phone !== existingPatient.phone) {
      const existingPatientByPhone = await PatientService.getPatientByPhone(clinicId, value.phone);
      if (existingPatientByPhone) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_PHONE',
            message: 'Patient with this phone number already exists',
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id']
          }
        });
      }
    }

    await PatientService.updatePatient(clinicId, patientId, value);

    // Get updated patient
    const updatedPatient = await PatientService.getPatient(clinicId, patientId);

    return res.status(200).json({
      message: 'Patient updated successfully',
      patient: {
        patient_id: updatedPatient!.patient_id,
        clinic_id: updatedPatient!.clinic_id,
        first_name: updatedPatient!.first_name,
        last_name: updatedPatient!.last_name,
        birth_date: updatedPatient!.birth_date,
        phone: updatedPatient!.phone,
        email: updatedPatient!.email,
        address: updatedPatient!.address,
        medical_history: updatedPatient!.medical_history,
        treatment_history: updatedPatient!.treatment_history,
        created_at: updatedPatient!.created_at,
        updated_at: updatedPatient!.updated_at
      }
    });
  } catch (error: any) {
    console.error('Update patient error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * POST /clinics/:id/patients/:patientId/medical-history
 * Add medical history entry to patient
 */
router.post('/:id/patients/:patientId/medical-history', validatePermissions(['update_patient']), async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = medicalEntrySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const patientId = req.params.patientId;

    // Ensure user can only update patients for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot update patients from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    await PatientService.addMedicalEntry(clinicId, patientId, value, req.user.uid);

    return res.status(201).json({
      message: 'Medical history entry added successfully'
    });
  } catch (error: any) {
    console.error('Add medical history error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Patient not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'Patient not found';
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id/patients/:patientId/treatment-history
 * Get patient treatment history with request details
 */
router.get('/:id/patients/:patientId/treatment-history', validatePermissions(['read_patient']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const patientId = req.params.patientId;

    // Ensure user can only access patients for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot access patients from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const treatmentHistory = await PatientService.getPatientTreatmentHistory(clinicId, patientId);

    return res.status(200).json({
      treatment_history: treatmentHistory
    });
  } catch (error: any) {
    console.error('Get treatment history error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Patient not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'Patient not found';
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id/patients/:patientId/timeline
 * Get patient treatment timeline with medical history and treatments
 */
router.get('/:id/patients/:patientId/timeline', validatePermissions(['read_patient']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const patientId = req.params.patientId;

    // Ensure user can only access patients for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot access patients from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const timeline = await PatientService.getPatientTreatmentTimeline(clinicId, patientId);

    return res.status(200).json({
      timeline
    });
  } catch (error: any) {
    console.error('Get patient timeline error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Patient not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'Patient not found';
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id/patients/:patientId/statistics
 * Get patient treatment statistics
 */
router.get('/:id/patients/:patientId/statistics', validatePermissions(['read_patient']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const patientId = req.params.patientId;

    // Ensure user can only access patients for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot access patients from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const statistics = await PatientService.getPatientStatistics(clinicId, patientId);

    return res.status(200).json({
      statistics
    });
  } catch (error: any) {
    console.error('Get patient statistics error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Patient not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'Patient not found';
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

// ===== REQUEST ROUTES =====

const productUsageSchema = Joi.object({
  product_id: Joi.string().required(),
  quantity: Joi.number().positive().required(),
  lot: Joi.string().required(),
  expiration_date: Joi.date().required()
});

const createRequestSchema = Joi.object({
  patient_id: Joi.string().required(),
  request_date: Joi.date().required(),
  treatment_type: Joi.string().min(2).max(100).required(),
  products_used: Joi.array().items(productUsageSchema).min(1).required(),
  notes: Joi.string().max(1000).default(''),
  performed_by: Joi.string().required()
});

const updateRequestSchema = Joi.object({
  request_date: Joi.date().optional(),
  treatment_type: Joi.string().min(2).max(100).optional(),
  products_used: Joi.array().items(productUsageSchema).min(1).optional(),
  notes: Joi.string().max(1000).optional(),
  performed_by: Joi.string().optional()
});

/**
 * POST /clinics/:id/requests
 * Create treatment request for clinic
 */
router.post('/:id/requests', validatePermissions(['create_request']), async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = createRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    // Ensure user can only create requests for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot create requests for other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Verify patient exists in this clinic
    const patient = await PatientService.getPatient(clinicId, value.patient_id);
    if (!patient) {
      return res.status(404).json({
        error: {
          code: 'PATIENT_NOT_FOUND',
          message: 'Patient not found in this clinic',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Validate inventory availability (warning only, doesn't prevent creation)
    const inventoryValidation = await RequestService.validateRequestInventory(clinicId, value.products_used);

    const request = await RequestService.createRequest(clinicId, value);

    const response: any = {
      message: 'Treatment request created successfully',
      request: {
        request_id: request.request_id,
        clinic_id: request.clinic_id,
        patient_id: request.patient_id,
        request_date: request.request_date,
        treatment_type: request.treatment_type,
        products_used: request.products_used,
        status: request.status,
        notes: request.notes,
        performed_by: request.performed_by,
        created_at: request.created_at
      }
    };

    // Add inventory warnings if there are issues
    if (!inventoryValidation.valid) {
      response.warnings = {
        inventory_issues: inventoryValidation.issues,
        message: 'Request created but inventory issues detected. Review before consumption.'
      };
    }

    return res.status(201).json(response);
  } catch (error: any) {
    console.error('Create request error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id/requests
 * List treatment requests for clinic with optional filtering
 */
router.get('/:id/requests', validatePermissions(['read_request']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    // Ensure user can only access requests for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot access requests from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Parse query parameters for filtering
    const status = req.query.status as 'pending' | 'consumed' | 'cancelled' | undefined;
    const patientId = req.query.patient_id as string | undefined;
    const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
    const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;

    let requests: TreatmentRequest[];

    if (status) {
      requests = await RequestService.getRequestsByStatus(clinicId, status);
    } else if (patientId) {
      requests = await RequestService.getRequestsByPatient(clinicId, patientId);
    } else if (startDate && endDate) {
      requests = await RequestService.getRequestsByDateRange(clinicId, startDate, endDate);
    } else {
      requests = await RequestService.listRequests(clinicId);
    }

    return res.status(200).json({
      requests: requests.map(request => ({
        request_id: request.request_id,
        clinic_id: request.clinic_id,
        patient_id: request.patient_id,
        request_date: request.request_date,
        treatment_type: request.treatment_type,
        products_used: request.products_used,
        status: request.status,
        notes: request.notes,
        performed_by: request.performed_by,
        created_at: request.created_at
      }))
    });
  } catch (error: any) {
    console.error('List requests error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list requests',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id/requests/:requestId
 * Get treatment request details
 */
router.get('/:id/requests/:requestId', validatePermissions(['read_request']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const requestId = req.params.requestId;

    // Ensure user can only access requests for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot access requests from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const request = await RequestService.getRequest(clinicId, requestId);

    if (!request) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Treatment request not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    return res.status(200).json({
      request: {
        request_id: request.request_id,
        clinic_id: request.clinic_id,
        patient_id: request.patient_id,
        request_date: request.request_date,
        treatment_type: request.treatment_type,
        products_used: request.products_used,
        status: request.status,
        notes: request.notes,
        performed_by: request.performed_by,
        created_at: request.created_at
      }
    });
  } catch (error: any) {
    console.error('Get request error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get request',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * PUT /clinics/:id/requests/:requestId
 * Update treatment request
 */
router.put('/:id/requests/:requestId', validatePermissions(['update_request']), async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = updateRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const requestId = req.params.requestId;

    // Ensure user can only update requests for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot update requests from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Check if request exists
    const existingRequest = await RequestService.getRequest(clinicId, requestId);
    if (!existingRequest) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Treatment request not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Only allow updates to pending requests
    if (existingRequest.status !== 'pending') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Can only update pending requests',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Update the request using Firestore directly since we need partial updates
    const requestRef = FirestoreService.getRequestsCollection(clinicId).doc(requestId);
    await requestRef.update(value);

    // Get updated request
    const updatedRequest = await RequestService.getRequest(clinicId, requestId);

    return res.status(200).json({
      message: 'Treatment request updated successfully',
      request: {
        request_id: updatedRequest!.request_id,
        clinic_id: updatedRequest!.clinic_id,
        patient_id: updatedRequest!.patient_id,
        request_date: updatedRequest!.request_date,
        treatment_type: updatedRequest!.treatment_type,
        products_used: updatedRequest!.products_used,
        status: updatedRequest!.status,
        notes: updatedRequest!.notes,
        performed_by: updatedRequest!.performed_by,
        created_at: updatedRequest!.created_at
      }
    });
  } catch (error: any) {
    console.error('Update request error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * PUT /clinics/:id/requests/:requestId/consume
 * Accept and consume a treatment request (deduct from inventory)
 */
router.put('/:id/requests/:requestId/consume', validatePermissions(['update_request']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const requestId = req.params.requestId;

    // Ensure user can only consume requests for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot consume requests from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Get the request
    const request = await RequestService.getRequest(clinicId, requestId);
    if (!request) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Treatment request not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Only allow consuming pending requests
    if (request.status !== 'pending') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Can only consume pending requests',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Validate inventory availability
    const stockCheck = await InventoryService.checkStockAvailability(clinicId, request.products_used);
    if (!stockCheck.available) {
      return res.status(400).json({
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: 'Insufficient inventory to fulfill request',
          details: stockCheck.issues,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Consume the request (deduct from inventory and update status)
    await RequestService.consumeRequest(clinicId, requestId);

    return res.status(200).json({
      message: 'Treatment request consumed successfully and inventory updated'
    });
  } catch (error: any) {
    console.error('Consume request error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('Insufficient stock')) {
      statusCode = 400;
      errorCode = 'INSUFFICIENT_STOCK';
      message = error.message;
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = error.message;
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id/dashboard
 * Get dashboard data aggregation for clinic
 */
router.get('/:id/dashboard', validatePermissions(['read_dashboard']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    // Ensure user can only access dashboard for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot access dashboard from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Get dashboard data from inventory service
    const dashboardData = await InventoryService.getDashboardData(clinicId);
    
    // Get low stock items
    const lowStockItems = await InventoryService.getLowStockItems(clinicId);
    
    // Get expiring items (within 30 days)
    const expiringItems = await InventoryService.getExpiringItems(clinicId, 30);
    
    // Get recent activity (requests from last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentRequests = await RequestService.getRequestsByDateRange(
      clinicId, 
      sevenDaysAgo, 
      new Date()
    );

    // Get patient count
    const patients = await PatientService.listPatients(clinicId);
    
    // Prepare dashboard response
    const dashboard = {
      inventory_overview: {
        total_products: dashboardData.totalProducts,
        low_stock_count: dashboardData.lowStockCount,
        expiring_count: dashboardData.expiringCount,
        total_value: dashboardData.totalValue
      },
      alerts: {
        low_stock_items: lowStockItems.map(item => ({
          inventory_id: item.inventory_id,
          product_id: item.product_id,
          current_stock: item.quantity_in_stock,
          minimum_level: item.minimum_stock_level,
          last_update: item.last_update
        })),
        expiring_items: expiringItems.map(({ item, expiringEntries }) => ({
          inventory_id: item.inventory_id,
          product_id: item.product_id,
          expiring_lots: expiringEntries.map(entry => ({
            lot: entry.lot,
            quantity: entry.quantity,
            expiration_date: entry.date,
            days_until_expiration: Math.ceil((entry.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          }))
        }))
      },
      activity_summary: {
        total_patients: patients.length,
        recent_requests_count: recentRequests.length,
        recent_requests: recentRequests.slice(0, 10).map(request => ({
          request_id: request.request_id,
          patient_id: request.patient_id,
          treatment_type: request.treatment_type,
          status: request.status,
          request_date: request.request_date,
          created_at: request.created_at
        }))
      },
      last_updated: new Date().toISOString()
    };

    return res.status(200).json({
      dashboard
    });
  } catch (error: any) {
    console.error('Get dashboard error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get dashboard data',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id/notifications
 * Get real-time notifications for clinic
 */
router.get('/:id/notifications', validatePermissions(['read_dashboard']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    // Ensure user can only access notifications for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot access notifications from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const notifications = await DashboardService.getClinicNotifications(clinicId, limit);

    return res.status(200).json({
      notifications
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get notifications',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * PUT /clinics/:id/notifications/:notificationId/read
 * Mark notification as read
 */
router.put('/:id/notifications/:notificationId/read', validatePermissions(['read_dashboard']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const notificationId = req.params.notificationId;

    // Ensure user can only mark notifications for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot access notifications from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    await DashboardService.markNotificationAsRead(clinicId, notificationId);

    return res.status(200).json({
      message: 'Notification marked as read'
    });
  } catch (error: any) {
    console.error('Mark notification as read error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark notification as read',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * GET /clinics/:id/activity
 * Get recent activity for clinic dashboard
 */
router.get('/:id/activity', validatePermissions(['read_dashboard']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    // Ensure user can only access activity for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot access activity from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const activity = await DashboardService.getRecentActivity(clinicId, limit);

    return res.status(200).json({
      activity
    });
  } catch (error: any) {
    console.error('Get activity error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get activity',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * POST /clinics/:id/alerts/check
 * Manually trigger alert checking for low stock and expiring products
 */
router.post('/:id/alerts/check', validatePermissions(['read_dashboard']), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;

    // Ensure user can only trigger alerts for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot trigger alerts for other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    await DashboardService.checkAndCreateAlerts(clinicId);

    return res.status(200).json({
      message: 'Alert check completed successfully'
    });
  } catch (error: any) {
    console.error('Check alerts error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check alerts',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * PUT /clinics/:id/requests/:requestId/cancel
 * Cancel a treatment request
 */
router.put('/:id/requests/:requestId/cancel', validatePermissions(['update_request']), async (req: Request, res: Response) => {
  try {
    const cancelSchema = Joi.object({
      reason: Joi.string().max(500).optional()
    });

    const { error, value } = cancelSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    const clinicId = req.params.id;
    const requestId = req.params.requestId;

    // Ensure user can only cancel requests for their own clinic
    if (req.user.role !== UserRole.SYSTEM_ADMIN && req.user.clinic_id !== clinicId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot cancel requests from other clinics',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    await RequestService.cancelRequest(clinicId, requestId, value.reason);

    return res.status(200).json({
      message: 'Treatment request cancelled successfully'
    });
  } catch (error: any) {
    console.error('Cancel request error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'Treatment request not found';
    } else if (error.message.includes('Can only cancel pending requests')) {
      statusCode = 400;
      errorCode = 'INVALID_STATUS';
      message = error.message;
    }

    return res.status(statusCode).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

export default router;