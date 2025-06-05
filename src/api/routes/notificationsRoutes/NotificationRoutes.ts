
//import router from '../UpdateProfileRoute/updateProfileRoute';
import { createNotification, fetchNotifications, markAsRead } from '@/api/controllers/notification/NotificationController';
import { Router } from 'express';

// import { authenticate } from '@/api/middlewares/auth/Authenticate';



// Router.post('/', notificationController.sendNotification);
// Router.post('/your-notifications', authenticate, notificationController.fetchSentNotifications);
// Router.post('/your-notifications/mark-as-read', authenticate, notificationController.markAsRead);
// Router.post('/add-templates', createTemplates);

const router = Router();
router.post('/create-notification', createNotification);
router.post('/mark-as-read', markAsRead);
router.post('/fetch-notifications', fetchNotifications);

export default router;
