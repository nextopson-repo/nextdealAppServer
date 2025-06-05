import { Request, Response } from 'express';
import { AppDataSource } from '@/server';
import { Notifications } from '@/api/entity/Notifications';
import { UserAuth } from '@/api/entity';
import { generatePresignedUrl } from '../s3/awsControllers';
import { getSocketInstance } from '@/socket';

export const createNotification = async (req: Request, res: Response) => {
  const { userId, message, type } = req.body;

  // Validate required fields
  if (!userId || !message || !type) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: userId, message, or type.',
    });
  }

  try {
    const userRepo = AppDataSource.getRepository(UserAuth);

    // Check if user exists
    const user = await userRepo.findOneBy({ id: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User ID is invalid or does not exist.',
      });
    }

    // Use the Notifications repository to create the notification
    const notificationRepos = AppDataSource.getRepository(Notifications);
    const notification = notificationRepos.create({
      userId,
      message,
      type,
    });

    // Save the notification
    await notificationRepos.save(notification);

    return res.status(201).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

//markread

// export const markAsRead = async (req: Request, res: Response) => {
//   const { notificationId } = req.body;

//   try {
//     const notificationRepository = AppDataSource.getRepository(Notifications);
//     const notification = await notificationRepository.findOneBy({ id: notificationId });
//     if (!notificationID) {
//       return res.status(404).json({ success: false, message: 'Notification not found' });
//     }
//     notification.isRead = true;
//     await notificationRepository.save(notification);
//     return res.status(200).json({ success: true, notification });
//   } catch (error) {
//     console.error('Error marking notification as read:', error);
//     res.status(500).json({ success: false, message: 'Internal server error' });
//   }
// };


export const markAsRead = async (req: Request, res: Response) => {
  const { notificationId } = req.body;

  if (!notificationId) {
    return res.status(400).json({ success: false, message: 'notificationId is required' });
  }

  try {
    const notificationRepository = AppDataSource.getRepository(Notifications);
    const notification = await notificationRepository.findOneBy({ id: notificationId });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    await notificationRepository.save(notification);

    return res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


//fetchnotification
export const fetchNotifications = async (req: Request, res: Response) => {
  const { userId } = req.body;

  try {
    const notificationRepository = AppDataSource.getRepository(Notifications);
    let notifications = await notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // Generate presigned URLs for media files if they exist
    for (let notification of notifications) {
      if (notification.mediakey) {
        notification.mediakey = await generatePresignedUrl(notification.mediakey);
      }
    }

    return res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


// generate notification
export const generateNotification = async (userId: string, message: string, mediakey: string, type: string) => {

  const notificationRepo = AppDataSource.getRepository(Notifications);
  const notification = notificationRepo.create({
    userId,
    message,
    mediakey,
    type,
  });
  await notification.save();

  const io = getSocketInstance();
  const noticeInfo = io.to(userId).emit('notifications', notification);
  if (noticeInfo) {
    return [notification, 'Notification sent successfully', 200];
  } else {
    return ['Failed to generate notification', 500];
  }
};