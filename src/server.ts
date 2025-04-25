import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import { pino } from 'pino';
import swaggerUi from 'swagger-ui-express';
import { DataSource, DataSourceOptions } from 'typeorm';

import errorHandler from '@/common/middleware/errorHandler';
import rateLimiter from '@/common/middleware/rateLimiter';
import requestLogger from '@/common/middleware/requestLogger';

import { UserAuth } from './api/entity';
import authRoutes from './api/routes/auth/AuthRoutes';
import s3bucket from './api/routes/aws/s3';
import profile from './api/routes/UpdateProfileRoute/updateProfileRoute';

import helloRouter from './api/routes/hello/HelloRoutes';
import { swaggerSpec } from './config/swagger';
import { Property } from './api/entity/Property';
import { PropertyImage } from './api/entity/PropertyImages'
import { Address } from './api/entity/Address';
import { UserCredibility } from './api/entity/ Credibility';
import { SavedProperty } from './api/entity/SavedProperties';
import { RepublishProperty } from './api/entity/RepublishProperties';
import property from './api/routes/PropertyRoutes/PropertyRoute'; 
import { PropertyRequirement } from './api/entity/PropertyRequirement';
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
  entities: [UserAuth, Property, PropertyImage, Address,UserCredibility,SavedProperty,RepublishProperty, PropertyRequirement],
  synchronize: true, 
  logging: false, 
  entitySkipConstructor: true,
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
  .then(() => {
    logger.info('Database connected successfully');

    // Set the application to trust the reverse proxy
    app.set('trust proxy', true);

    // Middlewares
    app.use(express.json());
    app.use(cookieParser());
    app.use(
      cors({
        origin: function (origin, callback) {
          callback(null, true); // Allow all origins
        },
        credentials: true,
      })
    );
    app.use(helmet());
    app.use(rateLimiter);

    // Request logging
    app.use(requestLogger);

    // Routes mounting
    //app.use('/', (_: Request, res: Response) => {res.status(200).send('<h1>Hello from NextDeal</h1>')});    
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/s3', s3bucket);
    app.use('/api/v1/property', property);
    app.use("/api/v1/profile",profile)


    // Error handlers
    app.use(errorHandler());
  })
  .catch((error) => {
    logger.error('Error during database initialization:', error);
    process.exit(1);
  });

export { app, AppDataSource, logger };

