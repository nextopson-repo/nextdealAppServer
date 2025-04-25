# EC2 Deployment Guide

This guide will help you deploy the NextDeal application to an EC2 instance.

## Prerequisites

- An EC2 instance running Ubuntu or Amazon Linux
- Node.js and npm installed
- Git installed

## Deployment Steps

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd nextdealAppServer
   ```

2. **Configure environment variables**
   - The `.env` file is already configured for development mode
   - Make sure `HOST` is set to `0.0.0.0` to allow external connections
   - Make sure `CORS_ORIGIN` is set to `*` to allow cross-origin requests

3. **Run the deployment script**
   ```bash
   ./deploy.sh
   ```

4. **Configure EC2 Security Group**
   - Go to EC2 Dashboard
   - Select your instance
   - Click on the Security Group
   - Add an inbound rule:
     - Type: Custom TCP
     - Port Range: 5000
     - Source: 0.0.0.0/0 (or your specific IP for better security)

5. **Access the application**
   - The application will be available at `http://<your-ec2-public-ip>:5000`
   - The deployment script will display the URL when it completes

## Troubleshooting

- **Application not accessible**: Check your EC2 security group settings
- **Application crashes**: Check the logs with `pm2 logs nextdeal-backend`
- **Port already in use**: The deployment script will attempt to kill any process using port 5000

## Development Mode

The application is configured to run in development mode. This means:
- Detailed error messages will be shown
- Debug logs will be enabled
- CORS is set to allow all origins

For production deployment, change `NODE_ENV` to `"production"` in the `.env` file. 