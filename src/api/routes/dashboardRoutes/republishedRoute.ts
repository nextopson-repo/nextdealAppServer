import { createRepublisher, getuserRepublishedProperties,  PropertyRepublisherList,  republishRequest, statusUpdate } from '@/api/controllers/Dashboard/RepublishedController';
import express from 'express';


const router = express.Router();

// POST /republisher/create
router.post('/create', createRepublisher);

// POST /republisher/request
router.post('/get-user-request', republishRequest);

// PUT /republisher/status
router.post('/update-status', statusUpdate);

// POST /republisher/my
router.post('/republish-property-list', PropertyRepublisherList);

// GET /republisher/user-republished
router.post('/user-republished', getuserRepublishedProperties);


export default router;
