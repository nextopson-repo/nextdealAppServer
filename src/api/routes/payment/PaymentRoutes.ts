import express from 'express';

import { createOrder, verifyPayment } from "../../controllers/payment/Payment";
import { authenticate } from '@/api/middlewares/auth/Authenticate';

const Router = express.Router();

Router.post('/order', authenticate , createOrder);
Router.post('/verify', authenticate , verifyPayment);

export default Router;