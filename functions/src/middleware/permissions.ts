import { Request, Response, NextFunction } from 'express';
import { UserRole, Permission } from '../config/auth';

/**
 * Permission validation utilities
 */
export class PermissionValidator {
  /**
   * Check if user has specific permission
   */
  static hasPermission(userPermissions: Permission[], requiredPermission: Permission): boolean {
    return userPermissions.includes(requiredPermission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Check if user has all of the specified permissions
   */
  static hasAllPermissions(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }

  /**
   * Check if user can perform CRUD operations on a resource
   */
  static canPerformCRUD(
    userPermissions: Permission[],
    resource: 'patient' | 'invoice' | 'request',
    operation: 'create' | 'read' | 'update' | 'delete'
  ): boolean {
    const permission = `${operation}_${resource}` as Permission;
    return userPermissions.includes(permission);
  }

  /**
   * Check if user can access clinic-specific resources
   */
  static canAccessClinic(
    userRole: UserRole,
    userClinicId: string | undefined,
    targetClinicId: string
  ): boolean {
    // System admins can access any clinic
    if (userRole === UserRole.SYSTEM_ADMIN) {
      return true;
    }

    // Other users can only access their own clinic
    return userClinicId === targetClinicId;
  }

  /**
   * Check if user can manage other users
   */
  static canManageUsers(
    userRole: UserRole,
    userPermissions: Permission[],
    targetUserRole?: UserRole,
    userClinicId?: string,
    targetUserClinicId?: string
  ): boolean {
    // Must have manage_users permission
    if (!userPermissions.includes('manage_users')) {
      return false;
    }

    // System admins can manage any user
    if (userRole === UserRole.SYSTEM_ADMIN) {
      return true;
    }

    // Clinic admins can manage users in their clinic (except system admins)
    if (userRole === UserRole.CLINIC_ADMIN) {
      if (targetUserRole === UserRole.SYSTEM_ADMIN) {
        return false;
      }
      return userClinicId === targetUserClinicId;
    }

    // Clinic users cannot manage other users
    return false;
  }

  /**
   * Get resource-specific permissions for a user
   */
  static getResourcePermissions(
    userPermissions: Permission[],
    resource: 'patient' | 'invoice' | 'request' | 'inventory' | 'dashboard'
  ): {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  } {
    if (resource === 'inventory' || resource === 'dashboard') {
      return {
        create: false,
        read: userPermissions.includes(`read_${resource}` as Permission),
        update: false,
        delete: false
      };
    }

    return {
      create: userPermissions.includes(`create_${resource}` as Permission),
      read: userPermissions.includes(`read_${resource}` as Permission),
      update: userPermissions.includes(`update_${resource}` as Permission),
      delete: userPermissions.includes(`delete_${resource}` as Permission)
    };
  }
}

/**
 * Middleware to validate specific permissions
 */
export const validatePermissions = (requiredPermissions: Permission[]) => {
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

    const hasPermission = PermissionValidator.hasAllPermissions(
      req.user.permissions,
      requiredPermissions
    );

    if (!hasPermission) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Missing required permissions: ${requiredPermissions.join(', ')}`,
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
 * Middleware to validate CRUD permissions for a resource
 */
export const validateCRUDPermission = (
  resource: 'patient' | 'invoice' | 'request',
  operation: 'create' | 'read' | 'update' | 'delete'
) => {
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

    const canPerform = PermissionValidator.canPerformCRUD(
      req.user.permissions,
      resource,
      operation
    );

    if (!canPerform) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Insufficient permissions to ${operation} ${resource}`,
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
 * Middleware to validate clinic access
 */
export const validateClinicAccess = (req: Request, res: Response, next: NextFunction): void => {
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

  // Extract clinic_id from URL parameters or request body
  const targetClinicId = req.params.clinic_id || req.body.clinic_id;

  if (!targetClinicId) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Clinic ID is required',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
    return;
  }

  const canAccess = PermissionValidator.canAccessClinic(
    req.user.role,
    req.user.clinic_id,
    targetClinicId
  );

  if (!canAccess) {
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
 * Middleware to validate user management permissions
 */
export const validateUserManagement = (req: Request, res: Response, next: NextFunction): void => {
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

  // For user creation, check the role being assigned
  const targetRole = req.body.role as UserRole;
  const targetClinicId = req.body.clinic_id;

  const canManage = PermissionValidator.canManageUsers(
    req.user.role,
    req.user.permissions,
    targetRole,
    req.user.clinic_id,
    targetClinicId
  );

  if (!canManage) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to manage users',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
    return;
  }

  next();
};

/**
 * Middleware to validate read-only access to inventory and dashboard
 */
export const validateReadOnlyAccess = (resource: 'inventory' | 'dashboard') => {
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

    const permission = `read_${resource}` as Permission;
    const hasPermission = PermissionValidator.hasPermission(req.user.permissions, permission);

    if (!hasPermission) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Insufficient permissions to access ${resource}`,
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
 * Middleware to validate system admin access
 */
export const validateSystemAdmin = (req: Request, res: Response, next: NextFunction): void => {
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

  if (req.user.role !== UserRole.SYSTEM_ADMIN) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'System administrator access required',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
    return;
  }

  next();
};

/**
 * Middleware to validate clinic admin access
 */
export const validateClinicAdmin = (req: Request, res: Response, next: NextFunction): void => {
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

  if (req.user.role !== UserRole.CLINIC_ADMIN && req.user.role !== UserRole.SYSTEM_ADMIN) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Clinic administrator access required',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
    return;
  }

  next();
};

/**
 * Utility function to check permissions in route handlers
 */
export const checkPermissions = {
  hasPermission: PermissionValidator.hasPermission,
  hasAnyPermission: PermissionValidator.hasAnyPermission,
  hasAllPermissions: PermissionValidator.hasAllPermissions,
  canPerformCRUD: PermissionValidator.canPerformCRUD,
  canAccessClinic: PermissionValidator.canAccessClinic,
  canManageUsers: PermissionValidator.canManageUsers,
  getResourcePermissions: PermissionValidator.getResourcePermissions
};