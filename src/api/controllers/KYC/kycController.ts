import { Request, Response } from "express";
import { UserAuth } from "@/api/entity";
import { UserKyc } from "@/api/entity/userkyc";
import { AppDataSource } from "@/server";
import { generateNotification } from "../notification/NotificationController";

// Create or Update KYC
export const createUpdateKyc = async (req: Request, res: Response) => {
  const { 
    userId, 
    reraIdState, 
    reraId, 
    aadharFrontKey,
    aadharBackKey,
    selfieImageKey,
    aadharcardNumber,
    aadharcardAddress
  } = req.body;
  
  try {
    const kycRepo = AppDataSource.getRepository(UserKyc);
    const userRepo = AppDataSource.getRepository(UserAuth);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    let kyc = await kycRepo.findOne({ where: { userId } });
    const isNew = !kyc;

    if (!kyc) {
      kyc = kycRepo.create({ userId });
    }
    // Update KYC fields if present
    if (reraIdState) kyc.reraIdState = reraIdState;
    if (reraId) {
      kyc.reraId = reraId;
      kyc.rera = true; 
    }
    if (aadharcardNumber) kyc.aadharcardNumber = aadharcardNumber;
    if (aadharcardAddress) kyc.aadharcardAddress = aadharcardAddress;
    if (aadharFrontKey) kyc.aadharFrontKey = aadharFrontKey;
    if (aadharBackKey) kyc.aadharBackKey = aadharBackKey;
    if (selfieImageKey) kyc.selfieImageKey = selfieImageKey;

    await kycRepo.save(kyc);

    if(kyc.kycStatus==="Verified"){
      generateNotification(userId, `Verification Successful! You're now a KYC Verified Agent on Nextdeal - credibility unlocked. opportunities await`, user.userProfileKey || undefined, 'verification', user.fullName, undefined, undefined, kyc.kycStatus);
    }
    if(kyc.kycStatus==="Rejected"){
      generateNotification(userId, `Verification Rejected! Your KYC verification has been rejected. Please try again.`, user.userProfileKey || undefined, 'verification', user.fullName, undefined, undefined, kyc.kycStatus);
    }
    if(kyc.kycStatus==="Pending"){
      generateNotification(userId, `Your KYC is still pending! Complete it now to gain trust and access all features on Nextdeal.`, user.userProfileKey || undefined, 'verification', user.fullName, 'Complete KYC', undefined, kyc.kycStatus);
    }
    if(kyc.rera){
      generateNotification(userId, `Great news! Your  ${user.userType==="Agent"? "5" : "1"} property active on Nextdeal is absolutely FREE -list now and connect with serious buyers!`, user.userProfileKey || undefined, 'KYC', user.fullName, undefined, undefined, kyc.kycStatus, undefined);
    }

    return res.status(isNew ? 201 : 200).json({
      message: isNew ? "KYC created successfully" : "KYC updated successfully",
      created: isNew,
      kyc,
    });
  } catch (error) {
    console.error("KYC update error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ message: "Error updating KYC", error: errorMessage });
  }
};

// Get KYC Status
export const GetKycStatus = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const kycRepo = AppDataSource.getRepository(UserKyc);
    const userRepo = AppDataSource.getRepository(UserAuth);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const kyc = await kycRepo.findOne({ where: { userId } });
    if (!kyc) return res.status(404).json({ message: "KYC not found for this user" });

    return res.status(200).json({
      message: "KYC status retrieved successfully",
      kyc,
      status: {
        kycStatus: kyc.kycStatus,
        documentsSubmitted: {
          reraId: !!kyc.reraId,
          reraVerified: kyc.rera,
          aadharCard: !!kyc.aadharcardNumber,
          aadharAddress: !!kyc.aadharcardAddress,
          selfie: !!kyc.selfieImageKey,
          aadharFront: !!kyc.aadharFrontKey,
          aadharBack: !!kyc.aadharBackKey
        }
      }
    });
  } catch (error) {
    console.error("KYC status retrieval error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ message: "Error retrieving KYC status", error: errorMessage });
  }
};

