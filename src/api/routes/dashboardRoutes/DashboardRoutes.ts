
import { analyticProperty} from '@/api/controllers/dashboard/DashboardController';
import { getSavedProperties} from '@/api/controllers/dashboard/DashboardController';
import { createSavedProperty} from '@/api/controllers/dashboard/DashboardController';
//import {getPropertyEnquiries} from '@/api/controllers/dashboard/DashboardController';

import { Router } from 'express';

const router = Router();
router.post('/analytic-property', analyticProperty);
router.post('/get-saved-properties', getSavedProperties);
router.post('/create-saved-property', createSavedProperty);
// router.post('/get-property-enquiries', getPropertyEnquiries);


export default router;
