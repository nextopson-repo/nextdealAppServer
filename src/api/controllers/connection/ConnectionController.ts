import { UserAuth } from "@/api/entity";
import { Connections } from "@/api/entity/Connection";
import { AppDataSource } from "@/server";
import { Request, Response } from 'express';
import { generateNotification } from "../notification/NotificationController";
import { In } from "typeorm";
import { generatePresignedUrl } from "../s3/awsControllers";

// Send a connection request
export const sendConnectionRequest = async (req: Request, res: Response): Promise<Response> => {
  const { requesterId, receiverId } = req.body;
  try {
    const userRepository = AppDataSource.getRepository(UserAuth);
    const connectionRepository = AppDataSource.getRepository(Connections);
    const requester = await userRepository.findOne({ where: { id: requesterId } });
    const receiver = await userRepository.findOne({ where: { id: receiverId } });

    if (!requester) {
      return res.status(404).json({ message: 'Requester not found.' });
    }
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found.' });
    }

    const existingConnection = await connectionRepository.findOne({
      where: [
        { requesterId, receiverId },
        { requesterId: receiverId, receiverId: requesterId },
      ],
    });

    if (existingConnection) {
      return res.status(400).json({ message: 'Connection request already exists.' });
    }
    const newConnection = connectionRepository.create({
      requesterId,
      receiverId,
      status: 'pending',
    });
    await connectionRepository.save(newConnection);

    // Create a notification for the receiver
    await generateNotification(
      receiverId,
      `${requester.firstName} ${requester.lastName} sent you a follow request`,
      requester.userProfileKey || '',
      'connection_request',
      `${requester.firstName} ${requester.lastName}`,
      'View Profile',
      undefined,
      'Pending'
    );

    return res.status(201).json({
      message: 'Connection request sent successfully.',
      connection: newConnection,
    });
  } catch (error) {
    console.error('Error sending connection request:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Accept or reject a connection request
export const updateConnectionStatus = async (req: Request, res: Response): Promise<Response> => {
  const { userId, connectionId, status } = req.body;

  try {
    const connectionRepository = AppDataSource.getRepository(Connections);
    const userRepository = AppDataSource.getRepository(UserAuth);

    const connection = await connectionRepository.findOne({
      where: [{ requesterId: connectionId, receiverId: userId }],
    });

    if (!connection) {
      return res.status(404).json({ message: 'Connection not found.' });
    }

    if (connection.status === 'accepted') {
      return res.status(400).json({ message: 'Connection request already accepted' });
    }

    if (connection.status === 'rejected') {
      return res.status(400).json({ message: 'Connection request already rejected' });
    }

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    connection.status = status as 'accepted' | 'rejected';
    const updatedConnection = await connectionRepository.save(connection);

    // Get receiver details for notification
    const receiver = await userRepository.findOne({ where: { id: userId } });
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found.' });
    }

    // Create notification for the requester
    await generateNotification(
      connection.requesterId,
      `${receiver.firstName} ${receiver.lastName} ${status} your follow request`,
      receiver.userProfileKey || '',
      'connection_response',
      `${receiver.firstName} ${receiver.lastName}`,
      status === 'accepted' ? 'Message' : undefined,
      undefined,
      status.charAt(0).toUpperCase() + status.slice(1)
    );

    return res.status(200).json({ 
      message: `Connection ${status} successfully.`, 
      data: updatedConnection 
    });
  } catch (error: any) {
    console.error('Error updating connection status:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get user's connections and mutual connections
export const getUserConnections = async (req: Request, res: Response): Promise<Response> => {
  const { profileId, userId } = req.body;

  try {
    const connectionRepository = AppDataSource.getRepository(Connections);
    const connections = await connectionRepository.find({
      where: [
        { requesterId: profileId, status: 'accepted' },
        { receiverId: profileId, status: 'accepted' },
      ],
    });

    if (!connections || connections.length === 0) {
      return res.status(404).json({ message: 'No accepted followings found.' });
    }

    const userRepository = AppDataSource.getRepository(UserAuth);
    const userIds = [
      ...new Set(connections.map((connection) => connection.requesterId)),
      ...new Set(connections.map((connection) => connection.receiverId)),
    ].filter((id) => id !== profileId);

    const users = await userRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'firstName', 'lastName', 'userProfileKey', 'userType'],
    });

    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No users found.' });
    }

    // Fetch all connections of the requesting user to check for mutual connections
    const userConnections = await connectionRepository.find({
      where: [
        { requesterId: userId, status: 'accepted' },
        { receiverId: userId, status: 'accepted' },
      ],
    });

    const userConnectionIds = new Set(
      userConnections.map((connection) =>
        connection.requesterId === userId ? connection.receiverId : connection.requesterId
      )
    );

    const result = await Promise.all(
      connections.map(async (connection) => {
        const user = users.find((user) => user.id === connection.requesterId || user.id === connection.receiverId);
        const profilePictureUrl = user?.userProfileKey
          ? await generatePresignedUrl(user.userProfileKey)
          : null;
        const isMutual = userConnectionIds.has(user?.id || '');
        return {
          connectionId: connection.id,
          userId: user?.id,
          firstName: user?.firstName,
          lastName: user?.lastName,
          userType: user?.userType,
          profilePictureUrl: profilePictureUrl,
          // meeted: connection.updatedAt ? formatTimestamp(connection.updatedAt) : formatTimestamp(connection.createdAt),
          mutual: isMutual,
        };
      })
    );

    return res.status(200).json({ connections: result });
  } catch (error: any) {
    console.error('Error fetching user connections:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};


// get user followers
export const getUserFollowers = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = req.body;

  try {
    const connectionRepository = AppDataSource.getRepository(Connections);
    const userRepository = AppDataSource.getRepository(UserAuth);
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const followers = await connectionRepository.find({
      where: { receiverId: userId, status: 'accepted' },
    });
    const followersDetails = await userRepository.find({
      where: { id: In(followers.map((follower) => follower.requesterId)) },
    });
    const result = await Promise.all(
      followersDetails.map(async (follower) => {
        const profilePictureUrl = follower.userProfileKey
          ? await generatePresignedUrl(follower.userProfileKey)
          : null;
        return {
          userId: follower.id,
          firstName: follower.firstName,
          lastName: follower.lastName,
          profilePictureUrl: profilePictureUrl,
        };
      })
    );
    return res.status(200).json({ followers: result });
  } catch (error: any) {
    console.error('Error fetching user followers:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};



// Remove a connection
export const removeConnection = async (req: Request, res: Response): Promise<Response> => {
  const { connectionId } = req.body;

  try {
    const connectionRepository = AppDataSource.getRepository(Connections);

    const connection = await connectionRepository.findOneBy({ id: connectionId });

    if (!connection) {
      return res.status(404).json({ message: 'Connection not found.' });
    }

    await connectionRepository.remove(connection);

    return res.status(200).json({ message: 'Connection removed successfully.' });
  } catch (error: any) {
    console.error('Error removing connection:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// get user connection
export const getUserConnectionRequests = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body; // Get user ID from request body

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    const connectionRepository = AppDataSource.getRepository(Connections);

    // Fetch pending connection requests
    const connectionRequests = await connectionRepository.find({
      where: {
        receiverId: userId,
        status: 'pending',
      },
    });

    if (!connectionRequests || connectionRequests.length === 0) {
      return res.status(204).json({ message: 'No connection requests found.' });
    }

    const userIds = [...new Set(connectionRequests.map((connection) => connection.requesterId))];

    const userRepository = AppDataSource.getRepository(UserAuth);

    const users = await userRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'firstName', 'lastName', 'userProfileKey', 'userType'],
    });

    // Create a response with connection requests and their respective user details
    const response = await Promise.all(
      connectionRequests.map(async (connection) => {
        const user = users.find((u) => u.id === connection.requesterId);
        const profilePictureUploadUrl = user?.userProfileKey
          ? await generatePresignedUrl(user.userProfileKey)
          : null;

        return {
          connectionId: connection.id,
          requesterId: connection.requesterId,
          receiverId: connection.receiverId,
          status: connection.status,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
          requesterDetails: user,
          profilePictureUploadUrl,
        };
      })
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching connection requests:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

export const unsendConnectionRequest = async (req: Request, res: Response): Promise<Response> => {
  const { requesterId, receiverId } = req.body;
  try {
    const connectionRepository = AppDataSource.getRepository(Connections);
    const connection = await connectionRepository.findOne({
      where: { requesterId, receiverId, status: 'pending' },
    });

    if (!connection) {
      return res.status(404).json({
        message: 'Connection request not found or already processed.',
      });
    }

    await connectionRepository.remove(connection);

    return res.status(200).json({
      message: 'Connection request unsent successfully.',
    });
  } catch (error: any) {
    console.error('Error unsending connection request:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

export const ConnectionsSuggestionController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId, page = 1, limit = 5 } = req.body;

    const offset = (page - 1) * limit;

    const userRepository = AppDataSource.getRepository(UserAuth);

    const [users, total] = await userRepository.findAndCount({
      skip: offset,
      take: limit,
    });

    const connectionRepository = AppDataSource.getRepository(Connections);
    const connections = await connectionRepository.find({
      where: [
        {
          requesterId: userId,
          status: In(['pending', 'accepted', 'rejected']),
        },
        {
          receiverId: userId,
          status: In(['pending', 'accepted', 'rejected']),
        },
      ],
    });

    const connectedUserIds = connections.map((connection) => connection.receiverId);

    const shuffleArray = (array: any[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    const filteredUsers = users.filter((user) => user.id !== userId && !connectedUserIds.includes(user.id));

    const shuffledUsers = shuffleArray(filteredUsers);

    const result = await Promise.all(
      shuffledUsers.map(async (user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        occupation: user.occupation,
        userType: user.userType,
        profilePictureUrl: user.userProfileKey ? await generatePresignedUrl(user.userProfileKey) : null,
      }))
    );

    return res.status(200).json({
      success: true,
      message: 'Suggested users fetched successfully.',
      data: result,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('Error fetching connection suggestions:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

export class ConnectionController {
  static async fetchUserConnectionsStatus(req: Request, res: Response) {
    const { requesterId, status } = req.body;

    try {
      if (!requesterId || !status) {
        return res.status(400).json({ message: 'Both requesterId and status are required.' });
      }
      const validStatuses = ['pending', 'accepted', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Valid values are: ${validStatuses.join(', ')}` });
      }

      // Fetch connections from the database
      const connectionRepository = AppDataSource.getRepository(Connections);
      const connections = await connectionRepository.find({
        where: { requesterId, status },
        relations: ['receiver'],
      });

      if (connections.length < 1) {
        return res.status(404).json({ message: 'No connections found.' });
      }
      return res.status(200).json(connections);
    } catch (error: any) {
      console.error('Error fetching user connections status:', error);
      return res.status(500).json({
        message: 'An error occurred while fetching connections.',
        error: error.message,
      });
    }
  }
}
