import { createNotification, fetchNotifications, markAsRead } from '@/api/controllers/notification/NotificationController';
import { Router } from 'express';


const router = Router();
router.post('/create-notification', createNotification);
router.post('/mark-as-read', markAsRead);
router.get('/fetch-notifications', fetchNotifications); // GET with userId as query param

export default router;
