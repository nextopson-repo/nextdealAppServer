import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DEV_AWS_HOST,
    user: process.env.DEV_AWS_USERNAME,
    password: process.env.DEV_AWS_PASSWORD,
    database: process.env.DEV_AWS_DB_NAME,
    port: 3306,
    connectTimeout: 60000,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });

  try {
    console.log('Attempting to connect to MySQL...');
    console.log('Connection config:', {
      host: process.env.DEV_AWS_HOST,
      user: process.env.DEV_AWS_USERNAME,
      database: process.env.DEV_AWS_DB_NAME,
      port: 3306
    });
    
    await connection.connect();
    console.log('Successfully connected to MySQL!');
    
    // Test query
    const [rows] = await connection.execute('SELECT VERSION() as version');
    console.log('Database version:', rows);
    
    await connection.end();
  } catch (error) {
    console.error('Error connecting to MySQL:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

testConnection(); 