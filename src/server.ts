import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import { pino } from 'pino';
import swaggerUi from 'swagger-ui-express';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as tf from '@tensorflow/tfjs-node';

// import fileUpload from 'express-fileupload'; // Add this import

import errorHandler from '@/common/middleware/errorHandler';
import rateLimiter from '@/common/middleware/rateLimiter';
import requestLogger from '@/common/middleware/requestLogger';

import { UserAuth } from './api/entity';
import authRoutes from './api/routes/auth/AuthRoutes';
import s3bucket from './api/routes/aws/s3';
import Profile from './api/routes/UpdateProfileRoute/updateProfileRoute';
import DropDownRouter from './api/routes/dropDown/dropdown';
import { swaggerSpec } from './config/swagger';
import { Property } from './api/entity/Property';
import { Address } from './api/entity/Address';
import { UserCredibility } from './api/entity/ Credibility';
import { SavedProperty } from './api/entity/SavedProperties';
import property from './api/routes/PropertyRoutes/PropertyRoute';
import { PropertyRequirement } from './api/entity/PropertyRequirement';
import { DropdownOptions } from './api/entity/DropdownOptions';
// Ensure this path is correct
import kycProcessRoutes from './api/routes/kycProcess/kycProcessRoutes';
import { UserKyc } from './api/entity/userkyc';
import { RepublishProperty } from './api/entity/RepublishProperties';

import DashboardRoute from './api/routes/dashboardRoutes/DashboardRoutes';
import republishRoutes from './api/routes/dashboardRoutes/republishedRoute'; // Ensure this path is correct
import { PropertyImages } from './api/entity/PropertyImages';
import { Location } from './api/entity/Location';
import { initializeSocket } from './socket';
import { PropertyEnquiry } from './api/entity/PropertyEnquiry';
import { Notifications } from './api/entity/Notifications';
import NotificationRoutes from './api/routes/notificationsRoutes/NotificationRoutes';

import ConnectionRoutes from './api/routes/connection/ConnectionRoutes';
import { Connections } from './api/entity/Connection';
import SocketNotificationRoute from './api/routes/notificationsRoutes/SocketNotificationRoute'
import { UserReview } from './api/entity/UserReview.js';
import reviewRoutes from './api/routes/review/reviewRoute';
import { ModelLoader } from './ml-models/modelLoader';
const logger = pino({ name: 'server start' });
const app: Express = express();

// Create a DataSource instance
const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.NODE_ENV === 'production' ? process.env.DEV_AWS_HOST : process.env.LOCAL_DB_HOST,
  port: 3306,
  username: process.env.NODE_ENV === 'production' ? process.env.DEV_AWS_USERNAME : process.env.LOCAL_DB_USERNAME,
  password: process.env.NODE_ENV === 'production' ? process.env.DEV_AWS_PASSWORD : process.env.LOCAL_DB_PASSWORD,
  database: process.env.NODE_ENV === 'production' ? process.env.DEV_AWS_DB_NAME : process.env.LOCAL_DB_NAME,
  entities: [
    UserAuth,
    Property,
    Address,
    UserCredibility,
    SavedProperty,
    PropertyRequirement,
    DropdownOptions,
    UserKyc,
    RepublishProperty,
    PropertyImages,
    Location,
    PropertyEnquiry,
    Notifications,
    Connections,
    UserReview
  ],
  synchronize: true,
  logging: false,
  entitySkipConstructor: true,
  connectTimeout: 60000, // Increase connection timeout to 60 seconds
  extra: {
    connectionLimit: 10, // Limit connections to prevent overloading
    connectTimeout: 60000, // MySQL specific timeout option
    acquireTimeout: 60000, // MySQL specific acquire timeout
  },
};

const AppDataSource = new DataSource(dataSourceOptions);

// Serve the public folder for Swagger UI assets
// app.use(express.static('dist/public'));
// Swagger UI setup
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'NextDeal API Documentation',
  })
);

// Initialize the DataSource before setting up routes
AppDataSource.initialize()
  .then(async () => {
    logger.info('Database connection has been established successfully.');
    
    // Initialize ML models
    try {
      const modelLoader = ModelLoader.getInstance();
      await modelLoader.loadModels();
      logger.info('ML models loaded successfully');
    } catch (error) {
      logger.error('Error loading ML models:', error);
      // Continue server startup even if models fail to load
    }
  })
  .catch((error) => {
    logger.error('Error during Data Source initialization:', error);
    if (error.code === 'ETIMEDOUT') {
      logger.error(
        'Database connection timed out. Check network connectivity to RDS instance and security group settings.'
      );
    } else if (error.code === 'ECONNREFUSED') {
      logger.error('Database connection refused. Make sure the database server is running and accepting connections.');
    }
  });

// Set the application to trust the reverse proxy
app.set('trust proxy', true);

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: function (origin, callback) {
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(helmet());
// app.use(rateLimiter);
app.use(requestLogger);
app.use(express.json());

// Routes mounting
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/s3', s3bucket);
app.use('/api/v1/property', property);
app.use('/api/v1/profile', Profile);
app.use('/api/v1/dropdown', DropDownRouter);
app.use('/api/v1/kyc', kycProcessRoutes);
app.use('/api/v1/dashboard', DashboardRoute);
app.use('/api/v1/republish', republishRoutes);
app.use('/api/v1/notification', NotificationRoutes);
app.use('/api/v1/connection' , ConnectionRoutes);
app.use('/api/v1/notification', SocketNotificationRoute);
app.use('/api/v1/review', reviewRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to nextdeal');
});

// User message API endpoint
app.get('/api/v1/user-message', (req, res) => {
  res.json({
    message: "Built with ❤️ in Bhopal, India"
  });
});

// Error handlers
app.use(errorHandler());

// Initialize HTTP server and WebSocket
const httpServer = initializeSocket(app);

// Graceful shutdown handlers
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal');

  // Close HTTP server
  if (httpServer) {
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });
  }

  // Close database connection
  if (AppDataSource.isInitialized) {
    try {
      await AppDataSource.destroy();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
    }
  }

  // Exit process
  process.exit(0);
};

// Handle termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Exit with error code to trigger nodemon restart
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Exit with error code to trigger nodemon restart
  process.exit(1);
});

export { app, AppDataSource, logger, httpServer };
