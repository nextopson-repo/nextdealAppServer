import dotenv from 'dotenv';
import { env } from './common/utils/envConfig';

// Load environment variables
dotenv.config();

console.log('Environment Variables Test:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Database Configuration:');
console.log('Host:', process.env.DEV_AWS_HOST);
console.log('Username:', process.env.DEV_AWS_USERNAME);
console.log('Database:', process.env.DEV_AWS_DB_NAME);
console.log('Port:', process.env.PORT);

// Test database connection string
const connectionString = `mysql://${process.env.DEV_AWS_USERNAME}:${process.env.DEV_AWS_PASSWORD}@${process.env.DEV_AWS_HOST}:3306/${process.env.DEV_AWS_DB_NAME}`;
console.log('Connection String (without password):', connectionString.replace(process.env.DEV_AWS_PASSWORD || '', '****')); 