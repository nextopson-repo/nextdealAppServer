import { Request, Response } from 'express';
import { AppDataSource } from '@/server';
import { Notifications, NotificationType } from '@/api/entity/Notifications';
import { UserAuth } from '@/api/entity';
import { generatePresignedUrl } from '../s3/awsControllers';
import { getSocketInstance } from '@/socket';

export const createNotification = async (req: Request, res: Response) => {
  const { userId, message, type, user, button, property, status, sound, vibration } = req.body;

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
    const userObj = await userRepo.findOneBy({ id: userId });
    if (!userObj) {
      return res.status(404).json({
        success: false,
        message: 'User ID is invalid or does not exist.',
      });
    }

    // Create notification
    const notificationRepo = AppDataSource.getRepository(Notifications);
    const notification = notificationRepo.create({
      userId,
      message,
      type,
      user,
      button,
      property,
      status,
      sound: sound || 'default',
      vibration: vibration || 'default',
    });

    // Save notification
    await notificationRepo.save(notification);

    // Emit real-time notification
    const io = getSocketInstance();
    const notificationData = {
      ...notification,
      sound: notification.sound,
      vibration: notification.vibration,
    };

    // Emit to specific user's room
    io.to(userId).emit('notifications', notificationData);

    return res.status(201).json({
      success: true,
      notification: notificationData,
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
  const { userId } = req.query;
  
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ success: false, message: 'userId is required as query param' });
  }

  try {
    const notificationRepository = AppDataSource.getRepository(Notifications);
    const notifications = await notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // Generate presigned URLs for media files if they exist
    const notificationsWithUrls = await Promise.all(
      notifications.map(async (notification) => {
        if (notification.mediakey) {
          notification.mediakey = await generatePresignedUrl(notification.mediakey);
        }
        return notification;
      })
    );

    return res.status(200).json({ success: true, notifications: notificationsWithUrls });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


// generate notification
export const generateNotification = async (
  userId: string,
  message: string,
  mediakey?: string,
  type?: NotificationType,
  user?: string,
  button?: string,
  property?: { title?: string; price?: string; location?: string; image?: string },
  status?: string,
  imageKey?: string,
  sound?: string,
  vibration?: string,
) => {
  try {
    const notificationRepo = AppDataSource.getRepository(Notifications);
    const notification = notificationRepo.create({
      userId,
      message,
      mediakey,
      type,
      user,
      button,
      property,
      status,
      sound: sound || 'default',
      vibration: vibration || 'default',
    });

    if (imageKey) {
      notification.mediakey = await generatePresignedUrl(imageKey);
    }

    await notificationRepo.save(notification);

    const io = getSocketInstance();
    const notificationData = {
      ...notification,
      sound: notification.sound,
      vibration: notification.vibration,
    };

    io.to(userId).emit('notifications', notificationData);
    return [notificationData, 'Notification sent successfully', 200];
  } catch (error) {
    console.error('Error generating notification:', error);
    return ['Failed to generate notification', 500];
  }
};