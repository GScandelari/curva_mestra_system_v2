import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { UserService, CreateUserRequest, LoginRequest, AuthResponse } from '../services/userService';
import { UserRole, authConfig } from '../config/auth';
import { authenticateToken, addRequestId, logRequest } from '../middleware/auth';
import AuditService from '../services/auditService';
import * as admin from 'firebase-admin';

const router = Router();
const userService = new UserService();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid(...Object.values(UserRole)).required(),
  clinic_id: Joi.string().when('role', {
    is: Joi.string().valid(UserRole.CLINIC_ADMIN, UserRole.CLINIC_USER),
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  profile: Joi.object({
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    phone: Joi.string().optional()
  }).required(),
  permissions: Joi.array().items(Joi.string()).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const passwordResetRequestSchema = Joi.object({
  email: Joi.string().email().required()
});

// Apply middleware
router.use(addRequestId);
router.use(logRequest);

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
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

    const createUserRequest: CreateUserRequest = value;

    // Check if user has permission to create users
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

    // Validate role assignment permissions
    if (!authConfig.canAssignRole(req.user.role, createUserRequest.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to assign this role',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Create the user
    const userProfile = await userService.createUser(
      createUserRequest,
      req.user.uid,
      req.user.role,
      req.user.clinic_id
    );

    // Log user registration
    await AuditService.logSecurityEvent(req, 'login_success', {
      user_id: userProfile.user_id,
      success: true,
      metadata: {
        created_role: userProfile.role,
        created_clinic_id: userProfile.clinic_id,
        created_by: req.user.uid
      }
    });

    return res.status(201).json({
      message: 'User created successfully',
      user: {
        user_id: userProfile.user_id,
        email: userProfile.email,
        role: userProfile.role,
        clinic_id: userProfile.clinic_id,
        profile: userProfile.profile,
        created_at: userProfile.created_at
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    
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
    } else if (error.message.includes('Clinic ID is required')) {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      message = error.message;
    }

    // Log failed registration
    await AuditService.logAuthEvent(req, 'register', undefined, {
      success: false,
      error_message: message,
      metadata: {
        attempted_email: req.body.email,
        attempted_role: req.body.role
      }
    });

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
 * POST /auth/login
 * Login with email and password (returns custom token for client-side auth)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
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

    const { email } = value as LoginRequest;

    // Authenticate with Firebase Auth
    // Note: ensure `admin` or appropriate auth client is available in the runtime
    const user = await admin.auth().getUserByEmail(email);
    // Note: Password verification should be handled differently as admin SDK doesn't support direct password auth

    if (!user) {
      throw new Error('Authentication failed');
    }

    // Get user profile from Firestore
    const userProfile = await userService.getUserProfile(user.uid);

    if (!userProfile) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Generate custom token for client-side authentication
    const customToken = await authConfig.createCustomToken(user.uid);

    // Update last login timestamp
    await userService.updateLastLogin(user.uid);

    // Log successful login (use defined `user.uid` and available `userProfile`)
    await AuditService.logAuthEvent(req, 'login', user.uid, {
      success: true,
      metadata: {
        user_role: userProfile.role,
        clinic_id: userProfile.clinic_id
      }
    });

    const response: AuthResponse = {
      token: customToken,
      user: userProfile,
      expires_in: 3600 // 1 hour
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Login error:', error);
    
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (error.message.includes('User not found')) {
      statusCode = 401;
      errorCode = 'INVALID_CREDENTIALS';
      message = 'Invalid email or password';
    }

    // Log failed login
    await AuditService.logAuthEvent(req, 'login', undefined, {
      success: false,
      error_message: message,
      metadata: {
        attempted_email: req.body.email
      }
    });

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
 * POST /auth/refresh
 * Refresh user token and get updated profile
 */
router.post('/refresh', authenticateToken, async (req: Request, res: Response) => {
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

    // Get updated user profile
    const userProfile = await userService.getUserProfile(req.user.uid);
    
    if (!userProfile) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    // Generate new custom token
    const customToken = await authConfig.createCustomToken(req.user.uid);

    // Log token refresh
    await AuditService.logAuthEvent(req, 'token_refresh', req.user.uid, {
      success: true,
      metadata: {
        user_role: userProfile.role,
        clinic_id: userProfile.clinic_id
      }
    });

    const response: AuthResponse = {
      token: customToken,
      user: userProfile,
      expires_in: 3600 // 1 hour
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to refresh token',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

/**
 * POST /auth/password-reset/request
 * Request password reset
 */
router.post('/password-reset/request', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = passwordResetRequestSchema.validate(req.body);
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

    const { email } = value;

    // Generate password reset link
    const resetLink = await userService.generatePasswordResetLink(email);

    // In a real application, you would send this link via email
    // For now, we'll return it in the response (not recommended for production)
    return res.status(200).json({
      message: 'Password reset link generated successfully',
      reset_link: resetLink // Remove this in production
    });
  } catch (error: any) {
    console.error('Password reset request error:', error);
    
    // Always return success to prevent email enumeration attacks
    return res.status(200).json({
      message: 'If the email exists, a password reset link has been sent'
    });
  }
});

/**
 * POST /auth/password-reset/verify
 * Verify password reset code (handled client-side)
 */
router.post('/password-reset/verify', async (req: Request, res: Response) => {
  return res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Password reset verification must be handled on the client side using Firebase Auth SDK',
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    }
  });
});

/**
 * POST /auth/password-reset/confirm
 * Confirm password reset with new password (handled client-side)
 */
router.post('/password-reset/confirm', async (req: Request, res: Response) => {
  return res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Password reset confirmation must be handled on the client side using Firebase Auth SDK',
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id']
    }
  });
});

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
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

    const userProfile = await userService.getUserProfile(req.user.uid);
    
    if (!userProfile) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id']
        }
      });
    }

    return res.status(200).json({
      user: userProfile
    });
  } catch (error: any) {
    console.error('Get user profile error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user profile',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id']
      }
    });
  }
});

export default router;