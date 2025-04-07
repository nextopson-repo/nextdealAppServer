import express from 'express';

import {
    getYourServices,
    // addService,
    acceptService,
    rejectService,
    completeService,

    addOrUpdateProvidedService,
    getProvidedService,
    deleteProvidedService,

    getServiceJobsBy_Year_Month_Week,
    totalAmountBy_Year_Month_Week,
    getAvgPricePerMonthForCurrentYear,
    compareAvgPriceWithPreviousMonth,
    totalSalesSubCategoryWise,

    getQuestions,
} from '@/api/controllers/orderManagement/ServiceProvider';
import { authenticate } from '@/api/middlewares/auth/Authenticate';

const Router = express.Router();

Router.post('/', getYourServices);
// Router.post('/service-provider/add-service', addService);
Router.post('/accept', authenticate, acceptService);
Router.post('/reject', authenticate, rejectService);
Router.post('/complete', authenticate, completeService);

Router.post('/service-management/get', authenticate, getProvidedService);
Router.post('/service-management/add-or-update', authenticate, addOrUpdateProvidedService);
Router.delete('/service-management', authenticate, deleteProvidedService);

Router.post('/service-management/questions', getQuestions);

// home
Router.post('/by_year_month_week', authenticate, getServiceJobsBy_Year_Month_Week);
Router.post('/sales/overview/by_year_month_week', authenticate, totalAmountBy_Year_Month_Week);
Router.post('/sales/by_subCategories/by_year_month_week', authenticate, totalSalesSubCategoryWise);
Router.post('/avg_order_price_yearly', authenticate, getAvgPricePerMonthForCurrentYear);
Router.post('/compare_avg_order_price_monthly', authenticate, compareAvgPriceWithPreviousMonth);

export default Router;
