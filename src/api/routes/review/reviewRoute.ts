import {  createUpdateKyc, GetKycStatus } from "@/api/controllers/KYC/kycController";

import express from "express";

const Router = express.Router();


Router.post("/create-review", createUpdateKyc)
Router.post("/get-review", GetKycStatus)

export default Router;