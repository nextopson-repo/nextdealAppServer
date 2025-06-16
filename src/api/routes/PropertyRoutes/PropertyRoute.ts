import { deleteProperty, getAllProperties, getPropertyById, getPropertyLeands, sharePropertyEmailNotification, updateIsSold, updatePropertyStatus} from '@/api/controllers/property/PropertyController';
import { searchProperty } from '@/api/controllers/property/PropertyController';
import { createOrUpdateProperty } from '@/api/controllers/property/createOrUpdateProperty';
import { Router } from 'express';
import { authenticate } from '@/api/middlewares/auth/Authenticate';
import { trendingProperty } from '@/api/controllers/property/PropertyController';
import{offeringProperty} from '@/api/controllers/property/PropertyController';
import { CreateOrUpdateRequirement, createUserRequirementsEnquiry, deleteUserRequirementsEnquiry, getRequirementEnquiries, getUserRequirements, getUserRequirementsEnquiry, createRequirementEnquiry, deleteUserRequirements, updateUserRequirementsFoundStatus, getAllRequirements } from '@/api/controllers/property/RequirementsController';
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
router.post('/delete-property', deleteProperty);
router.post('/update-is-sold', updateIsSold);
router.post('/share-property-email-notification', sharePropertyEmailNotification);
router.post('/get-property-leands', getPropertyLeands);
router.post('/create-update-requirement', CreateOrUpdateRequirement); 
router.post("/get-user-requirements", getUserRequirements)
router.post("/get-all-requirements", getAllRequirements)
router.post("/delete-user-requirements", deleteUserRequirements)
router.post("/update-user-requirements-foundstatus", updateUserRequirementsFoundStatus)
router.post("/upload-property-images", upload.single('file'), uploadPropertyImagesController);
router.post('/get-user-properties', getUserProperties);
router.post('/offering-property', offeringProperty)
router.post('/create-user-requirements-enquiry', createUserRequirementsEnquiry);
router.post('/get-user-requirements-enquiry', getUserRequirementsEnquiry);
router.post('/get-requirement-enquiries', getRequirementEnquiries);
router.post('/delete-user-requirements-enquiry', deleteUserRequirementsEnquiry);
router.post('/create-requirement-enquiry', createRequirementEnquiry);
router.post('/update-property-status', updatePropertyStatus);


export default router;
