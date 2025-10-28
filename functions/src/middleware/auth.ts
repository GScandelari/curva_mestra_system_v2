import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { UserRole, Permission, CustomClaims, authConfig } from '../config/auth';

// Extend Express Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        role: UserRole;
        clinic_id?: string;
        permissions: Permission[];
      };
    }
  }
}

/**
 * Authentication middleware to verify Firebase ID tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing ID token',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    // Verify the ID token
    const decodedToken = await authConfig.verifyIdToken(idToken);
    
    // Extract custom claims
    const customClaims = decodedToken as CustomClaims & admin.auth.DecodedIdToken;
    
    // Attach user information to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role: customClaims.role || UserRole.CLINIC_USER,
      clinic_id: customClaims.clinic_id,
      permissions: customClaims.permissions || []
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
};

/**
 * Authorization middleware to check user roles
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient role permissions',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    next();
  };
};

/**
 * Authorization middleware to check specific permissions
 */
export const requirePermission = (requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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

    const hasPermission = requiredPermissions.every(permission =>
      req.user!.permissions.includes(permission)
    );

    if (!hasPermission) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to validate clinic isolation
 */
export const requireClinicAccess = (req: Request, res: Response, next: NextFunction): void => {
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

  // System admins can access any clinic
  if (req.user.role === UserRole.SYSTEM_ADMIN) {
    next();
    return;
  }

  // Extract clinic_id from URL parameters
  const requestedClinicId = req.params.clinic_id;
  
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

  // Check if user belongs to the requested clinic
  if (req.user.clinic_id !== requestedClinicId) {
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
 * Middleware to add request ID for tracking
 */
export const addRequestId = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
};

/**
 * Middleware to log API requests
 */
export const logRequest = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    user_id: req.user?.uid,
    clinic_id: req.user?.clinic_id,
    request_id: req.headers['x-request-id'],
    ip: req.ip,
    user_agent: req.headers['user-agent']
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
      user_id: req.user?.uid,
      clinic_id: req.user?.clinic_id,
      request_id: req.headers['x-request-id'],
      status_code: res.statusCode,
      duration_ms: duration
    });
  });

  next();
};