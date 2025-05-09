import express from 'express';
import {
  createRepublisher,
  republishRequest,
  statusUpdate,
  myUserRepublisher,
} from '@/api/controllers/dashboard/RepublishedController';

const router = express.Router();

// POST /republisher/create
router.post('/create', createRepublisher);

// POST /republisher/request
router.post('/request', republishRequest);

// PUT /republisher/status
router.post('/status', statusUpdate);

// POST /republisher/my
router.post('/republish-property', myUserRepublisher);

export default router;
