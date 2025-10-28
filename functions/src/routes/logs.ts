import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateSystemAdmin } from '../middleware/permissions';
import { FirestoreService } from '../services/firestoreService';
import AuditService from '../services/auditService';
import { UserRole } from '../config/auth';

const router = Router();

/**
 * GET /logs
 * Retrieve audit logs with filtering capabilities
 * System admins can access all logs, clinic admins can access their clinic's logs
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      clinic_id,
      user_id,
      action_type,
      resource_type,
      start_date,
      end_date,
      limit = '100',
      offset = '0'
    } = req.query;

    // Validate permissions
    if (req.user?.role !== UserRole.SYSTEM_ADMIN) {
      // Non-system admins can only access their own clinic's logs
      if (clinic_id && clinic_id !== req.user?.clinic_id) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to logs from other clinics',
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }
    }

    // Build filters
    const filters: any = {};
    
    // System admins can filter by any clinic, others are restricted to their clinic
    if (req.user?.role === UserRole.SYSTEM_ADMIN) {
      if (clinic_id) {
        filters.clinicId = clinic_id as string;
      }
    } else {
      // Non-system admins are restricted to their clinic
      filters.clinicId = req.user?.clinic_id;
    }

    if (user_id) {
      filters.userId = user_id as string;
    }

    if (action_type) {
      filters.actionType = action_type as string;
    }

    if (resource_type) {
      filters.resourceType = resource_type as string;
    }

    if (start_date) {
      filters.startDate = new Date(start_date as string);
    }

    if (end_date) {
      filters.endDate = new Date(end_date as string);
    }

    if (limit) {
      filters.limit = parseInt(limit as string, 10);
    }

    if (offset) {
      filters.offset = parseInt(offset as string, 10);
    }

    // Get logs from Firestore with enhanced filtering
    const logs = await FirestoreService.listAuditLogs(filters);
    
    // Get total count for pagination
    const totalCount = await FirestoreService.countAuditLogs({
      clinicId: filters.clinicId,
      userId: filters.userId,
      actionType: filters.actionType,
      resourceType: filters.resourceType,
      startDate: filters.startDate,
      endDate: filters.endDate
    });

    const offsetNum = parseInt(offset as string, 10);
    const limitNum = parseInt(limit as string, 10);

    // Log this query operation
    await AuditService.logCRUDOperation(req, 'read', 'logs', 'query', {
      metadata: {
        filters: req.query,
        result_count: logs.length,
        total_count: totalCount
      }
    });

    res.json({
      logs: logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toDate().toISOString()
      })),
      pagination: {
        offset: offsetNum,
        limit: limitNum,
        total: totalCount,
        has_more: offsetNum + limitNum < totalCount
      }
    });

  } catch (error) {
    console.error('Error retrieving logs:', error);
    
    // Log the error
    await AuditService.logError(req, error as Error, 'logs_retrieval');

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve logs',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * GET /logs/:log_id
 * Retrieve a specific audit log by ID
 */
