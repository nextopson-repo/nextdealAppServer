import { Request, Response } from "express";
import { UserAuth } from "@/api/entity";
import { AppDataSource } from "@/server";
import { UserKyc } from "@/api/entity/userkyc";
import { generatePresignedUrl } from "../s3/awsControllers";

export const getUserProfile = async (req: Request, res: Response) => {
  const { userId } = req.body;



  if (!userId) {
    return res.status(400).json({ message: "userId is required in request body" });
  }

  try {
    const userRepo = AppDataSource.getRepository(UserAuth); 
    const kycRepo = AppDataSource.getRepository(UserKyc); 
    const user = await userRepo.findOne({
      where: { id: userId },
    });
     
    const kyc = await kycRepo.findOne({
      where: { userId: userId },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const userProfile = user.userProfileKey ?  await generatePresignedUrl(user.userProfileKey) : null
    return res.json({
      message: "User fetched successfully",
      data: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        email: user.email,
        fullName: user.fullName,
        userType: user.userType,
        userProfileKey: user.userProfileKey,
        isEmailVerified: user.isEmailVerified,
        isMobileVerified: user.isMobileVerified,
        kycStatus: kyc ? kyc.kycStatus : "pending",
        userProfile: userProfile,
        // Add more fields if needed
      }
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
