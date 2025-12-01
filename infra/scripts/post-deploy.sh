#!/bin/bash
set -e

# Post-deployment setup for Prodaic infrastructure
# Run this after `cdk deploy` completes successfully

echo "=== Prodaic Post-Deployment Setup ==="

# Get stack outputs
echo "Fetching stack outputs..."
OUTPUTS=$(aws cloudformation describe-stacks --stack-name InfraStack --query 'Stacks[0].Outputs' --output json)

SITE_BUCKET=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="SiteBucketName") | .OutputValue')
SITE_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="SiteBucketUrl") | .OutputValue')
API_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="ApiUrl") | .OutputValue')
DB_ENDPOINT=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="DatabaseEndpoint") | .OutputValue')
DB_SECRET_ARN=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="DatabaseSecretArn") | .OutputValue')

echo ""
echo "Stack outputs:"
echo "  Site bucket: $SITE_BUCKET"
echo "  Site URL: $SITE_URL"
echo "  API URL: https://$API_URL"
echo "  DB endpoint: $DB_ENDPOINT"
echo ""

# Step 1: Set Anthropic API key
echo "=== Step 1: Set Anthropic API Key ==="
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "ANTHROPIC_API_KEY environment variable not set."
    echo "Please run: export ANTHROPIC_API_KEY='your-key' and re-run this script"
    echo "Or manually set it in AWS Secrets Manager: prodaic/anthropic-api-key"
else
    echo "Setting Anthropic API key in Secrets Manager..."
    aws secretsmanager put-secret-value \
        --secret-id prodaic/anthropic-api-key \
        --secret-string "$ANTHROPIC_API_KEY"
    echo "Done."
fi
echo ""

# Step 2: Build and deploy React client
echo "=== Step 2: Build and Deploy React Client ==="
echo "Building client with production API URL..."
cd "$(dirname "$0")/../../packages/client"

# Update API URL for production
export VITE_API_URL="https://$API_URL"
pnpm build

echo "Deploying to S3..."
aws s3 sync dist/ "s3://$SITE_BUCKET/" --delete

echo "Client deployed."
echo ""

# Step 3: DNS Configuration (manual - Cloudflare)
echo "=== Step 3: Configure DNS in Cloudflare ==="
echo ""
echo "Add the following DNS records in Cloudflare for prodaic.com:"
echo ""
echo "  1. Root domain (prodaic.com) -> S3 static site:"
echo "     Type: CNAME"
echo "     Name: @"
echo "     Target: $SITE_BUCKET.s3-website-us-east-1.amazonaws.com"
echo "     Proxy: ON (orange cloud)"
echo ""
echo "  2. API subdomain (api.prodaic.com) -> App Runner:"
echo "     Type: CNAME"
echo "     Name: api"
echo "     Target: $API_URL"
echo "     Proxy: ON (orange cloud)"
echo ""

# Step 4: Verify deployment
echo "=== Step 4: Verify Deployment ==="
echo ""
echo "After DNS propagates, verify:"
echo "  - Site: https://prodaic.com"
echo "  - API health: https://api.prodaic.com/api/health"
echo ""
echo "Database credentials are in Secrets Manager:"
echo "  aws secretsmanager get-secret-value --secret-id $DB_SECRET_ARN --query SecretString --output text | jq"
echo ""
echo "=== Setup Complete ==="
