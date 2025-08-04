# GitHub Actions Setup Guide

This guide walks you through setting up automated AWS deployments for Brutal Patches.

## 1. Create GitHub Secrets

Navigate to your repository settings: `Settings > Secrets and variables > Actions > New repository secret`

### Required Secrets

Add these secrets with your AWS account values:

```
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=your-s3-bucket-name
```

### Optional Secrets (Recommended)

```
CLOUDFRONT_DISTRIBUTION_ID=E1PA6795UKMFR9
APP_URL=https://brutalpatches.com
```

## 2. AWS IAM Setup

Create an IAM user specifically for GitHub Actions with these policies:

### Policy: S3 Access
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3BucketAccess",
            "Effect": "Allow",
            "Action": [
                "s3:GetBucketLocation",
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name"
        },
        {
            "Sid": "S3ObjectAccess",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

### Policy: Serverless Framework
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cloudformation:CreateChangeSet",
                "cloudformation:CreateStack",
                "cloudformation:DeleteStack",
                "cloudformation:DescribeChangeSet",
                "cloudformation:DescribeStackEvents",
                "cloudformation:DescribeStackResource",
                "cloudformation:DescribeStackResources",
                "cloudformation:DescribeStacks",
                "cloudformation:ExecuteChangeSet",
                "cloudformation:ListStackResources",
                "cloudformation:UpdateStack",
                "cloudformation:ValidateTemplate"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "lambda:*"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "apigateway:*"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "iam:AttachRolePolicy",
                "iam:CreateRole",
                "iam:DeleteRole",
                "iam:DeleteRolePolicy",
                "iam:DetachRolePolicy",
                "iam:GetRole",
                "iam:PassRole",
                "iam:PutRolePolicy"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:CreateTable",
                "dynamodb:DeleteTable",
                "dynamodb:DescribeTable",
                "dynamodb:UpdateTable"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:DeleteLogGroup"
            ],
            "Resource": "*"
        }
    ]
}
```

### Policy: CloudFront (Optional)
```json
{
    "Version": "2012-10-17",
    "Statement": [
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

## 3. S3 Bucket Setup

Your S3 bucket should be configured for static website hosting:

1. **Enable static website hosting**
   - Index document: `index.html`
   - Error document: `index.html`

2. **Bucket Policy** (for public access):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

## 4. CloudFront Setup (Optional but Recommended)

Create a CloudFront distribution:

- **Origin**: Your S3 bucket website endpoint
- **Default root object**: `index.html`
- **Error pages**: Create custom error response
  - HTTP error code: `404`
  - Response page path: `/index.html`
  - HTTP response code: `200`

## 5. Test the Setup

1. **Push to main branch**: The workflow will automatically trigger
2. **Manual trigger**: Go to Actions tab > Deploy to AWS > Run workflow
3. **Monitor progress**: Check the Actions tab for deployment status

## 6. Troubleshooting

### Common Issues

1. **Permission errors**: Double-check IAM policies and secret values
2. **Build failures**: Ensure Node.js version compatibility (workflow uses Node 20)
3. **S3 sync errors**: Verify bucket name and permissions
4. **Lambda deployment errors**: Check CloudFormation stack in AWS console

### Logs

- **GitHub Actions logs**: Available in the Actions tab
- **Lambda logs**: CloudWatch in AWS console
- **API Gateway logs**: Can be enabled in AWS console

## 7. Environment Protection (Optional)

For additional security, create a `production` environment:

1. Go to `Settings > Environments`
2. Create new environment named `production`
3. Add protection rules (require reviews, etc.)
4. The workflow will use this environment for deployments