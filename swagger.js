/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
import swaggerAutogen from 'swagger-autogen';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swagger = swaggerAutogen();
const outputFile = './src/swagger_output.json';
const endpointsFiles = ['./src/server.ts']; // Adjust the path as necessary

// Ensure the directory exists
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

swagger(outputFile, endpointsFiles);
