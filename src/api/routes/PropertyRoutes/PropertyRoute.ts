import { getAllProperties } from '@/api/controllers/propertyCon/PropertyController';
import { searchProperty } from '@/api/controllers/propertyCon/PropertyController';
import { createOrUpdateProperty } from '@/api/controllers/propertyCon/createOrUpdateProperty';
import { Router } from 'express';
import { authenticate } from '@/api/middlewares/auth/Authenticate';
import { requireMents } from '@/api/controllers/PostRequirementsController/RequirementsController';

const router = Router();

// Apply authentication middleware to all property routes
// router.use(authenticate);

router.post('/create-update', createOrUpdateProperty);
router.get('/getAll', getAllProperties);
router.post('/search-property', searchProperty);

router.post('/search-property', searchProperty);
router.post('/create-update-requirement', requireMents);
export default router;
