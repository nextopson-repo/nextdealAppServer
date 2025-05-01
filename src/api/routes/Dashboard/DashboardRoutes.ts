import { analyticProperty } from '@/api/controllers/Dashboard/DashboardController';
import { Router } from 'express';

const router = Router();
router.post('/analytic-property', analyticProperty);



export default router;
