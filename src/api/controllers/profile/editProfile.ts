import { Request, Response } from "express";
import { UserAuth } from "@/api/entity";
import { sendEmailOTP } from "@/common/utils/mailService";
import { AppDataSource } from "@/server";

export const EditUserProfile = async (req: Request, res: Response) => {
  const { userId, userProfileKey, email } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "userId is required in request body" });
  }

  try {
    const userRepo = AppDataSource.getRepository(UserAuth);
    const user = await userRepo.findOne({
      where: { id: userId },
      select: ["email", "id", "userProfileKey"],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields
    if (userProfileKey) {
      user.userProfileKey = userProfileKey;
    }

    if (email) {
      user.email = email;
    }

    // Send email OTP if email is changed
    if (email && email !== user.email) {
      // Generate new email OTP
      user.generateEmailOTP();
      // Send OTP via email
      await sendEmailOTP(email, user.emailOTP!);
    }

    await user.save();

    return res.json({
      message: "User profile updated successfully",
      data: { email: user.email, userProfileKey: user.userProfileKey, id: user.id },
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
