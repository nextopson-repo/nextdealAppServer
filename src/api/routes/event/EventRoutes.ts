import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { 
  createEvent,
  getEvent,
  getEvents,
  updateEvent,
  deleteEvent
} from '../../controllers/eventController';

const router = Router();

router.post('/', authenticate, createEvent);
router.get('/:id', getEvent);
router.get('/', getEvents);
router.put('/:id', authenticate, updateEvent);
router.delete('/:id', authenticate, deleteEvent);

export default router;
