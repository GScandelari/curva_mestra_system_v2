import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import NotificationService from '../services/notificationService';

const router = Router();

/**
 * GET /notifications
 * Get notifications for the authenticated user
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const limit = parseInt(req.query.limit as string) || 50;

    const notifications = await NotificationService.getUserNotifications(userId, limit);

    res.status(200).json({
      data: notifications,
      count: notifications.length,
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'unknown'
    });

  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve notifications',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

/**
 * PUT /notifications/:id/read
 * Mark a notification as read
 */
router.put('/:id/read', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const notificationId = req.params.id;

    await NotificationService.markNotificationAsRead(userId, notificationId);

    res.status(200).json({
      message: 'Notification marked as read',
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'unknown'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark notification as read',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
});

export default router;