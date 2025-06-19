import { 
  ConnectionsSuggestionController, 
  getUserConnections, 
  getUserFollowers, 
  getUserFollowings, 
  isFollower, 
  isFollowing, 
  sendConnectionRequest,
  unfollowUser,
  toggleNotificationSettings,
  muteUser,
  blockUser,
  unblockUser,
  getBlockedUsers,
  isUserBlocked,
  reportUser,
  getUserReports,
  updateReportStatus
} from '@/api/controllers/connection/ConnectionController';
import express from 'express';

const Router = express.Router();

// ===== FOLLOW/UNFOLLOW ROUTES =====
Router.post('/follow', sendConnectionRequest);
Router.post('/unfollow', unfollowUser);
Router.post('/toggle-notifications', toggleNotificationSettings);
Router.post('/mute-user', muteUser);

// ===== CONNECTION QUERY ROUTES =====
Router.post('/get-user-connections', getUserConnections);
Router.post('/get-user-followers', getUserFollowers);
Router.post('/get-user-followings', getUserFollowings);
Router.post('/is-follower', isFollower);
Router.post('/is-following', isFollowing);
Router.post('/follow-suggestions', ConnectionsSuggestionController);

// ===== BLOCKING ROUTES =====
Router.post('/block-user', blockUser);
Router.post('/unblock-user', unblockUser);
Router.post('/get-blocked-users', getBlockedUsers);
Router.post('/is-user-blocked', isUserBlocked);

// ===== REPORTING ROUTES =====
Router.post('/report-user', reportUser);
Router.post('/get-user-reports', getUserReports);
Router.post('/update-report-status', updateReportStatus);

export default Router;
