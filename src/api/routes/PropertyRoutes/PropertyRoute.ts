import { Router } from 'express';
import { createProperty, getAllProperties } from '../../controllers/propertyCon/PropertyController';

const router = Router();

router.post('/propertyDetails', createProperty);
router.get('/', getAllProperties);

export default router;
