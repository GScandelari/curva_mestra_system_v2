import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '../config/auth';
import FunctionMonitoring from '../services/monitoringService';
import FirestoreService from '../services/firestoreService';
import { logger } from 'firebase-functions';


const router = Router();
const monitoring = FunctionMonitoring.getInstance();

// Get system health metrics (system_admin only)
router.get('/system-metrics', 
  authenticateToken, 
  requireRole([UserRole.SYSTEM_ADMIN]), 
  async (req, res) => {
    try {
      const metrics = await monitoring.getSystemHealthMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get system metrics', error);
      res.status(500).json({ 
        error: 'Failed to retrieve system metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Get performance metrics (system_admin only)
router.get('/performance-metrics', 
  authenticateToken, 
  requireRole([UserRole.SYSTEM_ADMIN]), 
  async (req, res) => {
    try {
      const { timeRange = '24h' } = req.query;
      
      // Calculate time range
      const now = new Date();
      let startTime: Date;
      
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
      }

      // Get API metrics from Firestore
      const metricsSnapshot = await FirestoreService.getDb()
        .collection('api_metrics')
        .where('timestamp', '>', startTime)
        .orderBy('timestamp', 'asc')
        .get();

      // Aggregate metrics by hour
      const hourlyMetrics: Record<string, {
        responseTime: number[];
        errorCount: number;
        requestCount: number;
        timestamp: string;
      }> = {};

      metricsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const timestamp = data.timestamp.toDate();
        const hourKey = new Date(timestamp.getFullYear(), timestamp.getMonth(), 
                                timestamp.getDate(), timestamp.getHours()).toISOString();

        if (!hourlyMetrics[hourKey]) {
          hourlyMetrics[hourKey] = {
            responseTime: [],
            errorCount: 0,
            requestCount: 0,
            timestamp: hourKey
          };
        }

        hourlyMetrics[hourKey].responseTime.push(data.response_time || 0);
        hourlyMetrics[hourKey].requestCount++;
        
        if (data.status_code >= 400) {
          hourlyMetrics[hourKey].errorCount++;
        }
      });

      // Calculate averages and error rates
      const performanceData = Object.values(hourlyMetrics).map(metrics => ({
        timestamp: new Date(metrics.timestamp).toLocaleTimeString(),
        responseTime: Math.round(
          metrics.responseTime.reduce((sum, time) => sum + time, 0) / metrics.responseTime.length
        ),
        errorRate: Math.round((metrics.errorCount / metrics.requestCount) * 100 * 100) / 100,
        requestCount: metrics.requestCount
      }));

      res.json(performanceData);
    } catch (error) {
      logger.error('Failed to get performance metrics', error);
      res.status(500).json({ 
        error: 'Failed to retrieve performance metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Get error logs (system_admin only)
router.get('/error-logs', 
  authenticateToken, 
  requireRole([UserRole.SYSTEM_ADMIN]), 
  async (req, res) => {
    try {
      const { limit = 50, severity = 'all' } = req.query;
      
      let query = FirestoreService.getDb()
        .collection('error_logs')
        .orderBy('timestamp', 'desc')
        .limit(Number(limit));

      if (severity !== 'all') {
        query = query.where('severity', '==', severity);
      }

      const errorLogsSnapshot = await query.get();
      
      // Group similar errors and count occurrences
      const errorGroups: Record<string, {
        id: string;
        timestamp: string;
        errorType: string;
        message: string;
        context: string;
        count: number;
        lastOccurrence: string;
      }> = {};

      errorLogsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const errorKey = `${data.error_name}-${data.context}`;
        
        if (!errorGroups[errorKey]) {
          errorGroups[errorKey] = {
            id: doc.id,
            timestamp: data.timestamp.toDate().toISOString(),
            errorType: data.error_name,
            message: data.error_message,
            context: data.context,
            count: 1,
            lastOccurrence: data.timestamp.toDate().toISOString()
          };
        } else {
          errorGroups[errorKey].count++;
          const currentTimestamp = data.timestamp.toDate().toISOString();
          if (currentTimestamp > errorGroups[errorKey].lastOccurrence) {
            errorGroups[errorKey].lastOccurrence = currentTimestamp;
          }
        }
      });

      const errorLogs = Object.values(errorGroups)
        .sort((a, b) => new Date(b.lastOccurrence).getTime() - new Date(a.lastOccurrence).getTime());

      res.json(errorLogs);
    } catch (error) {
      logger.error('Failed to get error logs', error);
      res.status(500).json({ 
        error: 'Failed to retrieve error logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Get function execution metrics (system_admin only)
router.get('/function-metrics', 
  authenticateToken, 
  requireRole([UserRole.SYSTEM_ADMIN]), 
  async (req, res) => {
    try {
      const { timeRange = '24h' } = req.query;
      
      const now = new Date();
      let startTime: Date;
      
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
      }

      const functionMetricsSnapshot = await FirestoreService.getDb()
        .collection('function_metrics')
        .where('timestamp', '>', startTime)
        .orderBy('timestamp', 'desc')
        .get();

      const functionStats: Record<string, {
        functionName: string;
        totalExecutions: number;
        successfulExecutions: number;
        avgExecutionTime: number;
        maxExecutionTime: number;
        minExecutionTime: number;
      }> = {};

      functionMetricsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const functionName = data.function_name;
        
        if (!functionStats[functionName]) {
          functionStats[functionName] = {
            functionName,
            totalExecutions: 0,
            successfulExecutions: 0,
            avgExecutionTime: 0,
            maxExecutionTime: 0,
            minExecutionTime: Infinity
          };
        }

        const stats = functionStats[functionName];
        stats.totalExecutions++;
        
        if (data.success) {
          stats.successfulExecutions++;
        }

        const executionTime = data.execution_time || 0;
        stats.maxExecutionTime = Math.max(stats.maxExecutionTime, executionTime);
        stats.minExecutionTime = Math.min(stats.minExecutionTime, executionTime);
        
        // Calculate running average
        stats.avgExecutionTime = (stats.avgExecutionTime * (stats.totalExecutions - 1) + executionTime) / stats.totalExecutions;
      });

      // Convert to array and calculate success rates
      const functionMetrics = Object.values(functionStats).map(stats => ({
        ...stats,
        successRate: Math.round((stats.successfulExecutions / stats.totalExecutions) * 100 * 100) / 100,
        avgExecutionTime: Math.round(stats.avgExecutionTime),
        minExecutionTime: stats.minExecutionTime === Infinity ? 0 : stats.minExecutionTime
      }));

      res.json(functionMetrics);
    } catch (error) {
      logger.error('Failed to get function metrics', error);
      res.status(500).json({ 
        error: 'Failed to retrieve function metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Track custom business event
router.post('/track-event', 
  authenticateToken, 
  async (req, res) => {
    try {
      const { eventType, eventData } = req.body;
      
      if (!eventType) {
        return res.status(400).json({ error: 'Event type is required' });
      }

      await monitoring.trackBusinessEvent(
        eventType,
        eventData || {},
        req.user?.uid,
        req.user?.clinic_id
      );

      return res.json({ success: true, message: 'Event tracked successfully' });
    } catch (error) {
      logger.error('Failed to track custom event', error);
      return res.status(500).json({ 
        error: 'Failed to track event',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;