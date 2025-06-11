import { Request, Response } from 'express';
import { UserReview } from '../../entity/UserReview';
import { AppDataSource } from '@/server';
import { UserAuth } from '@/api/entity';
import { generatePresignedUrl } from '../s3/awsControllers';

// Function to format timestamp into relative time
const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mon`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y`;
};

// Create a new review
export const createReview = async (req: Request, res: Response) => {
  try {
    const { userId, reviewerId, message } = req.body;

    if (!userId || !reviewerId) {
      return res.status(400).json({
        success: false,
        message: 'userId and reviewerId are required'
      });
    }

    const reviewRepo = AppDataSource.getRepository(UserReview);
    const userRepo = AppDataSource.getRepository(UserAuth);

    // Verify if both users exist
    const [user, reviewer] = await Promise.all([
      userRepo.findOne({ where: { id: userId } }),
      userRepo.findOne({ where: { id: reviewerId } })
    ]);

    if (!user || !reviewer) {
      return res.status(404).json({
        success: false,
        message: 'User or reviewer not found'
      });
    }

    const review = reviewRepo.create({
      userId,
      reviewerId,
      message,
      createdBy: req.user?.id || 'system',
      updatedBy: req.user?.id || 'system'
    });

    await reviewRepo.save(review);

    return res.status(201).json({
      success: true,
      data: review,
      message: 'Review created successfully'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Error creating review',
      error: error.message
    });
  }
};

// Get reviews for a specific user
export const getUserReviews = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    const reviewRepo = AppDataSource.getRepository(UserReview);
    const userRepo = AppDataSource.getRepository(UserAuth);

    // Verify if user exists
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get reviews with reviewer information
    const reviews = await reviewRepo.find({
      where: { userId },
      relations: ['reviewer'],
      order: {
        createdAt: 'DESC'
      }
    });

    // Format reviews with reviewer information
    const formattedReviews = await Promise.all(reviews.map(async (review) => {
      const reviewer = await userRepo.findOne({ 
        where: { id: review.reviewerId },
        select: ['fullName', 'userProfileKey']
      });

      let reviewerProfileImg = null;
      if (reviewer?.userProfileKey) {
        reviewerProfileImg = await generatePresignedUrl(reviewer.userProfileKey);
      }

      return {
        reviewerName: reviewer?.fullName || 'Anonymous',
        reviewerProfileImg,
        reviewermessage: review.message,
        revieweTimeStamp: getRelativeTime(review.createdAt)
      };
    }));

    return res.status(200).json({
      success: true,
      data: formattedReviews
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error.message
    });
  }
}; 