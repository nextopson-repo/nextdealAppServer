const swaggerAutogen = require('swagger-autogen')();

const outputFile = './src/swagger_output.json';
const endpointsFiles = ['./src/server.ts']; // Adjust the path as necessary

swaggerAutogen(outputFile, endpointsFiles);
