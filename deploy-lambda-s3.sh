#!/bin/bash

# Exit on error
set -e

# Configuration
BUCKET_NAME="nextdeal-lambda-deployments"  # Change this to your desired bucket name
LAMBDA_FUNCTION_NAME="nextdealServerless"   # Updated to match your Lambda function name
REGION="us-east-1"                         # Updated to match your Lambda region (from ARN)

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

# Upload to S3
echo "📤 Uploading to S3..."
aws s3 cp lambda-deployment.zip s3://${BUCKET_NAME}/lambda-deployment.zip

# Update Lambda function
echo "🔄 Updating Lambda function..."
aws lambda update-function-code \
    --function-name ${LAMBDA_FUNCTION_NAME} \
    --s3-bucket ${BUCKET_NAME} \
    --s3-key lambda-deployment.zip \
    --region ${REGION}

echo "✅ Deployment completed!"
echo "📝 Next steps:"
echo "1. Verify the Lambda function configuration"
echo "2. Test the API endpoints"
echo "3. Monitor the CloudWatch logs for any issues" 