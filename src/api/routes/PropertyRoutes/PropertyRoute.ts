import { getAllProperties } from '@/api/controllers/property/PropertyController';
import { searchProperty } from '@/api/controllers/property/PropertyController';
import { createOrUpdateProperty } from '@/api/controllers/property/createOrUpdateProperty';
import { Router } from 'express';
import { authenticate } from '@/api/middlewares/auth/Authenticate';
import { getUserRequirements, requireMents } from '@/api/controllers/property/RequirementsController';

const router = Router();

// Apply authentication middleware to all property routes
// router.use(authenticate);

router.post('/create-update', createOrUpdateProperty);
router.post('/getAll', getAllProperties);
router.post('/search-property', searchProperty);

router.post('/search-property', searchProperty);
router.post('/create-update-requirement', requireMents);
router.post("/get-requirements", getUserRequirements)
export default router;
