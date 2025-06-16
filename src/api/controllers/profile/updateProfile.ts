import { Request, Response } from "express";
import { AppDataSource } from "@/server";
import { UserAuth } from "@/api/entity";

export const updateUserProfile = async (req: Request, res: Response) => {
  const {userId, fullName, email, userType, userProfileKey, workingWithAgent } = req.body;
  try {
    const userRepo = AppDataSource.getRepository(UserAuth)
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (userType) user.userType = userType;
    if (userProfileKey) user.userProfileKey = userProfileKey;
    if (workingWithAgent) user.WorkingWithAgent = workingWithAgent;
    await user.save();
    return res.json({ message: "Profile updated", user });
  } catch (error) {
    return res.status(500).json({ message: "Error updating profile", error });
  }
};
