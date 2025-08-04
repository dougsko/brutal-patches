#!/bin/bash

# Pre-deployment check script for Brutal Patches
# Validates environment and dependencies before deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Running pre-deployment checks...${NC}"

# Check Node.js version
REQUIRED_NODE_VERSION="20"
CURRENT_NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)

if [ "$CURRENT_NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
    echo -e "${RED}❌ Node.js version $CURRENT_NODE_VERSION is too old. Required: $REQUIRED_NODE_VERSION+${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Node.js version check passed (v$(node -v))${NC}"
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ AWS CLI installed${NC}"
fi

# Check AWS credentials
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
    exit 1
else
    echo -e "${GREEN}✅ AWS credentials configured${NC}"
fi

# Check S3 bucket name
if [ -z "$S3_BUCKET_NAME" ]; then
    echo -e "${RED}❌ S3_BUCKET_NAME not set${NC}"
    exit 1
else
    echo -e "${GREEN}✅ S3 bucket name configured: $S3_BUCKET_NAME${NC}"
fi

# Test AWS connectivity
echo -e "${YELLOW}🌐 Testing AWS connectivity...${NC}"
if aws sts get-caller-identity &> /dev/null; then
    echo -e "${GREEN}✅ AWS connectivity test passed${NC}"
else
    echo -e "${RED}❌ AWS connectivity test failed${NC}"
    exit 1
fi

# Check if S3 bucket exists and is accessible
echo -e "${YELLOW}🪣 Checking S3 bucket accessibility...${NC}"
if aws s3 ls "s3://$S3_BUCKET_NAME" &> /dev/null; then
    echo -e "${GREEN}✅ S3 bucket is accessible${NC}"
else
    echo -e "${RED}❌ S3 bucket not accessible or doesn't exist${NC}"
    exit 1
fi

# Check dependencies
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️ node_modules not found, installing...${NC}"
    npm ci
fi

if [ ! -d "server-src/node_modules" ]; then
    echo -e "${YELLOW}⚠️ server-src/node_modules not found, installing...${NC}"
    cd server-src
    npm ci
    cd ..
fi

echo -e "${GREEN}✅ Dependencies check passed${NC}"

# Check if Serverless Framework is available
if ! command -v serverless &> /dev/null && ! npx serverless --version &> /dev/null; then
    echo -e "${RED}❌ Serverless Framework not found${NC}"
    echo "Installing globally..."
    npm install -g serverless
fi

echo -e "${GREEN}✅ Serverless Framework available${NC}"

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
if npm run test:ci; then
    echo -e "${GREEN}✅ Frontend tests passed${NC}"
else
    echo -e "${RED}❌ Frontend tests failed${NC}"
    exit 1
fi

cd server-src
if npm test; then
    echo -e "${GREEN}✅ Backend tests passed${NC}"
else
    echo -e "${RED}❌ Backend tests failed${NC}"
    exit 1
fi
cd ..

# Check build
echo -e "${YELLOW}🏗️ Testing build process...${NC}"
if npm run build:prod; then
    echo -e "${GREEN}✅ Frontend build successful${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 All pre-deployment checks passed!${NC}"
echo -e "${GREEN}Ready to deploy to production.${NC}"