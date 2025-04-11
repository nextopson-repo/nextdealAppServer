import { DataSource, DataSourceOptions } from 'typeorm';

import { UserAuth } from '../api/entity';

// Create a DataSource instance
const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.NODE_ENV === 'production' ? process.env.DEV_AWS_HOST : process.env.LOCAL_DB_HOST,
  port: 3306,
  username: process.env.NODE_ENV === 'production' ? process.env.DEV_AWS_USERNAME : process.env.LOCAL_DB_USERNAME,
  password: process.env.NODE_ENV === 'production' ? process.env.DEV_AWS_PASSWORD : process.env.LOCAL_DB_PASSWORD,
  database: process.env.NODE_ENV === 'production' ? process.env.DEV_AWS_DB_NAME : process.env.LOCAL_DB_NAME,
  entities: [UserAuth],
  synchronize: true, // Enable this for development
  logging: true, // Enable this for development
};

export const AppDataSource = new DataSource(dataSourceOptions);
