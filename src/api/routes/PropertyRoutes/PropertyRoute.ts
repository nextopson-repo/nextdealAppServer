import { getAllProperties } from '@/api/controllers/property/PropertyController';
import { searchProperty } from '@/api/controllers/property/PropertyController';
import { createOrUpdateProperty } from '@/api/controllers/property/createOrUpdateProperty';
import { Router } from 'express';
import { authenticate } from '@/api/middlewares/auth/Authenticate';

const router = Router();

// Apply authentication middleware to all property routes
// router.use(authenticate);

router.post('/create-update', createOrUpdateProperty);
router.get('/getAll', getAllProperties);
router.post('/search-property', searchProperty);

export default router;
