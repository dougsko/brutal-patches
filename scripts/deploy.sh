#!/bin/bash

# Deployment script for Brutal Patches
# This script handles both frontend and backend deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_BUILD_DIR="dist"
BACKEND_DIR="server-src"
STAGE="prod"
REGION="us-east-1"

echo -e "${YELLOW}🚀 Starting Brutal Patches deployment...${NC}"

# Check required environment variables
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo -e "${RED}❌ Error: AWS credentials not set${NC}"
    echo "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables"
    exit 1
fi

if [ -z "$S3_BUCKET_NAME" ]; then
    echo -e "${RED}❌ Error: S3_BUCKET_NAME not set${NC}"
    exit 1
fi

# Function to check command success
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 successful${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm ci
check_success "Frontend dependency installation"

cd $BACKEND_DIR
npm ci
check_success "Backend dependency installation"
cd ..

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm test -- --no-watch --browsers=ChromeHeadless
check_success "Frontend tests"

cd $BACKEND_DIR
npm test
check_success "Backend tests"
cd ..

# Build frontend
echo -e "${YELLOW}🏗️ Building frontend...${NC}"
npm run build
check_success "Frontend build"

# Deploy backend
echo -e "${YELLOW}🚀 Deploying backend...${NC}"
cd $BACKEND_DIR
export SERVERLESS_DISABLE_USAGE_TRACKING=true
export SLS_DISABLE_ANALYTICS=true 
export SLS_DISABLE_TELEMETRY=true
npm run deploy
check_success "Backend deployment"
cd ..

# Deploy frontend to S3
echo -e "${YELLOW}📤 Deploying frontend to S3...${NC}"
aws s3 sync $FRONTEND_BUILD_DIR/ s3://$S3_BUCKET_NAME --delete
check_success "Frontend S3 deployment"

# Invalidate CloudFront (if configured)
if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo -e "${YELLOW}🔄 Invalidating CloudFront cache...${NC}"
    aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"
    check_success "CloudFront invalidation"
else
    echo -e "${YELLOW}ℹ️ CloudFront distribution ID not configured, skipping cache invalidation${NC}"
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "Frontend: Deployed to S3 bucket ${S3_BUCKET_NAME}"
echo -e "Backend: Deployed to AWS Lambda in ${REGION}"

if [ ! -z "$APP_URL" ]; then
    echo -e "Application is live at: ${APP_URL}"
else
    echo -e "Application should be live at your configured domain"
fi