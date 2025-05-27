
import { deleteNotification } from '@/api/controllers/notification/socketNotificationController';
import{sendNotification} from '@/api/controllers/notification/socketNotificationController'
import { Router } from 'express';



const router = Router();


// router.post('/send', WebSocketNotification.sendNotification);
// router.get('/get', WebSocketNotification.getNotificationCount);
// router.post('/mark-read', WebSocketNotification.markRead);
// router.post('/mark-all-read', WebSocketNotification.markAllRead);
// router.get('/get-count', WebSocketNotification.getNotificationCount);

router.post('/send-notification', sendNotification);
router.post('/delete-notification', deleteNotification);
export default router;