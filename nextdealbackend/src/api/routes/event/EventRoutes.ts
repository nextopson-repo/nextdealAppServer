import { Router } from 'express';

import { createEvent, deleteEvent, getEvent, getEvents, updateEvent } from '../../controllers/eventController';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.post('/', authenticate, createEvent);
router.get('/:id', getEvent);
router.get('/', getEvents);
router.put('/:id', authenticate, updateEvent);
router.delete('/:id', authenticate, deleteEvent);

export default router;
