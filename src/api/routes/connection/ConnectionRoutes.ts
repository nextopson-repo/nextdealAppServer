import { ConnectionController, ConnectionsSuggestionController, getUserConnectionRequests, getUserConnections, getUserFollowers, removeConnection, sendConnectionRequest, unsendConnectionRequest, updateConnectionStatus } from '@/api/controllers/connection/ConnectionController';
import express from 'express';

const Router = express.Router();


Router.post('/send-follow-request', sendConnectionRequest);
Router.post('/update-follow-status', updateConnectionStatus);
Router.post('/get-user-followings', getUserConnections);
Router.post('/remove-follow', removeConnection);
Router.post('/get-user-follow-requests', getUserConnectionRequests);
Router.post('/unsend-follow-request', unsendConnectionRequest);
Router.post('/follow-suggestion', ConnectionsSuggestionController);
Router.post('/fetch-user-followings-status', ConnectionController.fetchUserConnectionsStatus);
Router.post('/fetch-user-followers', getUserFollowers);


export default Router;
