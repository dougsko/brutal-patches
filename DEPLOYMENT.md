# Deployment Guide

This document describes how to set up automated deployments to AWS using GitHub Actions.

## Architecture

- **Frontend**: Angular 18 app deployed to AWS S3 + CloudFront
- **Backend**: NestJS API deployed as AWS Lambda functions via Serverless Framework
- **Database**: DynamoDB tables managed via Serverless Framework

## GitHub Secrets Configuration

Configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS Access Key ID | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Access Key | `wJalrXUt...` |
| `S3_BUCKET_NAME` | S3 bucket name for frontend | `brutalpatches.com` |

### Optional Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID | `E1PA6795UKMFR9` |
| `APP_URL` | Production app URL | `https://brutalpatches.com` |

## AWS Setup Requirements

### 1. IAM User Permissions

Your GitHub Actions IAM user needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/*",
        "arn:aws:s3:::your-bucket-name"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "lambda:*",
        "apigateway:*",
        "iam:*",
        "dynamodb:*",
        "logs:*"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. S3 Bucket Configuration

Your S3 bucket should be configured for static website hosting:

1. Enable static website hosting
2. Set index document: `index.html`
3. Set error document: `index.html` (for Angular routing)
4. Configure bucket policy for public read access

### 3. CloudFront Configuration (Optional but Recommended)

- Origin: Your S3 bucket
- Default root object: `index.html`
- Error pages: Redirect 404s to `/index.html` with 200 status

## Deployment Process

### Automatic Deployment

Deployments are triggered automatically when code is merged to the `main` branch:

1. **Tests run** - Both frontend and backend tests must pass
2. **Backend deploys** - Serverless Framework deploys Lambda functions
3. **Frontend deploys** - Angular app builds and uploads to S3
4. **Cache invalidation** - CloudFront cache is cleared (if configured)

### Manual Deployment

You can also trigger deployments manually:

1. Go to Actions tab in GitHub
2. Select "Deploy to AWS" workflow
3. Click "Run workflow"
4. Select `main` branch and run

## Local Testing

Before deploying, test the production build locally:

```bash
# Build frontend
npm run build

# Test backend locally
cd server-src
npm run start:dev

# Test both together
npm run start:all
```

## Deployment Environments

### Development
- Local development with proxy configuration
- Uses in-memory data for backend

### Production
- Frontend: S3 + CloudFront
- Backend: AWS Lambda + API Gateway
- Database: DynamoDB

## Troubleshooting

### Common Issues

1. **Build failures**: Check Node.js version compatibility
2. **Permission errors**: Verify IAM policies and secrets
3. **CORS issues**: Ensure API Gateway CORS is configured
4. **Cache issues**: Invalidate CloudFront distribution

### Monitoring

- **Lambda logs**: Available in CloudWatch
- **Build logs**: Available in GitHub Actions
- **Application errors**: Check browser console

## File Structure

```
.github/
  workflows/
    deploy.yml          # Main deployment workflow

server-src/
  serverless.yml        # Serverless Framework configuration
  src/
    lambda.ts          # Lambda entry point

src/
  environments/
    environment.prod.ts # Production API configuration
```

## Security Notes

- Never commit AWS credentials to git
- Use GitHub Secrets for sensitive data
- Regularly rotate access keys
- Follow principle of least privilege for IAM roles