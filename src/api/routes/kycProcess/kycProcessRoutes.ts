import {  createUpdateKyc, GetKycStatus } from "@/api/controllers/KYC/kycController";

import express from "express";

const Router = express.Router();


Router.post("/kyc-process", createUpdateKyc)
Router.post("/kyc-status", GetKycStatus)

export default Router;