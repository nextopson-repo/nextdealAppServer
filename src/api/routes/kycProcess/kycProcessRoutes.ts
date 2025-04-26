import { kycController } from "@/api/controllers/KYC/kycController";

import express from "express";

const Router = express.Router();



Router.post("/kyc-process", kycController)

export default Router;