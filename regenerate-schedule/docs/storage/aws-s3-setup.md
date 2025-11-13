# AWS S3 Setup Guide

Complete step-by-step guide to set up AWS S3 for NextMeeting schedule storage.

## Overview

**What you'll create:**
- 2 S3 buckets (templates and static sites)
- IAM user with programmatic access
- S3 access policies

**Time required:** ~15 minutes

**Cost:** ~$0.023/GB storage + $0.09/GB egress

---

## Prerequisites

- AWS Account
- AWS CLI installed (optional, but recommended)

---

## Step 1: Create S3 Buckets

### Via AWS Console

1. **Go to S3 Console**
   - Navigate to: https://console.aws.amazon.com/s3/
   - Click **"Create bucket"**

2. **Create Templates Bucket**
   - **Bucket name:** `nextmeeting-templates` (must be globally unique)
   - **Region:** `us-east-1` (or your preferred region)
   - **Block Public Access:** Keep all blocked (private bucket)
   - **Versioning:** Optional (recommended)
   - Click **"Create bucket"**

3. **Create Static Sites Bucket**
   - Click **"Create bucket"** again
   - **Bucket name:** `nextmeeting-sites` (must be globally unique)
   - **Region:** Same as above
   - **Block Public Access:** 
     - ⚠️ Uncheck "Block all public access" if sites need to be public
     - Check the acknowledgment
   - Click **"Create bucket"**

### Via AWS CLI

```bash
# Set your region
AWS_REGION=us-east-1

# Create templates bucket (private)
aws s3 mb s3://nextmeeting-templates --region $AWS_REGION

# Create sites bucket (public)
aws s3 mb s3://nextmeeting-sites --region $AWS_REGION

# Make sites bucket public (if needed)
aws s3api put-bucket-acl \
  --bucket nextmeeting-sites \
  --acl public-read
```

---

## Step 2: Upload Template Files

Your HTML templates need to be uploaded to the templates bucket.

1. **Prepare your template**
   - Create `[UUID].template.html` for each site
   - Include the marker: `/* INJECT_SCHEDULE_JSON */`

2. **Upload via Console**
   - Go to your `nextmeeting-templates` bucket
   - Click **"Upload"**
   - Add your template files
   - Click **"Upload"**

3. **Upload via AWS CLI**
   ```bash
   aws s3 cp B0E7F18B-4CF5-49FF-BBD3-75E1CA52AA5E.template.html \
     s3://nextmeeting-templates/ \
     --region us-east-1
   ```

---

## Step 3: Create IAM User

### Via AWS Console

1. **Go to IAM Console**
   - Navigate to: https://console.aws.amazon.com/iam/
   - Click **"Users"** → **"Add users"**

2. **User Details**
   - **User name:** `nextmeeting-app`
   - **Access type:** Check **"Access key - Programmatic access"**
   - Click **"Next: Permissions"**

3. **Set Permissions**
   - Click **"Attach existing policies directly"**
   - For now, click **"Next"** (we'll add custom policy)
   - Click **"Next: Tags"** → **"Next: Review"**
   - Click **"Create user"**

4. **Save Credentials** ⚠️ IMPORTANT
   - **Access key ID:** `AKIA...` (copy this)
   - **Secret access key:** `...` (copy this - shown only once!)
   - Download the CSV file as backup
   - Click **"Close"**

### Via AWS CLI

```bash
# Create user
aws iam create-user --user-name nextmeeting-app

# Create access key
aws iam create-access-key --user-name nextmeeting-app

# Save the output - you'll need AccessKeyId and SecretAccessKey
```

---

## Step 4: Create IAM Policy

### Via AWS Console

1. **Go to IAM Policies**
   - Navigate to: IAM → Policies
   - Click **"Create policy"**

2. **JSON Policy**
   - Click the **"JSON"** tab
   - Paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TemplatesBucketRead",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::nextmeeting-templates",
        "arn:aws:s3:::nextmeeting-templates/*"
      ]
    },
    {
      "Sid": "SitesBucketReadWrite",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::nextmeeting-sites",
        "arn:aws:s3:::nextmeeting-sites/*"
      ]
    }
  ]
}
```

3. **Review**
   - Click **"Next: Tags"** → **"Next: Review"**
   - **Name:** `NextMeetingS3Access`
   - **Description:** `S3 access for NextMeeting schedule generator`
   - Click **"Create policy"**

4. **Attach to User**
   - Go to IAM → Users → `nextmeeting-app`
   - Click **"Add permissions"** → **"Attach existing policies directly"**
   - Search for `NextMeetingS3Access`
   - Check the policy
   - Click **"Next: Review"** → **"Add permissions"**

### Via AWS CLI

```bash
# Create policy (save as policy.json first)
aws iam create-policy \
  --policy-name NextMeetingS3Access \
  --policy-document file://policy.json

# Get the policy ARN from output
POLICY_ARN="arn:aws:iam::YOUR-ACCOUNT-ID:policy/NextMeetingS3Access"

# Attach to user
aws iam attach-user-policy \
  --user-name nextmeeting-app \
  --policy-arn $POLICY_ARN
```

---

## Step 5: Configure Environment Variables

Add these to your `.env` file or Fly.io secrets:

```bash
# Storage backend
STORAGE_BACKEND=aws-s3

# AWS credentials
AWS_ACCESS_KEY_ID=AKIA...                    # From Step 3
AWS_SECRET_ACCESS_KEY=...                    # From Step 3
AWS_S3_REGION=us-east-1                      # Your bucket region

