import express from "express";
import { updateUserProfile } from "../../controllers/profile/updateProfile";
import { getUserProfile } from "@/api/controllers/profile/userprofile";
import { EditUserProfile } from "@/api/controllers/profile/editProfile";

const router = express.Router();

// PUT /api/users/:id
router.post("/profile-update", updateUserProfile);
router.post("/get-userProfile",getUserProfile)
router.post("/profile-edit",EditUserProfile)

export default router;
