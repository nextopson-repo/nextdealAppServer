import { Notifications } from '@/api/entity/Notifications';
import { AppDataSource } from '@/server';

import { getSocketInstance } from '../../../socket';
import { Request, Response } from 'express';
import { generatePresignedUrl } from '../s3/awsControllers';
import { UserAuth } from '@/api/entity';


// Send notification component 
 

export const sendNotification = async (req: Request, res: Response) => {
  const { userId, message, mediakey } = req.body;
  if (!userId || !message) {
    return 'userId and message are required';
  }

  try {
    const userRepos = AppDataSource.getRepository(UserAuth);
    const user = await userRepos.findOne({ where: { id: userId } });

    if (!user) {
      return 'User ID is invalid or does not exist.';
    }

    // Create a new notification
    const notificationRepo = AppDataSource.getRepository(Notifications);
    const notification = notificationRepo.create({
      userId,
      message,
      mediaUrl: mediakey !== null || mediakey !== undefined ? mediakey : null,

      createdBy: 'Live',
      createdAt: new Date(),
    });
    // Send notification via WebSocket
    const io = getSocketInstance();
    const noticeInfo = io.to(userId).emit('notifications', notification);

    if (noticeInfo) {
      await notificationRepo.save(notification);
      return 'Notification sent successfully';
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    return 'Error sending notification';
  }
};

  // delete notification component
  export const deleteNotification = async (userId:string) => {
    if (!userId ) {
      return "notificationId required" ;
    }
    try {
      const notificationRepo = AppDataSource.getRepository(Notifications);
      let  notification = await notificationRepo.findOne({ where: { userId } });
      if (!notification) {
        return "Notification not found or invalid userId" ;
      }
      notification.isRead = true;
   await notificationRepo.save(notification);

      // Emit real-time event to update the client
      // const io = getSocketInstance();
      // io.to(userId).emit('notifications', savedNotification);
      return "Notification marked as read" ;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return "Error marking notification as read" ;
    }
  };



export function formatTimestamp(arg0: Date): any {
  throw new Error('Function not implemented.');
}

