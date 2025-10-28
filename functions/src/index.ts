import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import notificationRoutes from './routes/notifications';
import clinicRoutes from './routes/clinics';
import logRoutes from './routes/logs';
import monitoringRoutes from './routes/monitoring';

// Import middleware
import { addRequestId, logRequest } from './middleware/auth';
import AuditService from './services/auditService';
import { monitoringMiddleware } from './services/monitoringService';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Express app
const app = express();

// Global middleware
app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(addRequestId);
app.use(logRequest);
app.use(monitoringMiddleware);
app.use(AuditService.auditMiddleware());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/clinics', clinicRoutes);
app.use('/api/v1/logs', logRoutes);
app.use('/api/v1/monitoring', monitoringRoutes);

// Catch-all for unimplemented endpoints
app.use('/api/v1/*', (req, res) => {
  res.status(404).json({ 
    error: { 
      code: 'NOT_FOUND', 
      message: 'API endpoint not implemented yet',
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'unknown'
    } 
  });
});

// Error handling middleware
app.use(async (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', error);
  
  // Log the error to audit system
  try {
    await AuditService.logError(req, error, {
      status_code: error.statusCode || 500,
      error_code: error.code || 'INTERNAL_ERROR'
    });
  } catch (auditError) {
    console.error('Failed to log error to audit system:', auditError);
  }
  
  const statusCode = error.statusCode || 500;
  const errorResponse = {
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'unknown'
    }
  };

  res.status(statusCode).json(errorResponse);
});

// Export the Express app as a Firebase Function
export const api = functions.region('us-central1').https.onRequest(app);

// Export scheduled functions
export { 
  updateDashboardMetrics, 
  cleanupOldNotifications, 
  checkExpiringProducts 
} from './scheduled/dashboardUpdates';

// Firebase Admin is initialized above and available for all services