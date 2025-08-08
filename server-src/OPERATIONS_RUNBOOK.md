# Brutal Patches API - Operations Runbook

## Overview
This runbook provides essential operational procedures for maintaining and troubleshooting the Brutal Patches API in production.

## Architecture Overview

### Components
- **API Server**: NestJS application running on AWS Lambda
- **Database**: Amazon DynamoDB
- **Authentication**: JWT-based with bcrypt hashing
- **Monitoring**: CloudWatch, X-Ray, Prometheus metrics
- **Logging**: Winston with CloudWatch Logs integration

### Key URLs
- **Production API**: https://api.brutalpatches.com
- **Health Check**: https://api.brutalpatches.com/health
- **Detailed Health**: https://api.brutalpatches.com/health/detailed
- **Metrics**: https://api.brutalpatches.com/monitoring/metrics
- **API Docs** (dev only): http://localhost:4000/api-docs

## Monitoring & Alerting

### Health Checks
```bash
# Basic health check
curl https://api.brutalpatches.com/health

# Detailed health with metrics
curl https://api.brutalpatches.com/health/detailed

# Prometheus metrics
curl https://api.brutalpatches.com/monitoring/metrics
```

### Key Metrics to Monitor
- **HTTP Request Rate**: `http_requests_total`
- **Response Time**: `http_request_duration_seconds`
- **Error Rate**: `errors_total`
- **Database Performance**: `database_query_duration_seconds`
- **Cache Hit Rate**: `cache_operations_total`
- **Active Connections**: `active_connections`

### CloudWatch Dashboards
- **API Performance**: Response times, error rates, throughput
- **Database**: Query performance, connection counts
- **Security**: Authentication events, failed login attempts
- **Business**: Patch operations, user activities

## Troubleshooting Guide

### Common Issues

#### 1. High Response Times
**Symptoms**: Response times > 2 seconds consistently
**Diagnosis**:
```bash
# Check specific endpoint performance
curl -w "@curl-format.txt" -s -o /dev/null https://api.brutalpatches.com/api/patches

# Check metrics
curl https://api.brutalpatches.com/monitoring/metrics | grep http_request_duration
```
**Possible Causes**:
- Database query performance issues
- Cold Lambda starts
- DynamoDB throttling
- Large payload processing

**Solutions**:
- Review DynamoDB indexes and query patterns
- Increase Lambda memory allocation
- Check DynamoDB capacity settings
- Implement caching for frequently accessed data

#### 2. Authentication Failures
**Symptoms**: High number of 401 responses
**Diagnosis**:
```bash
# Check auth-specific metrics
curl https://api.brutalpatches.com/monitoring/metrics | grep jwt_tokens
```
**Possible Causes**:
- JWT secret misconfiguration
- Token expiration issues
- User credential problems

**Solutions**:
- Verify JWT_SECRET environment variable
- Check token expiration settings
- Review user account status

#### 3. Database Connection Issues
**Symptoms**: Database operation timeouts or failures
**Diagnosis**:
```bash
# Check detailed health
curl https://api.brutalpatches.com/health/detailed
```
**Possible Causes**:
- DynamoDB service issues
- Network connectivity problems
- IAM permission issues

**Solutions**:
- Check AWS service health
- Verify DynamoDB table status
- Review IAM role permissions

#### 4. Memory/Performance Issues
**Symptoms**: Lambda timeouts or out-of-memory errors
**Diagnosis**: Check CloudWatch logs for memory usage patterns
**Solutions**:
- Increase Lambda memory allocation
- Review code for memory leaks
- Optimize data processing patterns

## Operational Procedures

### Deployment
```bash
# Deploy to production
cd server-src
npm run deploy

# Deploy to specific stage
npm run deploy:dev
npm run deploy:prod
```

### Rollback Procedure
```bash
# View deployment history
serverless deploy list --stage prod

# Rollback to previous version
serverless rollback --timestamp <timestamp> --stage prod
```

### Database Operations
```bash
# Backup DynamoDB table (manual)
aws dynamodb create-backup \
  --table-name BrutalPatchesTable-prod \
  --backup-name manual-backup-$(date +%Y%m%d-%H%M%S)

# Check table status
aws dynamodb describe-table --table-name BrutalPatchesTable-prod
```

### Log Analysis
```bash
# View recent logs
serverless logs -f main --stage prod --startTime 1h

# Search for specific errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/brutal-patches-api-prod-main \
  --filter-pattern "ERROR"
```

## Security Monitoring

### Authentication Events to Monitor
- Failed login attempts (> 5 per minute from same IP)
- JWT token validation failures
- Account lockout events
- Password reset requests

### Suspicious Activity Patterns
- Unusual API access patterns
- Multiple failed authentication attempts
- High-frequency requests from single IP
- Access to admin endpoints from unauthorized users

### Security Response Procedures
1. **Immediate Response**:
   - Block suspicious IP addresses
   - Revoke compromised JWT tokens
   - Enable additional logging

2. **Investigation**:
   - Review access logs
   - Check for data integrity
   - Verify user account status

3. **Recovery**:
   - Reset affected user passwords
   - Update security configurations
   - Implement additional safeguards

## Performance Optimization

### Database Optimization
- Monitor DynamoDB read/write capacity utilization
- Optimize query patterns using GSI
- Implement caching for frequently accessed data

### Lambda Optimization
- Right-size memory allocation
- Minimize cold starts with provisioned concurrency
- Optimize deployment package size

### API Optimization
- Implement response caching
- Use pagination for large data sets
- Compress API responses

## Backup and Disaster Recovery

### Daily Backup Procedures
- DynamoDB automatic backups (enabled)
- Application code in Git repositories
- Environment configuration in AWS Systems Manager

### Disaster Recovery Plan
1. **Assessment**: Determine scope of outage
2. **Communication**: Notify stakeholders
3. **Recovery**: Deploy to backup region if needed
4. **Validation**: Verify system functionality
5. **Post-mortem**: Document lessons learned

## Environment Variables

### Production Environment Variables
```
NODE_ENV=production
AWS_REGION=us-east-1
JWT_SECRET=<managed by AWS Secrets Manager>
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d
DYNAMODB_TABLE_PREFIX=BrutalPatches-prod
LOG_LEVEL=info
```

### Secrets Management
All sensitive configuration managed through:
- AWS Secrets Manager for database credentials
- AWS Systems Manager Parameter Store for configuration
- Environment-specific serverless.yml files

## Contact Information

### Escalation Procedures
1. **Level 1**: Development team
2. **Level 2**: Technical lead
3. **Level 3**: AWS support (if infrastructure-related)

### On-Call Procedures
- Primary on-call: Development team
- Secondary on-call: DevOps team
- Escalation time: 30 minutes for P1 issues

## Maintenance Windows

### Scheduled Maintenance
- **Frequency**: Monthly
- **Duration**: 30 minutes
- **Notification**: 48 hours advance notice
- **Best Time**: Sunday 02:00 UTC (low traffic)

### Emergency Maintenance
- Immediate for security issues
- Within 4 hours for critical bugs
- Next business day for non-critical issues

## SLA & Performance Targets

### Service Level Objectives
- **Availability**: 99.9%
- **Response Time**: < 2 seconds (95th percentile)
- **Error Rate**: < 1%
- **MTTR**: < 30 minutes for P1 issues

### Monitoring Thresholds
- **High Response Time**: > 5 seconds
- **High Error Rate**: > 5% over 5 minutes
- **Low Availability**: < 99% over 1 hour
- **High Memory Usage**: > 80% Lambda memory