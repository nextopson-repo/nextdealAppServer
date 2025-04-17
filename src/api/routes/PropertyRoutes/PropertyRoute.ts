import { createOrUpdateProperty } from '@/api/controllers/property/PropertyController';
import { getAllProperties } from '@/api/controllers/propertyCon/PropertyController';
import { Router } from 'express';
const router = Router();

router.post('/create-update', createOrUpdateProperty);
router.get('/getAll', getAllProperties);

export default router;
