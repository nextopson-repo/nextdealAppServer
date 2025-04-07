import express from 'express';
import { createInvoice, getInvoices } from "../../controllers/invoice/InvoiceControllers";
import { authenticate } from '@/api/middlewares/auth/Authenticate';

const Router = express.Router();

Router.post('/create-invoice', createInvoice);
Router.post('/get-invoices', authenticate, getInvoices);

export default Router;