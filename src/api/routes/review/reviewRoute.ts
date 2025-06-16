import express from "express";
import {
  createReview,
  getReviewById,
  updateReview,
  deleteReview,
  reportReview,
  removeReport
} from "@/api/controllers/review/reviewController";
import { getUserReviews } from "@/api/controllers/review/CustomerReview";

const Router = express.Router();

// Create a new review
Router.post("/create-review", createReview);

// Get all reviews for a user
Router.post("/get-user-review", getUserReviews);

// Get a specific review by ID
Router.post("/get-user-review-by-id", getReviewById);

// Update a review
Router.post("/update-user-review", updateReview);

// Delete a review
Router.post("/delete-user-review", deleteReview);

// Report a review
Router.post("/report-user-review", reportReview);

// Remove report from a review
Router.post("/remove-report-user-review", removeReport);

export default Router;