# Bucket names
AWS_S3_BUCKET=nextmeeting-templates          # Templates bucket
STATIC_SITE_S3_BUCKET=nextmeeting-sites      # Sites bucket
S3_BUCKET_NAME=nextmeeting-templates         # Same as AWS_S3_BUCKET
```

### For Fly.io Deployment

```bash
fly secrets set STORAGE_BACKEND=aws-s3
fly secrets set AWS_ACCESS_KEY_ID="AKIA..."
fly secrets set AWS_SECRET_ACCESS_KEY="..."
fly secrets set AWS_S3_REGION="us-east-1"
fly secrets set AWS_S3_BUCKET="nextmeeting-templates"
fly secrets set STATIC_SITE_S3_BUCKET="nextmeeting-sites"
fly secrets set S3_BUCKET_NAME="nextmeeting-templates"
```

---

## Step 6: Test Connection

### Local Test

```bash
# Start the server
cd regenerate-schedule
npm start

# Check logs for:
# ✅ Storage backend: aws-s3
```

### Test Upload

```bash
# Trigger a job manually
curl -X POST http://localhost:8080/trigger

# Check logs for successful S3 operations
```

### Verify in AWS Console

1. Go to S3 Console
2. Open `nextmeeting-sites` bucket
3. Look for uploaded HTML and JSON files

---

## Step 7: Set Up Bucket CORS (Optional)

If your sites need to be accessed from browsers:

1. **Go to bucket** → `nextmeeting-sites`
2. Click **"Permissions"** tab
3. Scroll to **"Cross-origin resource sharing (CORS)"**
4. Click **"Edit"** and add:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

5. Click **"Save changes"**

---

## Security Best Practices

### 1. Use Least Privilege
- ✅ IAM user has only S3 access
- ✅ No console access
- ✅ Specific bucket permissions only

### 2. Rotate Access Keys
```bash
# Create new key
aws iam create-access-key --user-name nextmeeting-app

# Update your secrets
fly secrets set AWS_ACCESS_KEY_ID="NEW_KEY"
fly secrets set AWS_SECRET_ACCESS_KEY="NEW_SECRET"

# Delete old key
aws iam delete-access-key \
  --user-name nextmeeting-app \
  --access-key-id OLD_KEY_ID
```

### 3. Enable Bucket Versioning
Protects against accidental deletions:

```bash
aws s3api put-bucket-versioning \
  --bucket nextmeeting-sites \
  --versioning-configuration Status=Enabled
```

### 4. Enable Server-Side Encryption
```bash
aws s3api put-bucket-encryption \
  --bucket nextmeeting-sites \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

---

## Troubleshooting

### "Access Denied" Errors

**Check:**
1. Access keys are correct
2. IAM policy is attached to user
3. Bucket names in policy match actual buckets
4. Region is correct

**Fix:**
```bash
# Verify user has policy
aws iam list-attached-user-policies --user-name nextmeeting-app

# Test access
aws s3 ls s3://nextmeeting-templates --region us-east-1
```

### "Bucket Not Found" Errors

**Check:**
1. Bucket names are correct (case-sensitive)
2. Region matches
3. Buckets exist

**Fix:**
```bash
# List your buckets
aws s3 ls

# Verify region
aws s3api get-bucket-location --bucket nextmeeting-templates
```

### Region Mismatch

```bash
# Set region explicitly in code or environment
AWS_S3_REGION=us-east-1
```

---

## Cost Optimization

### 1. Enable Lifecycle Policies
Delete old versions after 30 days:

```json
{
  "Rules": [{
    "Id": "DeleteOldVersions",
    "Status": "Enabled",
    "NoncurrentVersionExpiration": {
      "NoncurrentDays": 30
    }
  }]
}
```

### 2. Use S3 Intelligent-Tiering
Automatically moves objects to cheaper storage:

```bash
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket nextmeeting-sites \
  --id "AutoTiering" \
  --intelligent-tiering-configuration file://tiering.json
```

### 3. Enable S3 Transfer Acceleration
For faster uploads from distant locations (additional cost):

```bash
aws s3api put-bucket-accelerate-configuration \
  --bucket nextmeeting-sites \
  --accelerate-configuration Status=Enabled
```

---

## Next Steps

- **Add CloudFront CDN:** See [docs/optional/cloudfront-setup.md](../optional/cloudfront-setup.md)
- **Set up monitoring:** Enable S3 metrics in CloudWatch
- **Backup strategy:** Consider Cross-Region Replication

---

## Quick Reference

### Required Environment Variables
```bash
STORAGE_BACKEND=aws-s3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_REGION=us-east-1
AWS_S3_BUCKET=nextmeeting-templates
STATIC_SITE_S3_BUCKET=nextmeeting-sites
S3_BUCKET_NAME=nextmeeting-templates
```

### IAM Permissions Needed
- `s3:GetObject` (templates bucket)
- `s3:PutObject` (sites bucket)
- `s3:ListBucket` (both buckets)

### Bucket URLs
- Templates: `s3://nextmeeting-templates/`
- Sites: `https://nextmeeting-sites.s3.amazonaws.com/`

---

## Support

- AWS S3 Documentation: https://docs.aws.amazon.com/s3/
- AWS IAM Documentation: https://docs.aws.amazon.com/iam/
- AWS CLI Reference: https://docs.aws.amazon.com/cli/
