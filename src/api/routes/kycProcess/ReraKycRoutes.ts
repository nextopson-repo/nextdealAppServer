import { ReraVerified } from "@/api/controllers/docverification/ReraKycController";


import { Router } from 'express';

const router = Router();

router.post('/rera-verified', ReraVerified);

export default router;