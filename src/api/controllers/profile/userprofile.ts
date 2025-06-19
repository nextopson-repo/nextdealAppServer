import { Request, Response } from "express";
import { AppDataSource } from "../../../server";
import { UserAuth } from "../../entity/UserAuth";
import { UserKyc } from "../../entity/userkyc";
import { UserReview } from "../../entity/UserReview";
import { generatePresignedUrl } from "../s3/awsControllers";
import { sendMobileOTP } from "@/common/utils/mobileMsgService";
import { verifyOTP } from "@/common/utils/otpService";
import { Connections } from "@/api/entity/Connection";

// Helper function to format numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

interface GetUserProfileRequest {
  userId: string;
}

interface UserProfileResponse {
  id: string;
  mobileNumber: string;
  email: string;
  fullName: string;
  userType: string;
  userProfileKey: string | null;
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  kycStatus: string;
  userProfile: string | null;
  subscriptionsType: string;
  followers: string;
  following: string;
  creditbilityScore: number;
}

export const getUserProfile = async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ 
      status: 'error',
      message: "userId is required in request body" 
    });
  }

  try {
    // Check if TypeORM is initialized
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Initialize repositories
    const userRepo = AppDataSource.getRepository(UserAuth);
    const kycRepo = AppDataSource.getRepository(UserKyc);
    const connectionRepo = AppDataSource.getRepository(Connections);
    const reviewRepo = AppDataSource.getRepository(UserReview);

    // First check if user exists
    const user = await userRepo.findOne({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: "User not found" 
      });
    }

    // Get connection counts (removed status field since it doesn't exist in our entity)
    const followingCount = await connectionRepo.count({
      where: { requesterId: userId }
    });
    const followerCount = await connectionRepo.count({
      where: { receiverId: userId }
    });

    // Calculate average rating and credibility score
    // const reviews = await reviewRepo.find({
    //   where: { userId }
    // });
    
    let creditbilityScore = 0;
    // if (reviews && reviews.length > 0) {
    //   const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    //   const averageRating = totalRating / reviews.length;
    //   // Convert to percentage (e.g., 8/10 = 80%)
    //   creditbilityScore = Math.round((averageRating / 10) * 100);
    // }

    // Then fetch KYC data
    let kyc = await kycRepo.findOne({
      where: { userId: userId }
    });

    // If user is not registered for KYC, create a new KYC record
    if (!kyc) {
      try {
        const newKyc = new UserKyc();
        newKyc.userId = userId;
        newKyc.kycStatus = 'Pending';
        newKyc.createdBy = 'system';
        newKyc.updatedBy = 'system';
        
        kyc = await kycRepo.save(newKyc);
        console.log(`Created new KYC record for user ${userId}`);
      } catch (error) {
        console.error(`Error creating KYC record for user ${userId}:`, error);
        // Continue with null kyc rather than failing the whole request
      }
    }

    // Generate presigned URL if profile image exists
    let userProfileUrl = null;
    if (user.userProfileKey) {
      try {
        userProfileUrl = await generatePresignedUrl(user.userProfileKey);
      } catch (error) {
        console.error(`Error generating presigned URL for user ${userId}:`, error);
      }
    }

    const response: UserProfileResponse = {
      id: user.id,
      mobileNumber: user.mobileNumber,
      email: user.email || '',
      fullName: user.fullName || '',
      userType: user.userType || 'EndUser',
      userProfileKey: user.userProfileKey,
      isEmailVerified: user.isEmailVerified,
      isMobileVerified: user.isMobileVerified,
      kycStatus: kyc?.kycStatus || "Pending",
      userProfile:  userProfileUrl ,
      subscriptionsType: "Premium Active",
      followers: formatNumber(followerCount),
      following: formatNumber(followingCount),
      creditbilityScore
    };

    return res.json({
      status: 'success',
      message: "User profile fetched successfully",
      data: response
    });

  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return res.status(500).json({ 
      status: 'error',
      message: "Internal server error while fetching user profile",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteUserAccount = async (req: Request, res: Response) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) {
    return res.status(400).json({ message: "User ID and OTP are required." });
  }

  try {
    const userRepo = AppDataSource.getRepository(UserAuth);
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Placeholder for OTP verification logic
    // In a real application, you would compare the provided OTP with a stored OTP (e.g., in a database or cache)
    // and ensure it hasn't expired.
    // For this example, let's assume a simple verification if an otpService.verifyOTP exists
    const isOtpValid = await verifyOTP(user.mobileNumber, otp, "delete_account"); // Assuming a type for delete account OTP

    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    await userRepo.delete(userId);

    return res.status(200).json({ message: "Account deleted successfully." });
  } catch (error) {
    console.error("Error deleting user account:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const resendDeleteAccountOTP = async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  try {
    const userRepo = AppDataSource.getRepository(UserAuth);
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Generate a new OTP and send it
    const newOtp = Math.floor(1000 + Math.random() * 9000).toString(); // Generate a 4-digit OTP
    // In a real application, you would store this new OTP with an expiration time
    // and then send it via SMS.
    await sendMobileOTP(user.mobileNumber, newOtp);

    return res.status(200).json({ message: "OTP sent successfully." });
  } catch (error) {
    console.error("Error resending OTP:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};