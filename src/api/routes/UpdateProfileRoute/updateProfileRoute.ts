import express from "express";
import { updateUserProfile } from "../../controllers/profile/updateProfile";

const router = express.Router();

// PUT /api/users/:id
router.post("/profile-update", updateUserProfile);

export default router;
