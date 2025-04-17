export interface UpdateProfileDto {
    fullName?: string;
    email?: string;
    accountType?: "Agent" | "User";
    profilePicture?: string;
  }
  