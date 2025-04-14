import express from 'express';

import notificationController from '@/api/controllers/notifications/Notification';
import { createTemplates } from '@/api/controllers/notifications/Template';
import { authenticate } from '@/api/middlewares/auth/Authenticate';

const Router = express.Router();

Router.post('/', notificationController.sendNotification);
Router.post('/your-notifications', authenticate, notificationController.fetchSentNotifications);
Router.post('/your-notifications/mark-as-read', authenticate, notificationController.markAsRead);

Router.post('/add-templates', createTemplates);

export default Router;
