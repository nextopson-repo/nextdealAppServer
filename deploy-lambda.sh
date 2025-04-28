#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Lambda deployment process..."

# Build the application
echo "📦 Building the application..."
npm run build

# Create a deployment package
echo "📦 Creating deployment package..."
rm -rf deployment-package
mkdir deployment-package

# Copy necessary files
cp -r dist deployment-package/
cp package.json deployment-package/
cp lambda.js deployment-package/

# Create a temporary package.json with only production dependencies
cd deployment-package
npm install --production --no-package-lock

# Remove unnecessary files and directories
rm -rf node_modules/.cache
rm -rf node_modules/**/test
rm -rf node_modules/**/tests
rm -rf node_modules/**/docs
rm -rf node_modules/**/*.md
rm -rf node_modules/**/*.ts
rm -rf node_modules/**/*.map
rm -rf node_modules/**/LICENSE
rm -rf node_modules/**/CHANGELOG*
rm -rf node_modules/**/README*
rm -rf node_modules/**/example
rm -rf node_modules/**/examples

# Create zip file
echo "📦 Creating zip file..."
zip -r ../lambda-deployment.zip . -x "*.git*" "*.DS_Store" "*.env*"

# Clean up
cd ..
rm -rf deployment-package

echo "✅ Deployment package created: lambda-deployment.zip"
echo "📝 Next steps:"
echo "1. Upload lambda-deployment.zip to AWS Lambda"
echo "2. Set the handler to 'lambda.handler'"
echo "3. Configure environment variables in Lambda"
echo "4. Set up API Gateway trigger if needed" 