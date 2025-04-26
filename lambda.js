const awsServerlessExpress = require('aws-serverless-express');
const app = require('./dist/index.js'); // Import the built application

// Create server outside of the handler to take advantage of connection reuse
const server = awsServerlessExpress.createServer(app, null, (req, res, next) => {
  // Add CORS headers for Lambda
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Export handler function
exports.handler = async (event, context) => {
  // Enable keep-alive for better performance
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    return await awsServerlessExpress.proxy(server, event, context);
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
