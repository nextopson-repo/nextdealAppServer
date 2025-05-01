import { analyticProperty } from '@/api/controllers/dashboard/DashboardController';
import { Router } from 'express';

const router = Router();
router.post('/analytic-property', analyticProperty);



export default router;
