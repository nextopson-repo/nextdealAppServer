import { Request, Response } from "express";
import { UserAuth } from "@/api/entity";

export const getUserProfile = async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "userId is required in request body" });
  }

  try {
    const user = await UserAuth.findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check KYC Status
    const isKYCComplete = user.isEmailVerified && user.isMobileVerified;
    const kycStatus = isKYCComplete ? "Complete" : "Pending";

    return res.json({
      message: "User fetched successfully",
      data: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
        userType: user.userType,
        emailOTP: user.emailOTP,
        mobileOTP: user.mobileOTP,
        emailOTPSentAt: user.emailOTPSentAt,
        mobileOTPSentAt: user.mobileOTPSentAt,
        userProfileKey: user.userProfileKey,
        isEmailVerified: user.isEmailVerified,
        isMobileVerified: user.isMobileVerified,
        kycStatus: kycStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
        // Add more fields if needed
      }
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
