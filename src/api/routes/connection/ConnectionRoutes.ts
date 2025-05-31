import express from 'express';
import router from '../UpdateProfileRoute/updateProfileRoute';
import { ConnectionController, ConnectionsSuggestionController, getUserConnectionRequests, getUserConnections, removeConnection, sendConnectionRequest, unsendConnectionRequest, updateConnectionStatus } from '@/api/controllers/connection/ConnectionController';

const Router = express.Router();
 

router.post('/send-connection-request', sendConnectionRequest);
router.post('/update-connection-status', updateConnectionStatus);
router.post('/get-user-connections', getUserConnections);
router.post('/remove-connection', removeConnection);
router.post('/get-user-connection-requests', getUserConnectionRequests);
router.post('/unsend-connection-request', unsendConnectionRequest);
router.post('/Connections-suggestion-controller', ConnectionsSuggestionController);
router.post('/fetch-user-connections-status', ConnectionController.fetchUserConnectionsStatus);





export default Router;
