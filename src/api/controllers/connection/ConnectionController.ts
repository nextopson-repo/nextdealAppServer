import { UserAuth } from "@/api/entity";
import { Connections } from "@/api/entity/Connection";
import { BlockUser } from "@/api/entity/BlockUser";
import { UserReport, ReportStatus } from "@/api/entity/UserReport";
import { NotificationType } from "@/api/entity/Notifications";
import { AppDataSource } from "@/server";
import { Request, Response } from 'express';
import { generateNotification } from "../notification/NotificationController";
import { In } from "typeorm";
import { generatePresignedUrl } from "../s3/awsControllers";

// ===== FOLLOW/UNFOLLOW FUNCTIONALITY =====

// Send a follow request (like YouTube subscribe)
export const sendConnectionRequest = async (req: Request, res: Response): Promise<Response> => {
  const { requesterId, receiverId } = req.body;
  try {
    const userRepository = AppDataSource.getRepository(UserAuth);
    const connectionRepository = AppDataSource.getRepository(Connections);
    const blockRepository = AppDataSource.getRepository(BlockUser);

    // Check if users exist
    const requester = await userRepository.findOne({ where: { id: requesterId } });
    const receiver = await userRepository.findOne({ where: { id: receiverId } });

    if (!requester) {
      return res.status(404).json({ message: 'Requester not found.' });
    }
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found.' });
    }

    // Check if either user has blocked the other
    const isBlocked = await blockRepository.findOne({
      where: [
        { blockerId: requesterId, blockedUserId: receiverId, isActive: true },
        { blockerId: receiverId, blockedUserId: requesterId, isActive: true }
      ]
    });

    if (isBlocked) {
      return res.status(403).json({ message: 'Cannot follow this user due to blocking.' });
    }

    // Check if connection already exists
    const existingConnection = await connectionRepository.findOne({
      where: [
        { requesterId, receiverId },
        { requesterId: receiverId, receiverId: requesterId },
      ],
    });

    if (existingConnection) {
      return res.status(400).json({ message: 'Connection already exists.' });
    }
    
    // Create new connection
    const newConnection = connectionRepository.create({
      requesterId,
      receiverId,
      notificationEnabled: true, // Default to notifications enabled
      isMuted: false,
      createdBy: requesterId,
      updatedBy: requesterId,
    });
    await connectionRepository.save(newConnection);

    // Create notification for receiver
    await generateNotification(
      receiverId,
      `${requester.fullName || requester.firstName} started following you`,
      requester.userProfileKey || '',
      NotificationType.OTHER,
      `${requester.fullName || requester.firstName}`,
      'View Profile',
      undefined,
      'New Follower'
    );

    return res.status(201).json({
      message: 'Follow request sent successfully.',
      connection: newConnection,
    });
  } catch (error) {
    console.error('Error sending follow request:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Unfollow user (remove connection)
export const unfollowUser = async (req: Request, res: Response): Promise<Response> => {
  const { requesterId, receiverId } = req.body;
  try {
    const connectionRepository = AppDataSource.getRepository(Connections);
    
    const connection = await connectionRepository.findOne({
      where: { requesterId, receiverId },
    });

    if (!connection) {
      return res.status(404).json({ message: 'Connection not found.' });
    }

    await connectionRepository.remove(connection);

    return res.status(200).json({
      message: 'Unfollowed successfully.',
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Toggle notification settings (bell on/off like YouTube)
export const toggleNotificationSettings = async (req: Request, res: Response): Promise<Response> => {
  const { requesterId, receiverId, notificationEnabled } = req.body;
  try {
    const connectionRepository = AppDataSource.getRepository(Connections);
    
    const connection = await connectionRepository.findOne({
      where: { requesterId, receiverId },
    });

    if (!connection) {
      return res.status(404).json({ message: 'Connection not found.' });
    }

    connection.notificationEnabled = notificationEnabled;
    connection.updatedBy = requesterId;
    await connectionRepository.save(connection);

    return res.status(200).json({
      message: `Notifications ${notificationEnabled ? 'enabled' : 'disabled'} successfully.`,
      connection,
    });
  } catch (error) {
    console.error('Error toggling notification settings:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Mute user (like Instagram mute)
export const muteUser = async (req: Request, res: Response): Promise<Response> => {
  const { requesterId, receiverId, isMuted } = req.body;
  try {
    const connectionRepository = AppDataSource.getRepository(Connections);

    const connection = await connectionRepository.findOne({
      where: { requesterId, receiverId },
    });

    if (!connection) {
      return res.status(404).json({ message: 'Connection not found.' });
    }

    connection.isMuted = isMuted;
    connection.updatedBy = requesterId;
    await connectionRepository.save(connection);

    return res.status(200).json({
      message: `User ${isMuted ? 'muted' : 'unmuted'} successfully.`,
      connection,
    });
  } catch (error) {
    console.error('Error muting user:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ===== BLOCKING FUNCTIONALITY =====

// Block a user
export const blockUser = async (req: Request, res: Response): Promise<Response> => {
  const { blockerId, blockedUserId, reason } = req.body;
  try {
    const userRepository = AppDataSource.getRepository(UserAuth);
    const blockRepository = AppDataSource.getRepository(BlockUser);
    const connectionRepository = AppDataSource.getRepository(Connections);

    // Check if users exist
    const blocker = await userRepository.findOne({ where: { id: blockerId } });
    const blockedUser = await userRepository.findOne({ where: { id: blockedUserId } });

    if (!blocker || !blockedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if already blocked
    const existingBlock = await blockRepository.findOne({
      where: { blockerId, blockedUserId, isActive: true },
    });

    if (existingBlock) {
      return res.status(400).json({ message: 'User is already blocked.' });
    }

    // Create block
    const newBlock = blockRepository.create({
      blockerId,
      blockedUserId,
      reason,
      isActive: true,
      createdBy: blockerId,
      updatedBy: blockerId,
    });
    await blockRepository.save(newBlock);

    // Remove any existing connections between the users
    await connectionRepository.delete([
      { requesterId: blockerId, receiverId: blockedUserId },
      { requesterId: blockedUserId, receiverId: blockerId },
    ]);

    return res.status(201).json({
      message: 'User blocked successfully.',
      block: newBlock,
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Unblock a user
export const unblockUser = async (req: Request, res: Response): Promise<Response> => {
  const { blockerId, blockedUserId } = req.body;
  try {
    const blockRepository = AppDataSource.getRepository(BlockUser);
    
    const block = await blockRepository.findOne({
      where: { blockerId, blockedUserId, isActive: true },
    });

    if (!block) {
      return res.status(404).json({ message: 'Block not found.' });
    }

    block.isActive = false;
    block.updatedBy = blockerId;
    await blockRepository.save(block);

    return res.status(200).json({
      message: 'User unblocked successfully.',
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get blocked users
export const getBlockedUsers = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = req.body;
  try {
    const blockRepository = AppDataSource.getRepository(BlockUser);
    const userRepository = AppDataSource.getRepository(UserAuth);

    const blocks = await blockRepository.find({
      where: { blockerId: userId, isActive: true },
      relations: ['blockedUser'],
    });

    const blockedUsers = await Promise.all(
      blocks.map(async (block) => {
        const user = block.blockedUser;
        const profilePictureUrl = user?.userProfileKey
          ? await generatePresignedUrl(user.userProfileKey)
          : null;

        return {
          blockId: block.id,
          userId: user?.id,
          fullName: user?.fullName,
          userType: user?.userType,
          profilePictureUrl,
          blockedAt: block.createdAt,
          reason: block.reason,
        };
      })
    );

    return res.status(200).json({ blockedUsers });
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Check if user is blocked
export const isUserBlocked = async (req: Request, res: Response): Promise<Response> => {
  const { userId, targetUserId } = req.body;
  try {
    const blockRepository = AppDataSource.getRepository(BlockUser);
    
    const block = await blockRepository.findOne({
      where: [
        { blockerId: userId, blockedUserId: targetUserId, isActive: true },
        { blockerId: targetUserId, blockedUserId: userId, isActive: true },
      ],
    });

    return res.status(200).json({
      isBlocked: !!block,
      blockDetails: block ? {
        blockId: block.id,
        blockerId: block.blockerId,
        blockedUserId: block.blockedUserId,
        reason: block.reason,
        blockedAt: block.createdAt,
      } : null,
    });
  } catch (error) {
    console.error('Error checking block status:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ===== REPORTING FUNCTIONALITY =====

// Report a user
export const reportUser = async (req: Request, res: Response): Promise<Response> => {
  const { reporterId, reportedUserId, reason, description } = req.body;
  try {
    const userRepository = AppDataSource.getRepository(UserAuth);
    const reportRepository = AppDataSource.getRepository(UserReport);

    // Check if users exist
    const reporter = await userRepository.findOne({ where: { id: reporterId } });
    const reportedUser = await userRepository.findOne({ where: { id: reportedUserId } });

    if (!reporter || !reportedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if already reported recently (prevent spam)
    const recentReport = await reportRepository.findOne({
      where: {
        reporterId,
        reportedUserId,
        status: ReportStatus.PENDING,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    });

    if (recentReport) {
      return res.status(400).json({ message: 'You have already reported this user recently.' });
    }

    // Create report
    const newReport = reportRepository.create({
      reporterId,
      reportedUserId,
      reason,
      description,
      status: ReportStatus.PENDING,
      createdBy: reporterId,
      updatedBy: reporterId,
    });
    await reportRepository.save(newReport);

    return res.status(201).json({
      message: 'User reported successfully.',
      report: newReport,
    });
  } catch (error) {
    console.error('Error reporting user:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get user reports (admin only)
export const getUserReports = async (req: Request, res: Response): Promise<Response> => {
  const { userId, status, page = 1, limit = 10 } = req.body;
  try {
    const reportRepository = AppDataSource.getRepository(UserReport);
    const userRepository = AppDataSource.getRepository(UserAuth);

    // Check if user is admin
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    const offset = (page - 1) * limit;
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const [reports, total] = await reportRepository.findAndCount({
      where: whereClause,
      relations: ['reporter', 'reportedUser'],
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const reportsWithDetails = await Promise.all(
      reports.map(async (report) => {
        const reporterProfileUrl = report.reporter?.userProfileKey
          ? await generatePresignedUrl(report.reporter.userProfileKey)
          : null;
        const reportedProfileUrl = report.reportedUser?.userProfileKey
          ? await generatePresignedUrl(report.reportedUser.userProfileKey)
          : null;

        return {
          reportId: report.id,
          reporter: {
            id: report.reporter?.id,
            fullName: report.reporter?.fullName,
            userType: report.reporter?.userType,
            profilePictureUrl: reporterProfileUrl,
          },
          reportedUser: {
            id: report.reportedUser?.id,
            fullName: report.reportedUser?.fullName,
            userType: report.reportedUser?.userType,
            profilePictureUrl: reportedProfileUrl,
          },
          reason: report.reason,
          description: report.description,
          status: report.status,
          adminNotes: report.adminNotes,
          createdAt: report.createdAt,
        };
      })
    );

    return res.status(200).json({ 
      reports: reportsWithDetails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Update report status (admin only)
export const updateReportStatus = async (req: Request, res: Response): Promise<Response> => {
  const { userId, reportId, status, adminNotes } = req.body;
  try {
    const reportRepository = AppDataSource.getRepository(UserReport);
    const userRepository = AppDataSource.getRepository(UserAuth);

    // Check if user is admin
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    const report = await reportRepository.findOne({
      where: { id: reportId },
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    report.status = status;
    report.adminNotes = adminNotes;
    report.updatedBy = userId;
    await reportRepository.save(report);

    return res.status(200).json({
      message: 'Report status updated successfully.',
      report,
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ===== EXISTING FUNCTIONS (UPDATED) =====

// Get user's connections (followers and following)
export const getUserConnections = async (req: Request, res: Response): Promise<Response> => {
  const { profileId, userId } = req.body;

  try {
    const connectionRepository = AppDataSource.getRepository(Connections);
    const blockRepository = AppDataSource.getRepository(BlockUser);
    
    // Get all connections
    const connections = await connectionRepository.find({
      where: [
        { requesterId: profileId },
        { receiverId: profileId },
      ],
    });

    if (!connections || connections.length === 0) {
      return res.status(404).json({ message: 'No connections found.' });
    }

    // Get blocked users to filter out
    const blockedUsers = await blockRepository.find({
      where: [
        { blockerId: profileId, isActive: true },
        { blockedUserId: profileId, isActive: true },
      ],
    });

    const blockedUserIds = new Set([
      ...blockedUsers.map(b => b.blockerId),
      ...blockedUsers.map(b => b.blockedUserId),
    ]);

    const userRepository = AppDataSource.getRepository(UserAuth);
    const userIds = [
      ...Array.from(new Set(connections.map((connection) => connection.requesterId))),
      ...Array.from(new Set(connections.map((connection) => connection.receiverId))),
    ].filter((id) => id !== profileId && !blockedUserIds.has(id));

    const users = await userRepository.find({
      where: { id: In(userIds) },
      select: ['id', 'firstName', 'lastName', 'fullName', 'userProfileKey', 'userType'],
    });

    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No users found.' });
    }

    // Get user's own connections for mutual check
    const userConnections = await connectionRepository.find({
      where: [
        { requesterId: userId },
        { receiverId: userId },
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
        if (!user || blockedUserIds.has(user.id)) return null;

        const profilePictureUrl = user?.userProfileKey
          ? await generatePresignedUrl(user.userProfileKey)
          : null;
        const isMutual = userConnectionIds.has(user?.id || '');
        const isFollowing = connection.requesterId === userId;
        const isFollower = connection.receiverId === userId;

        return {
          connectionId: connection.id,
          userId: user?.id,
          fullName: user?.fullName || `${user?.firstName} ${user?.lastName}`,
          userType: user?.userType,
          profilePictureUrl: profilePictureUrl,
          mutual: isMutual,
          isFollowing,
          isFollower,
          notificationEnabled: connection.notificationEnabled,
          isMuted: connection.isMuted,
        };
      }).filter(Boolean)
    );

    return res.status(200).json({ connections: result });
  } catch (error: any) {
    console.error('Error fetching user connections:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get user followers
export const getUserFollowers = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = req.body;

  try {
    const connectionRepository = AppDataSource.getRepository(Connections);
    const userRepository = AppDataSource.getRepository(UserAuth);
    const blockRepository = AppDataSource.getRepository(BlockUser);

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Get followers
    const followers = await connectionRepository.find({
      where: { receiverId: userId },
    });

    // Get blocked users
    const blockedUsers = await blockRepository.find({
      where: [
        { blockerId: userId, isActive: true },
        { blockedUserId: userId, isActive: true },
      ],
    });

    const blockedUserIds = new Set([
      ...blockedUsers.map(b => b.blockerId),
      ...blockedUsers.map(b => b.blockedUserId),
    ]);

    // Filter out blocked users
    const validFollowers = followers.filter(f => !blockedUserIds.has(f.requesterId));

    const followersDetails = await userRepository.find({
      where: { id: In(validFollowers.map((follower) => follower.requesterId)) },
    });

    const result = await Promise.all(
      followersDetails.map(async (follower) => {
        const profilePictureUrl = follower.userProfileKey
          ? await generatePresignedUrl(follower.userProfileKey)
          : null;
        return {
          userId: follower.id,
          fullName: follower.fullName || `${follower.firstName} ${follower.lastName}`,
          userType: follower.userType,
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

// Get user followings
export const getUserFollowings = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = req.body;

  try {
    const connectionRepository = AppDataSource.getRepository(Connections);
    const userRepository = AppDataSource.getRepository(UserAuth);
    const blockRepository = AppDataSource.getRepository(BlockUser);

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Get followings
    const followings = await connectionRepository.find({
      where: { requesterId: userId },
    });

    // Get blocked users
    const blockedUsers = await blockRepository.find({
      where: [
        { blockerId: userId, isActive: true },
        { blockedUserId: userId, isActive: true },
      ],
    });

    const blockedUserIds = new Set([
      ...blockedUsers.map(b => b.blockerId),
      ...blockedUsers.map(b => b.blockedUserId),
    ]);

    // Filter out blocked users
    const validFollowings = followings.filter(f => !blockedUserIds.has(f.receiverId));

    const followingsDetails = await userRepository.find({
      where: { id: In(validFollowings.map((following) => following.receiverId)) },
    });

    const result = await Promise.all(
      followingsDetails.map(async (following) => {
        const profilePictureUrl = following.userProfileKey
          ? await generatePresignedUrl(following.userProfileKey)
          : null;
        return {
          userId: following.id,
          fullName: following.fullName || `${following.firstName} ${following.lastName}`,
          userType: following.userType,
          profilePictureUrl: profilePictureUrl,
        };
      })
    );
    return res.status(200).json({ followings: result });
  } catch (error: any) {
    console.error('Error fetching user followings:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Check if user is a follower of another user
export const isFollower = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId, followerId } = req.body;

    if (!userId || !followerId) {
      return res.status(400).json({ message: 'Both userId and followerId are required.' });
    }

    const connectionRepository = AppDataSource.getRepository(Connections);
    const connection = await connectionRepository.findOne({ 
      where: {
        requesterId: followerId, 
        receiverId: userId 
      } 
    });
    
    return res.status(200).json({ 
      isFollower: !!connection,
      connectionId: connection?.id || null,
      notificationEnabled: connection?.notificationEnabled || false,
      isMuted: connection?.isMuted || false,
    });
  } catch (error) {
    console.error('Error checking follower status:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Check if user is following another user
export const isFollowing = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId, followingId } = req.body;
    
    if (!userId || !followingId) {
      return res.status(400).json({ message: 'Both userId and followingId are required.' });
    }

    const connectionRepository = AppDataSource.getRepository(Connections);
    const connection = await connectionRepository.findOne({
      where: { 
        requesterId: userId, 
        receiverId: followingId 
      } 
    });

    return res.status(200).json({
      isFollowing: !!connection,
      connectionId: connection?.id || null,
      notificationEnabled: connection?.notificationEnabled || false,
      isMuted: connection?.isMuted || false,
    });
  } catch (error) {
    console.error('Error checking following status:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Connection suggestions (excluding blocked users)
export const ConnectionsSuggestionController = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { userId, page = 1, limit = 5 } = req.body;

    const offset = (page - 1) * limit;

    const userRepository = AppDataSource.getRepository(UserAuth);
    const connectionRepository = AppDataSource.getRepository(Connections);
    const blockRepository = AppDataSource.getRepository(BlockUser);

    const [users, total] = await userRepository.findAndCount({
      skip: offset,
      take: limit,
    });

    // Get user's connections
    const connections = await connectionRepository.find({
      where: [
        { requesterId: userId },
        { receiverId: userId },
      ],
    });

    const connectedUserIds = new Set([
      ...Array.from(new Set(connections.map((connection) => connection.requesterId))),
      ...Array.from(new Set(connections.map((connection) => connection.receiverId))),
    ]);

    // Get blocked users
    const blockedUsers = await blockRepository.find({
      where: [
        { blockerId: userId, isActive: true },
        { blockedUserId: userId, isActive: true },
      ],
    });

    const blockedUserIds = new Set([
      ...blockedUsers.map(b => b.blockerId),
      ...blockedUsers.map(b => b.blockedUserId),
    ]);

    const shuffleArray = (array: any[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    // Filter out connected and blocked users
    const filteredUsers = users.filter((user) => 
      user.id !== userId && 
      !connectedUserIds.has(user.id) && 
      !blockedUserIds.has(user.id)
    );

    const shuffledUsers = shuffleArray(filteredUsers);

    const result = await Promise.all(
      shuffledUsers.map(async (user) => ({
        id: user.id,
        fullName: user.fullName || `${user.firstName} ${user.lastName}`,
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