import express from 'express';

import { getCategories, postCategories } from '@/api/controllers/category/CategoryController';
import { getSubCategories, postSubCategories } from '@/api/controllers/category/SubCategoryController';
import { getService, postService } from '../../controllers/category/ServiceController';

const Router = express.Router();

Router.post('/sector-wise', getCategories);
Router.post('/add-category', postCategories);
Router.get('/category/sub-category', getSubCategories);
Router.post('/category/add-sub-category', postSubCategories);
Router.get('/category/add-service', getService);
Router.post('/category/add-service', postService);

export default Router;