router.get('/:log_id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { log_id } = req.params;

    // Get the log
    const log = await FirestoreService.getAuditLogById(log_id);
    
    if (!log) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Log entry not found',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }
    
    // Validate permissions - users can only access logs from their clinic
    if (req.user?.role !== UserRole.SYSTEM_ADMIN) {
      if (log.clinic_id && log.clinic_id !== req.user?.clinic_id) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this log entry',
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }
    }

    // Log this access
    await AuditService.logCRUDOperation(req, 'read', 'logs', log_id, {
      metadata: {
        accessed_log_type: log.action_type,
        accessed_resource: log.resource_type
      }
    });

    res.json({
      ...log,
      timestamp: log.timestamp.toDate().toISOString()
    });

  } catch (error) {
    console.error('Error retrieving log:', error);
    
    await AuditService.logError(req, error as Error, 'log_detail_retrieval');

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve log',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * GET /logs/stats/summary
 * Get log statistics and summary
 * System admin only
 */
router.get('/stats/summary', authenticateToken, validateSystemAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      clinic_id,
      start_date,
      end_date 
    } = req.query;

    // Build filters
    const filters: any = {};
    if (clinic_id) {
      filters.clinicId = clinic_id as string;
    }

    // Get logs
    let logs = await FirestoreService.listAuditLogs(filters);

    // Apply date filtering
    if (start_date) {
      const startTimestamp = new Date(start_date as string);
      logs = logs.filter(log => log.timestamp.toDate() >= startTimestamp);
    }

    if (end_date) {
      const endTimestamp = new Date(end_date as string);
      logs = logs.filter(log => log.timestamp.toDate() <= endTimestamp);
    }

    // Calculate statistics
    const stats = {
      total_logs: logs.length,
      action_types: {} as Record<string, number>,
      resource_types: {} as Record<string, number>,
      users: {} as Record<string, number>,
      clinics: {} as Record<string, number>,
      date_range: {
        start: start_date || null,
        end: end_date || null,
        oldest_log: logs.length > 0 ? Math.min(...logs.map(log => log.timestamp.toDate().getTime())) : null,
        newest_log: logs.length > 0 ? Math.max(...logs.map(log => log.timestamp.toDate().getTime())) : null
      }
    };

    // Aggregate statistics
    logs.forEach(log => {
      // Action types
      stats.action_types[log.action_type] = (stats.action_types[log.action_type] || 0) + 1;
      
      // Resource types
      stats.resource_types[log.resource_type] = (stats.resource_types[log.resource_type] || 0) + 1;
      
      // Users
      stats.users[log.user_id] = (stats.users[log.user_id] || 0) + 1;
      
      // Clinics
      if (log.clinic_id) {
        stats.clinics[log.clinic_id] = (stats.clinics[log.clinic_id] || 0) + 1;
      }
    });

    // Convert timestamps to ISO strings
    if (stats.date_range.oldest_log) {
      stats.date_range.oldest_log = new Date(stats.date_range.oldest_log).toISOString() as any;
    }
    if (stats.date_range.newest_log) {
      stats.date_range.newest_log = new Date(stats.date_range.newest_log).toISOString() as any;
    }

    // Log this operation
    await AuditService.logCRUDOperation(req, 'read', 'logs', 'statistics', {
      metadata: {
        filters: req.query,
        stats_generated: true
      }
    });

    res.json(stats);

  } catch (error) {
    console.error('Error generating log statistics:', error);
    
    await AuditService.logError(req, error as Error, 'log_statistics');

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate log statistics',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * GET /logs/search
 * Advanced log search with multiple criteria
 */
router.get('/search', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      q, // General search query
      clinic_id,
      user_id,
      action_types, // Comma-separated list
      resource_types, // Comma-separated list
      start_date,
      end_date,
      ip_address,
      limit = '50',
      offset = '0'
    } = req.query;

    // Validate permissions
    if (req.user?.role !== UserRole.SYSTEM_ADMIN) {
      if (clinic_id && clinic_id !== req.user?.clinic_id) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to logs from other clinics',
            timestamp: new Date().toISOString(),
            request_id: req.headers['x-request-id'] || 'unknown'
          }
        });
        return;
      }
    }

    // Build base filters
    const filters: any = {
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10)
    };

    // Apply clinic restriction
    if (req.user?.role === UserRole.SYSTEM_ADMIN) {
      if (clinic_id) {
        filters.clinicId = clinic_id as string;
      }
    } else {
      filters.clinicId = req.user?.clinic_id;
    }

    if (user_id) {
      filters.userId = user_id as string;
    }

    if (start_date) {
      filters.startDate = new Date(start_date as string);
    }

    if (end_date) {
      filters.endDate = new Date(end_date as string);
    }

    // Get initial logs
    let logs = await FirestoreService.listAuditLogs(filters);

    // Apply advanced client-side filtering
    if (action_types) {
      const actionTypeList = (action_types as string).split(',').map(t => t.trim());
      logs = logs.filter(log => 
        actionTypeList.some(actionType => log.action_type.includes(actionType))
      );
    }

    if (resource_types) {
      const resourceTypeList = (resource_types as string).split(',').map(t => t.trim());
      logs = logs.filter(log => resourceTypeList.includes(log.resource_type));
    }

    if (ip_address) {
      logs = logs.filter(log => log.ip_address === ip_address);
    }

    // General search query (searches in action_type, resource_type, and details)
    if (q) {
      const searchQuery = (q as string).toLowerCase();
      logs = logs.filter(log => {
        const searchableText = [
          log.action_type,
          log.resource_type,
          log.resource_id,
          JSON.stringify(log.details)
        ].join(' ').toLowerCase();
        
        return searchableText.includes(searchQuery);
      });
    }

    // Log this search operation
    await AuditService.logCRUDOperation(req, 'read', 'logs', 'search', {
      metadata: {
        search_query: q,
        filters: req.query,
        result_count: logs.length
      }
    });

    res.json({
      logs: logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toDate().toISOString()
      })),
      search_metadata: {
        query: q,
        total_results: logs.length,
        filters_applied: Object.keys(req.query).length
      }
    });

  } catch (error) {
    console.error('Error searching logs:', error);
    
    await AuditService.logError(req, error as Error, 'log_search');

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search logs',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * GET /logs/export
 * Export logs to CSV format (system admin only)
 */
router.get('/export', authenticateToken, validateSystemAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      clinic_id,
      user_id,
      start_date,
      end_date,
      format = 'csv'
    } = req.query;

    if (format !== 'csv') {
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Only CSV format is currently supported',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    // Build filters
    const filters: any = { limit: 10000 }; // Large limit for export

    if (clinic_id) {
      filters.clinicId = clinic_id as string;
    }

    if (user_id) {
      filters.userId = user_id as string;
    }

    if (start_date) {
      filters.startDate = new Date(start_date as string);
    }

    if (end_date) {
      filters.endDate = new Date(end_date as string);
    }

    // Get logs
    const logs = await FirestoreService.listAuditLogs(filters);

    // Generate CSV content
    const csvHeaders = [
      'Log ID',
      'Timestamp',
      'User ID',
      'Clinic ID',
      'Action Type',
      'Resource Type',
      'Resource ID',
      'IP Address',
      'User Agent',
      'Details'
    ];

    const csvRows = logs.map(log => [
      log.log_id,
      log.timestamp.toDate().toISOString(),
      log.user_id,
      log.clinic_id || '',
      log.action_type,
      log.resource_type,
      log.resource_id,
      log.ip_address || '',
      log.user_agent || '',
      JSON.stringify(log.details).replace(/"/g, '""') // Escape quotes for CSV
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Log this export operation
    await AuditService.logSystemEvent('export', {
      exported_count: logs.length,
      filters: req.query,
      export_type: 'csv_export'
    });

    // Set response headers for file download
    const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting logs:', error);
    
    await AuditService.logError(req, error as Error, 'log_export');

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to export logs',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * DELETE /logs/cleanup
 * Clean up old logs (system admin only)
 * Removes logs older than specified date
 */
router.delete('/cleanup', authenticateToken, validateSystemAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { before_date, dry_run = 'false' } = req.query;

    if (!before_date) {
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'before_date parameter is required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    const beforeTimestamp = new Date(before_date as string);
    const isDryRun = dry_run === 'true';

    if (isDryRun) {
      // Count logs that would be deleted
      const count = await FirestoreService.countAuditLogs({
        endDate: beforeTimestamp
      });

      res.json({
        dry_run: true,
        logs_to_delete: count,
        before_date: beforeTimestamp.toISOString()
      });
    } else {
      // Actually delete the logs in batches
      let totalDeleted = 0;
      let batchDeleted = 0;
      
      do {
        batchDeleted = await FirestoreService.deleteAuditLogsBatch(beforeTimestamp, 500);
        totalDeleted += batchDeleted;
      } while (batchDeleted > 0);

      // Log this cleanup operation
      await AuditService.logSystemEvent('cleanup', {
        deleted_count: totalDeleted,
        before_date: beforeTimestamp.toISOString(),
        cleanup_type: 'batch'
      });

      res.json({
        deleted_count: totalDeleted,
        before_date: beforeTimestamp.toISOString(),
        batches_processed: Math.ceil(totalDeleted / 500)
      });
    }

  } catch (error) {
    console.error('Error cleaning up logs:', error);
    
    await AuditService.logError(req, error as Error, 'log_cleanup');

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to clean up logs',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

export default router;