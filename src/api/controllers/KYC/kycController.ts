import { UserAuth } from "@/api/entity";
import { userkyc } from "@/api/entity/userkyc";
import { AppDataSource } from "@/server";
import { Request, Response } from "express";

// Create or Update KYC
export const kycController = async (req: Request, res: Response) => {
  const { userId, reraIdState, reraId, aadharcardNumber, aadharcardAddress, aadharImageKeys, selfieImageKey } = req.body;
  
  try {
    const kycRepo = AppDataSource.getRepository(userkyc);
    const userRepo = AppDataSource.getRepository(UserAuth);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    let kyc = await kycRepo.findOne({ where: { userId } });
    const isNew = !kyc;

    if (!kyc) {
      kyc = kycRepo.create({ userId });
    }

    // Assign fields if present
    if (reraIdState) kyc.reraIdState = reraIdState;
    if (reraId) kyc.reraId = reraId;
    if (aadharcardNumber) kyc.aadharcardNumber = aadharcardNumber;
    if (aadharcardAddress) kyc.aadharcardAddress = aadharcardAddress;
    if (selfieImageKey) kyc.selfieImageKey = selfieImageKey;
    if (aadharImageKeys) kyc.aadharImageKeys = aadharImageKeys;

    await kycRepo.save(kyc);

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
