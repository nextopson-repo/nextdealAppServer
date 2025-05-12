import { AppDataSource } from './config/database';
import dotenv from 'dotenv';

dotenv.config();

console.log('Environment variables:');
console.log('DB Host:', process.env.LOCAL_DB_HOST);
console.log('DB Name:', process.env.LOCAL_DB_NAME);
console.log('DB User:', process.env.LOCAL_DB_USERNAME);

AppDataSource.initialize()
  .then(() => {
    console.log('Successfully connected to database');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }); 