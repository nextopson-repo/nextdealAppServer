import express from 'express';

import { getUser, getPersonalDetails, getEducationalDetails, getFinancialDetails, getProfessionalDetails, setPersonalDetails, setProfessionalDetails, setEducationalDetails, setFinancialDetails, getPersonalDetailsCustomer, setPersonalDetailsCustomer, getBusinessDetails, createOrUpdateBusinessDetails, checkForProfileCompletion } from '../../controllers/profile/Profile';
import { authenticate } from '@/api/middlewares/auth/Authenticate';

const Router = express.Router();

Router.post('/me', authenticate, getUser);

Router.post('/your-personal-details', authenticate, getPersonalDetails);
Router.post('/your-professional-details', authenticate, getProfessionalDetails);
Router.post('/your-educational-details/:sectortype', authenticate, getEducationalDetails);
Router.post('/your-financial-details', authenticate, getFinancialDetails);
Router.post('/your-business-details', getBusinessDetails);

Router.post('/personal', authenticate, setPersonalDetails);
Router.post('/professional', authenticate, setProfessionalDetails);
Router.post('/educational/:sectortype', authenticate, setEducationalDetails);
Router.post('/financial', authenticate, setFinancialDetails);
Router.post('/business', authenticate, createOrUpdateBusinessDetails);

Router.post('/your-personal-details-customer', getPersonalDetailsCustomer);
Router.post('/personal-customer', setPersonalDetailsCustomer);

Router.post('/check-for-profile-completion', checkForProfileCompletion);


export default Router;
