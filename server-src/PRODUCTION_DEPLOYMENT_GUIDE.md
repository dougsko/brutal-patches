# Production Deployment Guide - Brutal Patches API

This comprehensive guide covers the complete production deployment process for the Brutal Patches API, including pre-deployment preparation, deployment execution, and post-deployment validation.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Security Configuration](#security-configuration)
4. [Deployment Process](#deployment-process)
5. [Post-Deployment Validation](#post-deployment-validation)
6. [Monitoring Setup](#monitoring-setup)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

### Code Quality Verification
- [ ] All unit tests passing (`npm test`)
- [ ] All integration tests passing (`npm run test:e2e`)
- [ ] Code coverage above 80% (`npm run test:cov`)
- [ ] ESLint checks passing (`npm run lint`)
- [ ] Security audit completed (`./scripts/security-audit.sh`)
- [ ] Performance tests completed (`./scripts/performance-test.sh`)

### Security Requirements
- [ ] Environment variables secured in AWS Secrets Manager
- [ ] JWT secrets rotated for production
- [ ] SSL certificates valid and not expiring within 30 days
- [ ] IAM roles configured with least privilege principles
- [ ] Rate limiting properly configured
- [ ] CORS settings appropriate for production domain

### Infrastructure Readiness
- [ ] AWS account and credentials configured
- [ ] DynamoDB tables created and indexed
- [ ] CloudWatch logging enabled
- [ ] Backup strategies in place
- [ ] Monitoring and alerting configured

### Dependencies and Configuration
- [ ] All production dependencies updated
- [ ] Environment-specific configuration verified
- [ ] Database migrations completed (if applicable)
- [ ] Third-party service integrations tested
- [ ] CDN configuration updated (if applicable)

## Environment Setup

### AWS Configuration

1. **AWS Credentials Setup**
   ```bash
   # Configure AWS CLI
   aws configure
   
   # Or use environment variables
   export AWS_ACCESS_KEY_ID=your_access_key
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   export AWS_DEFAULT_REGION=us-east-1
   ```

2. **Serverless Framework Configuration**
   ```bash
   # Install Serverless Framework globally
   npm install -g serverless@3.38.0
   
   # Verify installation
   serverless --version
   ```

### Environment Variables

Set the following environment variables in AWS Systems Manager Parameter Store or AWS Secrets Manager:

**Required Variables:**
- `NODE_ENV=production`
- `JWT_SECRET` - Strong JWT signing secret
- `JWT_EXPIRATION=1h`
- `JWT_REFRESH_EXPIRATION=7d`
- `AWS_REGION=us-east-1`
- `DYNAMODB_TABLE_PREFIX=BrutalPatches-prod`
- `LOG_LEVEL=info`

**Optional Variables:**
- `CORS_ORIGIN=https://brutalpatches.com`
- `RATE_LIMIT_WINDOW_MS=900000`
- `RATE_LIMIT_MAX=100`

## Security Configuration

### SSL/TLS Setup
```bash
# Verify SSL certificate
curl -I https://api.brutalpatches.com

# Check certificate expiration
echo | openssl s_client -servername api.brutalpatches.com -connect api.brutalpatches.com:443 2>/dev/null | openssl x509 -noout -dates
```

### JWT Configuration
```typescript
// Ensure production JWT configuration
const jwtConfig = {
  secret: process.env.JWT_SECRET, // Must be strong and unique
  signOptions: {
    expiresIn: process.env.JWT_EXPIRATION || '1h',
    issuer: 'brutal-patches-api',
    audience: 'brutal-patches-app'
  }
};
```

### Rate Limiting
```typescript
// Production rate limiting configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
};
```

## Deployment Process

### Step 1: Pre-Deployment Preparation

```bash
# Navigate to project directory
cd server-src

# Install dependencies
npm ci

# Run security audit
./scripts/security-audit.sh

# Review audit results
cat security-audit-*/security-report.md

# Run performance tests locally
npm run start:dev &
sleep 10
./scripts/performance-test.sh http://localhost:4000
kill $!
```

### Step 2: Build and Test

```bash
# Build the application
npm run build

# Verify build output
ls -la dist/

# Run final tests
npm test
npm run test:e2e

# Generate coverage report
npm run test:cov
```

### Step 3: Deploy to Staging (Recommended)

```bash
# Deploy to staging environment
serverless deploy --stage staging --region us-east-1

# Validate staging deployment
./scripts/production-validation.sh https://api-staging.brutalpatches.com

# Run performance tests on staging
./scripts/performance-test.sh https://api-staging.brutalpatches.com
```

### Step 4: Production Deployment

```bash
# Final checks before production deployment
echo "🔍 Pre-production checklist:"
echo "- [ ] Staging validation passed"
echo "- [ ] Performance tests acceptable"
echo "- [ ] Security audit clean"
echo "- [ ] Team approval received"
echo ""
read -p "Continue with production deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

# Deploy to production
echo "🚀 Starting production deployment..."
serverless deploy --stage prod --region us-east-1

# Capture deployment information
DEPLOYMENT_TIME=$(date)
DEPLOYMENT_USER=$(whoami)
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

echo "📝 Deployment Information:"
echo "  Time: $DEPLOYMENT_TIME"
echo "  User: $DEPLOYMENT_USER"
echo "  Git Commit: $GIT_COMMIT"
echo "  Git Branch: $GIT_BRANCH"
```

### Step 5: Deployment Verification

```bash
# Wait for deployment to stabilize
echo "⏳ Waiting for deployment to stabilize..."
sleep 30

# Run production validation
echo "🔍 Running production validation..."
./scripts/production-validation.sh https://api.brutalpatches.com

if [ $? -eq 0 ]; then
    echo "✅ Production deployment validated successfully!"
else
    echo "❌ Production deployment validation failed!"
    echo "Consider rolling back or investigating issues immediately."
    exit 1
fi
```

## Post-Deployment Validation

### Automated Validation Script

Run the comprehensive validation script:
```bash
./scripts/production-validation.sh https://api.brutalpatches.com
```

### Manual Validation Steps

1. **Health Check Verification**
   ```bash
   # Basic health check
   curl https://api.brutalpatches.com/health
   
   # Detailed health check
   curl https://api.brutalpatches.com/health/detailed
   
   # Monitoring metrics
   curl https://api.brutalpatches.com/monitoring/metrics
   ```

2. **Core API Functionality**
   ```bash
   # Test public endpoints
   curl https://api.brutalpatches.com/api/patches/total
   curl https://api.brutalpatches.com/api/patches
   
   # Test authentication (should return 401)
   curl https://api.brutalpatches.com/api/users/profile
   ```

3. **Performance Validation**
   ```bash
   # Run performance tests
   ./scripts/performance-test.sh https://api.brutalpatches.com
   
   # Check response times are acceptable (< 2 seconds for health check)
   curl -w "Response time: %{time_total}s\n" -o /dev/null -s https://api.brutalpatches.com/health
   ```

### Database Connectivity

```bash
# Verify DynamoDB connectivity through API
curl https://api.brutalpatches.com/api/patches/total

# Check CloudWatch logs for any database errors
aws logs filter-log-events \
  --log-group-name "/aws/lambda/brutal-patches-api-prod-main" \
  --filter-pattern "ERROR" \
  --start-time $(date -d "1 hour ago" +%s)000
```

## Monitoring Setup

### CloudWatch Alarms

Set up the following CloudWatch alarms:

1. **High Error Rate**
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name "BrutalPatches-HighErrorRate" \
     --alarm-description "High error rate in API" \
     --metric-name Errors \
     --namespace AWS/Lambda \
     --statistic Sum \
     --period 300 \
     --threshold 10 \
     --comparison-operator GreaterThanThreshold
   ```

2. **High Response Time**
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name "BrutalPatches-HighResponseTime" \
     --alarm-description "High response time" \
     --metric-name Duration \
     --namespace AWS/Lambda \
     --statistic Average \
     --period 300 \
     --threshold 5000 \
     --comparison-operator GreaterThanThreshold
   ```

### Health Monitoring

Set up automated health monitoring:

```bash
# Create health check script for cron
cat > /usr/local/bin/brutal-patches-health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="https://api.brutalpatches.com/health"
if ! curl -f -s "$HEALTH_URL" > /dev/null; then
    echo "ALERT: Brutal Patches API health check failed at $(date)" | mail -s "API Health Check Failed" admin@brutalpatches.com
fi
EOF

chmod +x /usr/local/bin/brutal-patches-health-check.sh

# Add to crontab for every 5 minutes
echo "*/5 * * * * /usr/local/bin/brutal-patches-health-check.sh" | crontab -
```

## Rollback Procedures

### Automated Rollback

```bash
# List recent deployments
serverless deploy list --stage prod

# Rollback to previous version
serverless rollback --timestamp YYYYMMDDHHMMSS --stage prod --region us-east-1

# Verify rollback
./scripts/production-validation.sh https://api.brutalpatches.com
```

### Manual Rollback Steps

1. **Identify the last known good deployment**
   ```bash
   # Check deployment history
   aws cloudformation describe-stack-events --stack-name aws-nestjs-dynamodb-prod
   ```

2. **Execute rollback**
   ```bash
   # Rollback using CloudFormation
   aws cloudformation update-stack \
     --stack-name aws-nestjs-dynamodb-prod \
     --use-previous-template \
     --parameters ParameterKey=Stage,ParameterValue=prod
   ```

3. **Validate rollback**
   ```bash
   # Wait for rollback to complete
   aws cloudformation wait stack-update-complete --stack-name aws-nestjs-dynamodb-prod
   
   # Validate the rolled back deployment
   ./scripts/production-validation.sh https://api.brutalpatches.com
   ```

### Emergency Rollback

In case of critical issues:

```bash
#!/bin/bash
echo "🚨 EMERGENCY ROLLBACK INITIATED"
echo "Timestamp: $(date)"

# Get the second most recent deployment
PREVIOUS_DEPLOYMENT=$(serverless deploy list --stage prod | grep -E '^\d' | head -2 | tail -1 | awk '{print $2}')

if [ -n "$PREVIOUS_DEPLOYMENT" ]; then
    echo "Rolling back to: $PREVIOUS_DEPLOYMENT"
    serverless rollback --timestamp "$PREVIOUS_DEPLOYMENT" --stage prod --region us-east-1
    
    # Immediate validation
    sleep 30
    if ./scripts/production-validation.sh https://api.brutalpatches.com; then
        echo "✅ Emergency rollback successful"
    else
        echo "❌ Emergency rollback failed - manual intervention required"
    fi
else
    echo "❌ Could not identify previous deployment for rollback"
fi
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Deployment Fails with CloudFormation Error
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name aws-nestjs-dynamodb-prod

# Common solution: Delete failed stack and redeploy
aws cloudformation delete-stack --stack-name aws-nestjs-dynamodb-prod
aws cloudformation wait stack-delete-complete --stack-name aws-nestjs-dynamodb-prod
serverless deploy --stage prod --region us-east-1
```

#### 2. High Response Times
```bash
# Check Lambda memory allocation
aws lambda get-function --function-name brutal-patches-api-prod-main

# Increase memory if needed
aws lambda update-function-configuration \
  --function-name brutal-patches-api-prod-main \
  --memory-size 512
```

#### 3. Database Connection Issues
```bash
# Check DynamoDB table status
aws dynamodb describe-table --table-name BrutalPatchesTable-prod

# Check IAM permissions
aws sts get-caller-identity
aws iam simulate-principal-policy \
  --policy-source-arn $(aws sts get-caller-identity --query Arn --output text) \
  --action-names dynamodb:GetItem dynamodb:PutItem \
  --resource-arns arn:aws:dynamodb:us-east-1:*:table/BrutalPatchesTable-prod
```

#### 4. Authentication Issues
```bash
# Verify JWT secret configuration
aws secretsmanager get-secret-value --secret-id brutal-patches/jwt-secret

# Check token generation
curl -X POST https://api.brutalpatches.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### Logs and Debugging

```bash
# View real-time logs
serverless logs -f main --stage prod --tail

# Search for errors in the last hour
aws logs filter-log-events \
  --log-group-name "/aws/lambda/brutal-patches-api-prod-main" \
  --filter-pattern "ERROR" \
  --start-time $(date -d "1 hour ago" +%s)000

# Get function metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=brutal-patches-api-prod-main \
  --start-time $(date -d "1 hour ago" --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Average
```

## Post-Deployment Tasks

### Immediate (0-2 hours)
- [ ] Monitor error rates and response times
- [ ] Verify all critical user journeys work
- [ ] Check application logs for errors
- [ ] Confirm monitoring and alerting is active

### Short-term (2-24 hours)
- [ ] Monitor performance metrics
- [ ] Analyze user behavior and API usage
- [ ] Review and respond to any alerts
- [ ] Optimize performance based on real usage patterns

### Medium-term (1-7 days)
- [ ] Analyze performance trends
- [ ] Review security logs
- [ ] Optimize costs and resource allocation
- [ ] Plan next iteration improvements

## Emergency Contacts

### Escalation Procedures
1. **Level 1**: Development Team
2. **Level 2**: Technical Lead
3. **Level 3**: AWS Support (if infrastructure-related)

### Communication Channels
- **Slack**: #brutal-patches-alerts
- **Email**: alerts@brutalpatches.com
- **On-call**: (Configure PagerDuty or similar)

---

**Document Version**: 1.0
**Last Updated**: $(date)
**Next Review Date**: $(date -d "+3 months")

This guide should be reviewed and updated with each major deployment or infrastructure change.