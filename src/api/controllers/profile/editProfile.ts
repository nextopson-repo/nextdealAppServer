import { Request, Response } from "express";
import { UserAuth } from "@/api/entity";

export const EditUserProfile = async (req: Request, res: Response) => {
  const { userId,  userProfileKey, email } = req.body;

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

    // Update fields
    if (userProfileKey) {
      user.userProfileKey = userProfileKey;
    }

    if (email) {
      user.email = email;
    }

    await user.save();

    return res.json({
      message: "User profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
