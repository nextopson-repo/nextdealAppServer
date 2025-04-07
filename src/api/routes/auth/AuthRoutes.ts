import express from 'express';

import {
  sendVerificationCode,
  verifyCode,
  sendVerificationCode_mobile_app,
} from '../../controllers/auth/ContactVerifications';
import {
  login,
  generateUuidToken,
  verifyUuidToken,
  refresh,
  verifyCode_mobile_app,
} from '../../controllers/auth/Login';
import { logout } from '../../controllers/auth/Logout';
import { changePassword, resetPassword } from '../../controllers/auth/ResetPassword';
import { signup } from '../../controllers/auth/Signup';
import {
  generateUploadUrl,
  addDocumentUpload,
  getDocumentFromBucket,
} from '../../controllers/awsFuctions/AwsFunctions';
import { authenticate } from '../../middlewares/auth/Authenticate';

const Router = express.Router();

Router.post('/verification/generate', sendVerificationCode);
Router.post('/verification/verify', verifyCode);

Router.post('/signup', signup);

Router.post('/login', login);
Router.post('/generate-login-token', generateUuidToken);
Router.post('/verify-login-token', verifyUuidToken);
Router.post('/logout', authenticate, logout);

Router.post('/generate-otp-customer-app', sendVerificationCode_mobile_app);
Router.post('/verify-otp-customer-app', verifyCode_mobile_app);

Router.post('/refresh', refresh);

Router.post('/generate-upload-url', generateUploadUrl);
Router.post('/document-retrival', getDocumentFromBucket);
Router.post('/list-uploaded-document', addDocumentUpload);

// Router.post('/forgot-password/generate', sendNumberVerificationToken);
// Router.post('/forgot-password/verify', verifyCodeForPasswordReset);
Router.post('/forgot-password/reset', resetPassword);

Router.post('/change-password', authenticate, changePassword);
export default Router;
