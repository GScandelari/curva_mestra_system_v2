import { Request } from 'express';
import { Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { AuditLog } from '../models/types';
import { FirestoreService } from './firestoreService';

/**
 * Service for handling audit logging and monitoring
 */
class AuditService {
  /**
   * Log user actions for audit trail
   */
  static async logUserAction(
    req: Request,
    action: string,
    resourceType: string,
    resourceId: string,
    details: any = {}
  ): Promise<void> {
    try {
      const log: AuditLog = {
        log_id: uuidv4(),
        user_id: req.user?.uid || 'anonymous',
        clinic_id: req.user?.clinic_id || null,
        action_type: action,
        resource_type: resourceType,
        resource_id: resourceId,
        timestamp: Timestamp.now(),
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        details: details,
        severity: 'info',
        status: 'success'
      };

      await FirestoreService.createAuditLog(log);
    } catch (error) {
      console.error('Failed to log user action:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log data changes for compliance
   */
  static async logDataChange(
    req: Request,
    operation: 'create' | 'update' | 'delete',
    collection: string,
    documentId: string,
    oldData?: any,
    newData?: any
  ): Promise<void> {
    try {
      const log: AuditLog = {
        log_id: uuidv4(),
        user_id: req.user?.uid || 'system',
        clinic_id: req.user?.clinic_id || null,
        action_type: `data_${operation}`,
        resource_type: collection,
        resource_id: documentId,
        timestamp: Timestamp.now(),
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        details: {
          operation,
          old_data: oldData,
          new_data: newData,
          changes: oldData && newData ? this.calculateChanges(oldData, newData) : null
        },
        severity: 'info',
        status: 'success'
      };

      await FirestoreService.createAuditLog(log);
    } catch (error) {
      console.error('Failed to log data change:', error);
    }
  }

  /**
   * Log security events
   */
  static async logSecurityEvent(
    req: Request,
    event: 'login_success' | 'login_failure' | 'logout' | 'permission_denied' | 'suspicious_activity',
    details: any = {}
  ): Promise<void> {
    try {
      const log: AuditLog = {
        log_id: uuidv4(),
        user_id: req.user?.uid || 'anonymous',
        clinic_id: req.user?.clinic_id || null,
        action_type: 'security_event',
        resource_type: 'authentication',
        resource_id: event,
        timestamp: Timestamp.now(),
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        details: details,
        severity: event.includes('failure') || event.includes('denied') || event.includes('suspicious') ? 'warning' : 'info',
        status: event.includes('failure') || event.includes('denied') ? 'error' : 'success'
      };

      await FirestoreService.createAuditLog(log);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Log authentication events
   */
  static async logAuthEvent(
    req: Request,
    event: 'login' | 'logout' | 'register' | 'token_refresh',
    userId?: string,
    details: any = {}
  ): Promise<void> {
    try {
      const log: AuditLog = {
        log_id: uuidv4(),
        user_id: userId || req.user?.uid || 'anonymous',
        clinic_id: req.user?.clinic_id || null,
        action_type: `auth_${event}`,
        resource_type: 'authentication',
        resource_id: event,
        timestamp: Timestamp.now(),
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        details: details,
        severity: 'info',
        status: 'success'
      };

      await FirestoreService.createAuditLog(log);
    } catch (error) {
      console.error('Failed to log auth event:', error);
    }
  }

  /**
   * Log CRUD operations
   */
  static async logCRUDOperation(
    req: Request,
    operation: 'create' | 'read' | 'update' | 'delete',
    resourceType: string,
    resourceId: string,
    details: any = {}
  ): Promise<void> {
    try {
      const log: AuditLog = {
        log_id: uuidv4(),
        user_id: req.user?.uid || 'anonymous',
        clinic_id: req.user?.clinic_id || null,
        action_type: `crud_${operation}`,
        resource_type: resourceType,
        resource_id: resourceId,
        timestamp: Timestamp.now(),
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        details: details,
        severity: 'info',
        status: 'success'
      };

      await FirestoreService.createAuditLog(log);
    } catch (error) {
      console.error('Failed to log CRUD operation:', error);
    }
  }

  /**
   * Log system events
   */
  static async logSystemEvent(
    event: 'startup' | 'shutdown' | 'health_check' | 'maintenance' | 'export' | 'cleanup',
    details: any = {}
  ): Promise<void> {
    try {
      const log: AuditLog = {
        log_id: uuidv4(),
        user_id: 'system',
        clinic_id: null,
        action_type: 'system_event',
        resource_type: 'system',
        resource_id: event,
        timestamp: Timestamp.now(),
        ip_address: undefined,
        user_agent: undefined,
        details: details,
        severity: 'info',
        status: 'success'
      };

      await FirestoreService.createAuditLog(log);
    } catch (error) {
      console.error('Failed to log system event:', error);
    }
  }

  /**
   * Log error events
   */
  static async logError(
    req: Request,
    error: Error,
    details: any = {}
  ): Promise<void> {
    try {
      const log: AuditLog = {
        log_id: uuidv4(),
        user_id: req.user?.uid || 'anonymous',
        clinic_id: req.user?.clinic_id || null,
        action_type: 'error',
        resource_type: 'api',
        resource_id: req.path,
        timestamp: Timestamp.now(),
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        details: {
          error_message: error.message,
          stack_trace: error.stack,
          request_method: req.method,
          request_path: req.path,
          request_body: req.body,
          ...details
        },
        severity: 'error',
        status: 'error'
      };

      await FirestoreService.createAuditLog(log);
    } catch (auditError) {
      console.error('Failed to log error:', auditError);
    }
  }

  /**
   * Calculate changes between old and new data
   */
  private static calculateChanges(oldData: any, newData: any): any {
    const changes: any = {};
    
    // Simple change detection
    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          from: oldData[key],
          to: newData[key]
        };
      }
    }

    return changes;
  }

  /**
   * Log clinic creation for audit trail
   */
  static async logClinicCreation(
    clinic: any,
    userId: string,
    req?: Request
  ): Promise<void> {
    try {
      const log: AuditLog = {
        log_id: uuidv4(),
        user_id: userId,
        clinic_id: null, // System-level operation
        action_type: 'clinic_created',
        resource_type: 'clinic',
        resource_id: clinic.clinic_id,
        timestamp: Timestamp.now(),
        ip_address: req?.ip || req?.connection.remoteAddress,
        user_agent: req?.get('User-Agent'),
        details: {
          clinic_id: clinic.clinic_id,
          clinic_name: clinic.name,
          clinic_cnpj: clinic.cnpj,
          clinic_email: clinic.email,
          clinic_city: clinic.city,
          admin_user_id: clinic.admin_user_id
        },
        severity: 'info',
        status: 'success'
      };

      await FirestoreService.createAuditLog(log);
    } catch (error) {
      console.error('Failed to log clinic creation:', error);
    }
  }

  /**
   * Log clinic update for audit trail
   */
  static async logClinicUpdate(
    clinicId: string,
    clinicName: string,
    changes: any,
    userId: string,
    req?: Request
  ): Promise<void> {
    try {
      const log: AuditLog = {
        log_id: uuidv4(),
        user_id: userId,
        clinic_id: null, // System-level operation
        action_type: 'clinic_updated',
        resource_type: 'clinic',
        resource_id: clinicId,
        timestamp: Timestamp.now(),
        ip_address: req?.ip || req?.connection.remoteAddress,
        user_agent: req?.get('User-Agent'),
        details: {
          clinic_id: clinicId,
          clinic_name: clinicName,
          changes: changes
        },
        severity: 'info',
        status: 'success'
      };

      await FirestoreService.createAuditLog(log);
    } catch (error) {
      console.error('Failed to log clinic update:', error);
    }
  }

  /**
   * Log clinic status change for audit trail
   */
  static async logClinicStatusChange(
    clinicId: string,
    clinicName: string,
    oldStatus: string,
    newStatus: string,
    userId: string,
    req?: Request
  ): Promise<void> {
    try {
      const log: AuditLog = {
        log_id: uuidv4(),
        user_id: userId,
        clinic_id: null, // System-level operation
        action_type: 'clinic_status_changed',
        resource_type: 'clinic',
        resource_id: clinicId,
        timestamp: Timestamp.now(),
        ip_address: req?.ip || req?.connection.remoteAddress,
        user_agent: req?.get('User-Agent'),
        details: {
          clinic_id: clinicId,
          clinic_name: clinicName,
          old_status: oldStatus,
          new_status: newStatus
        },
        severity: 'info',
        status: 'success'
      };

      await FirestoreService.createAuditLog(log);
    } catch (error) {
      console.error('Failed to log clinic status change:', error);
    }
  }

  /**
   * Get clinic audit logs with pagination
   */
  static async getClinicAuditLogs(
    clinicId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLog[]> {
    try {
      const filters = {
        resourceType: 'clinic',
        limit: limit + offset, // Get more records to account for filtering
        offset: 0 // Start from beginning since we'll filter and slice
      };

      // Get all clinic-related logs (both system-level and clinic-specific)
      let logs = await FirestoreService.listAuditLogs(filters);
      
      // Filter for this specific clinic
      logs = logs.filter(log => 
        log.resource_id === clinicId || 
        (log.details && log.details.clinic_id === clinicId)
      );

      // Apply pagination after filtering
      return logs.slice(offset, offset + limit);
    } catch (error) {
      console.error('Failed to get clinic audit logs:', error);
      throw new Error('Failed to retrieve audit logs');
    }
  }

  /**
   * Create audit middleware for Express
   */
  static auditMiddleware() {
    return (req: Request, res: any, next: any) => {
      // Log the request
      const startTime = Date.now();
      
      // Override res.json to capture response
      const originalJson = res.json;
      res.json = function(body: any) {
        const duration = Date.now() - startTime;
        
        // Log API call
        AuditService.logUserAction(
          req,
          'api_call',
          'endpoint',
          req.path,
          {
            method: req.method,
            duration_ms: duration,
            status_code: res.statusCode,
            response_size: JSON.stringify(body).length
          }
        ).catch(console.error);

        return originalJson.call(this, body);
      };

      // Store start time for response time calculation
      (req as any).startTime = Date.now();
      next();
    };
  }
}

export default AuditService;