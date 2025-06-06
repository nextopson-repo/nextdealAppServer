import { getAllProperties, getPropertyById} from '@/api/controllers/property/PropertyController';
import { searchProperty } from '@/api/controllers/property/PropertyController';
import { createOrUpdateProperty } from '@/api/controllers/property/createOrUpdateProperty';
import { Router } from 'express';
import { authenticate } from '@/api/middlewares/auth/Authenticate';
import { trendingProperty } from '@/api/controllers/property/PropertyController';
import{offeringProperty} from '@/api/controllers/property/PropertyController';
import { CreateOrUpdateRequirement, getUserRequirements } from '@/api/controllers/property/RequirementsController';
import {  uploadPropertyImagesController } from '@/api/controllers/property/uploadPropertyImages';
import multer from 'multer';
import { getUserProperties } from '@/api/controllers/property/PropertyController';


// import { getUserRequirements, requireMents } from '@/api/controllers/property/RequirementsController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Apply authentication middleware to all property routes
// router.use(authenticate);
router.post('/create-update', createOrUpdateProperty);
router.post('/get-property-by-id', getPropertyById);
router.post('/getAll', getAllProperties);
router.post('/search-property', searchProperty);
router.post('/trending-property', trendingProperty);
router.post('/create-update-requirement', CreateOrUpdateRequirement); 
router.post("/get-requirements", getUserRequirements)
router.post("/upload-property-images", upload.single('file'), uploadPropertyImagesController);
router.post('/get-user-properties', getUserProperties);
router.post('/offering-property', offeringProperty)
export default router;
