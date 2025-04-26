#!/bin/bash

# Stop any existing processes on port 5000
echo "Stopping any existing processes on port 5000..."
sudo lsof -ti:5000 | xargs -r kill -9

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building the application..."
npm run build-prod

# Start the application with PM2 (if installed)
if command -v pm2 &> /dev/null; then
    echo "Starting application with PM2..."
    pm2 stop nextdeal-backend || true
    pm2 start dist/index.js --name "nextdeal-backend"
    pm2 save
else
    echo "PM2 not found. Installing PM2..."
    npm install -g pm2
    pm2 start dist/index.js --name "nextdeal-backend"
    pm2 save
fi

echo "Application deployed successfully!"
echo "You can access it at http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):5000" 