import { getAllProperties} from '@/api/controllers/property/PropertyController';
import { searchProperty } from '@/api/controllers/property/PropertyController';
import { createOrUpdateProperty } from '@/api/controllers/property/createOrUpdateProperty';
import { Router } from 'express';
import { authenticate } from '@/api/middlewares/auth/Authenticate';
import { requireMents } from '@/api/controllers/property/RequirementsController';
import { trendingProperty } from '@/api/controllers/property/PropertyController';
import{offeringProperty} from '@/api/controllers/property/PropertyController';



const router = Router();

// Apply authentication middleware to all property routes
// router.use(authenticate);

router.post('/create-update', createOrUpdateProperty);
router.get('/getAll', getAllProperties);
router.post('/search-property', searchProperty);
router.post('/trending-property', trendingProperty);
router.post('/create-update-requirement', requireMents);
router.post('/offering-property', offeringProperty)

export default router;
