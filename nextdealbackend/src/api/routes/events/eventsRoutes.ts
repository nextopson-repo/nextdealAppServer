import { Router } from 'express';

import { createEvent, deleteEvent, getEventById, getEvents, updateEvent } from '../../controllers/eventsController';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.get('/', getEvents);
router.get('/:id', getEventById);
router.post('/', authenticate, createEvent);
router.put('/:id', authenticate, updateEvent);
router.delete('/:id', authenticate, deleteEvent);

export default router;
