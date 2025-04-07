const swaggerAutogen = require('swagger-autogen')();
const fs = require('fs');
const path = require('path');

const outputFile = './src/swagger_output.json';
const endpointsFiles = ['./src/server.ts']; // Adjust the path as necessary

// Ensure the directory exists
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

swaggerAutogen(outputFile, endpointsFiles);
