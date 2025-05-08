
import { analyticProperty, getRequirementEnquiries} from '@/api/controllers/dashboard/DashboardController';
import { getSavedProperties} from '@/api/controllers/dashboard/DashboardController';
import { createSavedProperty} from '@/api/controllers/dashboard/DashboardController';
import { createPropertyEnquiry} from '@/api/controllers/dashboard/PropertyEnquiries';
import{getAllPropertyEnquiries} from '@/api/controllers/dashboard/PropertyEnquiries';


import { Router } from 'express';

const router = Router();
router.post('/analytic-property', analyticProperty);
router.post('/get-saved-properties', getSavedProperties);
router.post('/create-saved-property', createSavedProperty);
router.post('/create-property-enquiry', createPropertyEnquiry);
router.post('/get-all-property-enquiries', getAllPropertyEnquiries);
router.post('/get-requirement-enquiries', getRequirementEnquiries);

export default router;
