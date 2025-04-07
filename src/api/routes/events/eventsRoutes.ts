import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { 
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
} from '../../controllers/eventsController';

const router = Router();

router.get('/', getEvents);
router.get('/:id', getEventById);
router.post('/', authenticate, createEvent);
router.put('/:id', authenticate, updateEvent);
router.delete('/:id', authenticate, deleteEvent);

export default router;
