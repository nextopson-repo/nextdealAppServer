
import { deleteNotification } from '@/api/controllers/notification/socketNotificationController';
import{sendNotification} from '@/api/controllers/notification/socketNotificationController'
import { Router } from 'express';
const router = Router();



router.post('/send-notification', sendNotification);
router.post('/delete-notification', deleteNotification);
export default router;