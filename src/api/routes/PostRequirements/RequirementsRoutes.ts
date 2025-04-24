import { requireMents } from '@/api/controllers/PostRequirementsController/RequirementsController';
import { authenticate } from '@/api/middlewares/auth/Authenticate';
import express from 'express';

const Router = express.Router();


Router.post('/requirements', authenticate,requireMents) 

export default Router;