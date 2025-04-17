// import { Request, Response } from "express";
// import { UpdateProfileDto } from "../UpdateProfileDto";

// export const updateUserProfile = async (req: Request, res: Response) => {
//   const userId = req.params.id;
//   const { fullName, email, accountType, profilePicture }: UpdateProfileDto = req.body;

//   try {
//     const user = await User.findOne({ where: { id: userId } });

//     if (!user) return res.status(404).json({ message: "User not found" });

//     if (fullName) user.fullName = fullName;
//     if (email) user.email = email;
//     if (accountType) user.accountType = accountType;
//     if (profilePicture) user.profilePicture = profilePicture;

//     await user.save();

//     return res.json({ message: "Profile updated", user });
//   } catch (error) {
//     return res.status(500).json({ message: "Error updating profile", error });
//   }
// };
