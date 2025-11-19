# Cloudflare R2 Setup Guide

Complete step-by-step guide to set up Cloudflare R2 for NextMeeting schedule storage.

## Overview

**What you'll create:**
- Cloudflare R2 bucket
- R2 API tokens with permissions
- (Optional) Custom domain for public access

**Time required:** ~10 minutes

**Cost:** ~$0.015/GB storage + **$0.00/GB egress** (FREE!) 🎉

**Why R2?**
- 💰 **Zero egress fees** - Massive savings vs S3
- 🚀 **S3-compatible API** - Easy migration
- 🌍 **Global network** - Cloudflare's edge
- 💵 **Lower storage cost** - ~40% cheaper than S3

---

## Prerequisites

- Cloudflare account (free tier available)
- Domain managed by Cloudflare (optional, for public URLs)

---

## Step 1: Enable R2

1. **Log in to Cloudflare Dashboard**
   - Navigate to: https://dash.cloudflare.com/

2. **Enable R2**
   - Click **"R2"** in the left sidebar
   - If prompted, click **"Purchase R2"** 
   - Note: Free tier includes 10GB storage/month
   - Click **"Enable R2"**

3. **Note Your Account ID**
   - You'll see it in the R2 overview page
   - Format: `abc123def456...`
   - **Save this** - you'll need it later

---

## Step 2: Create R2 Bucket

### Via Cloudflare Dashboard

1. **Create Bucket**
   - In R2 dashboard, click **"Create bucket"**
   - **Bucket name:** `nextmeeting-data` (must be lowercase, no special chars)
   - **Location:** Automatic (Cloudflare picks optimal location)
   - Click **"Create bucket"**

2. **Bucket Created!**
   - You'll see your new bucket in the list
   - Note the bucket name - you'll need it for configuration

### Via Wrangler CLI (Alternative)

```bash
# Install Wrangler
npm install -g wrangler

# Authenticate
wrangler login

# Create bucket
wrangler r2 bucket create nextmeeting-data
```

---

## Step 3: Generate API Tokens

1. **Go to R2 API Tokens**
   - In R2 dashboard, click **"Manage R2 API Tokens"**
   - Or navigate to: https://dash.cloudflare.com/?to=/:account/r2/api-tokens

2. **Create API Token**
   - Click **"Create API token"**

3. **Configure Token**
   - **Token name:** `NextMeeting App Token`
   - **Permissions:**
     - Select **"Object Read & Write"**
   - **Bucket scope:**
     - Select **"Apply to specific buckets only"**
     - Choose `nextmeeting-data`
   - **TTL:** Leave default (no expiration)

4. **Create Token**
   - Click **"Create API Token"**

5. **Save Credentials** ⚠️ IMPORTANT
   - **Access Key ID:** `abc123...` (copy this)
   - **Secret Access Key:** `xyz789...` (copy this - shown only once!)
   - Click **"Finish"**
   - Store these securely!

---

## Step 4: (Optional) Set Up Custom Domain

For public access to your files via a custom domain:

### Prerequisites
- Domain managed by Cloudflare DNS
- Domain proxied through Cloudflare (orange cloud)

### Setup Steps

1. **Connect Domain to R2**
   - In R2 dashboard, open your `nextmeeting-data` bucket
   - Click **"Settings"** tab
   - Scroll to **"Public access"**
   - Click **"Connect Domain"**

2. **Choose Domain**
   - Enter your subdomain: `files.yourdomain.com`
   - Click **"Continue"**

3. **Configure DNS**
   - Cloudflare automatically creates a CNAME record
   - This points your subdomain to R2
   - DNS propagation: ~1-5 minutes

4. **Verify**
   - Wait a few minutes
   - Test: `https://files.yourdomain.com/test.txt`
   - Should show "Domain connected" or your file

### Alternative: Direct R2 Public URLs

For simpler setup without custom domain:

1. **Enable Public Access**
   - Go to bucket → Settings
   - Toggle **"Allow public access"** ON
   - Confirm the warning

2. **Get Public URL**
   - Files will be accessible at:
   - `https://pub-[hash].r2.dev/your-file.html`
   - Not recommended for production (hash in URL)

---

## Step 5: Configure Environment Variables

Add these to your `.env` file or Fly.io secrets:

```bash
# Storage backend
STORAGE_BACKEND=cloudflare-r2

# R2 credentials
R2_ACCOUNT_ID=abc123def456...                # From Step 1
R2_ACCESS_KEY_ID=abc123...                   # From Step 3
R2_SECRET_ACCESS_KEY=xyz789...               # From Step 3
R2_BUCKET_NAME=nextmeeting-data              # Your bucket name

# Custom domain (optional)
R2_PUBLIC_DOMAIN=files.yourdomain.com        # From Step 4 (if configured)
```

### For Fly.io Deployment

```bash
fly secrets set STORAGE_BACKEND=cloudflare-r2
fly secrets set R2_ACCOUNT_ID="abc123def456..."
fly secrets set R2_ACCESS_KEY_ID="abc123..."
fly secrets set R2_SECRET_ACCESS_KEY="xyz789..."
fly secrets set R2_BUCKET_NAME="nextmeeting-data"

# Optional: custom domain
fly secrets set R2_PUBLIC_DOMAIN="files.yourdomain.com"
```

---

## Step 6: Upload Template Files

### Via Cloudflare Dashboard

1. **Open Bucket**
   - Go to R2 → `nextmeeting-data`
   - Click **"Upload"**

2. **Upload Files**
   - Drag and drop your template HTML files
   - Or click **"Select from computer"**
   - Click **"Upload"**

### Via Wrangler CLI

```bash
# Upload a file
wrangler r2 object put \
  nextmeeting-data/B0E7F18B-4CF5-49FF-BBD3-75E1CA52AA5E.template.html \
  --file=./template.html

# Upload directory
wrangler r2 object put \
  nextmeeting-data/templates/ \
  --file=./templates/ \
  --recursive
```

### Via AWS CLI (S3-Compatible)

Since R2 is S3-compatible:

```bash
# Configure AWS CLI to use R2
aws configure set aws_access_key_id "YOUR_R2_ACCESS_KEY"
aws configure set aws_secret_access_key "YOUR_R2_SECRET_KEY"

# Upload file
aws s3 cp template.html \
  s3://nextmeeting-data/ \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
```

---

## Step 7: Test Connection

### Local Test

```bash
# Start the server
cd regenerate-schedule
npm start

# Check logs for:
# ✅ Storage backend: cloudflare-r2
```

### Test Upload

```bash
# Trigger a job manually
curl -X POST http://localhost:8080/trigger

# Check logs for successful R2 operations
# Should see: [R2] Uploading to r2://...
```

### Verify in Cloudflare Dashboard

1. Go to R2 → `nextmeeting-data`
2. Look for uploaded HTML and JSON files
3. Check file sizes and timestamps

---

## Cost Calculator

Use Cloudflare's R2 pricing:

### Storage
- **First 10GB:** FREE
- **Over 10GB:** $0.015/GB/month

### Operations
- **Class A (writes):** $4.50 per million
- **Class B (reads):** $0.36 per million

### Egress
- **All egress:** **FREE** (biggest savings!)

### Example Monthly Cost

**Scenario:** 50GB storage, 100GB egress, 10K writes, 100K reads

| Service | S3 Cost | R2 Cost | Savings |
|---------|---------|---------|---------|
| Storage (50GB) | $1.15 | $0.60 | 48% |
| Egress (100GB) | $9.00 | $0.00 | 100% |
| Operations | $0.01 | $0.08 | - |
| **Total** | **$10.16** | **$0.68** | **93%** |

💰 **R2 saves $9.48/month in this example!**

---

## Security Best Practices

### 1. Use Scoped API Tokens

Create separate tokens for different purposes:

```bash
# Production token (read/write to specific bucket)
Token name: NextMeeting Production
Permissions: Object Read & Write
Buckets: nextmeeting-data

# Read-only token (for debugging)
Token name: NextMeeting ReadOnly
Permissions: Object Read
Buckets: nextmeeting-data
```

### 2. Enable Audit Logging

Track all R2 API operations:

1. Go to Account → Analytics & Logs
2. Enable **R2 Logs**
3. Send to Logpush (optional)

### 3. Set Object Lifecycle Rules

Auto-delete old versions:

```javascript
// Via Wrangler
wrangler r2 bucket lifecycle put nextmeeting-data \
  --days 30 \
  --prefix "temp/"
```

### 4. Rotate API Tokens

```bash
# Create new token in dashboard
# Update your secrets
fly secrets set R2_ACCESS_KEY_ID="NEW_KEY"
fly secrets set R2_SECRET_ACCESS_KEY="NEW_SECRET"

# Revoke old token in Cloudflare dashboard
```

---

## Advanced Features

### 1. S3 API Compatibility

R2 works with any S3-compatible tool:

```bash
# Rclone
rclone copy ./local r2:nextmeeting-data

# s3cmd
s3cmd put file.txt s3://nextmeeting-data/

# Cyberduck, Transmit, etc.
```

### 2. Workers Integration

Process files on upload with Cloudflare Workers:

```javascript
// worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);
    
    // Get from R2
    const object = await env.MY_BUCKET.get(key);
    
    // Transform or serve
    return new Response(object.body);
  }
}
```

### 3. Image Resizing

Serve resized images on-the-fly:

```javascript
// Enable Image Resizing in dashboard
// Access via: https://yourdomain.com/cdn-cgi/image/width=400/image.jpg
```

---

## Troubleshooting

### "Invalid Account ID" Errors

**Check:**
1. Account ID is correct (from R2 dashboard)
2. No spaces or extra characters
3. Format: `abc123def456...`

**Fix:**
```bash
# View account ID
wrangler whoami

# Or check dashboard URL:
# https://dash.cloudflare.com/ABC123.../r2
#                              ^^^^^^^^ This is your account ID
```

### "Access Denied" Errors

**Check:**
1. API token has correct permissions
2. Bucket name is correct
3. Token isn't expired

**Fix:**
```bash
# Verify token permissions in dashboard
# Create new token if needed
# Update secrets immediately
```

### "Bucket Not Found" Errors

**Check:**
1. Bucket name is correct (case-sensitive)
2. Bucket exists in your account

**Fix:**
```bash
# List buckets
wrangler r2 bucket list

# Verify bucket name matches exactly
```

### CORS Errors (for public access)

**Fix:**
1. Go to bucket → Settings → CORS policy
2. Add CORS configuration:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Migration from S3 to R2

### Using Rclone (Recommended)

1. **Install Rclone**
   ```bash
   curl https://rclone.org/install.sh | sudo bash
   ```

2. **Configure S3 Remote**
   ```bash
   rclone config
   # Name: s3
   # Type: s3
   # Provider: AWS
   # Enter credentials...
   ```

3. **Configure R2 Remote**
   ```bash
   rclone config
   # Name: r2
   # Type: s3
   # Provider: Cloudflare
   # Endpoint: https://ACCOUNT_ID.r2.cloudflarestorage.com
   # Enter R2 credentials...
   ```

4. **Copy Data**
   ```bash
   # Dry run first
   rclone copy s3:old-bucket r2:nextmeeting-data --dry-run
   
   # Actual copy
   rclone copy s3:old-bucket r2:nextmeeting-data --progress
   ```

### Using AWS CLI

```bash
# Sync from S3 to R2
aws s3 sync s3://old-bucket/ \
  s3://nextmeeting-data/ \
  --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com \
  --profile r2
```

---

## Performance Optimization

### 1. Use Cloudflare CDN

- Automatic with custom domains
- Global edge cache
- Fast TTFB worldwide

### 2. Enable Compression

```bash
# Upload with Content-Encoding
wrangler r2 object put nextmeeting-data/file.json \
  --file=file.json \
  --content-encoding=gzip
```

### 3. Set Cache Headers

```javascript
// When uploading via code
await uploadFile({
  bucket: 'nextmeeting-data',
  key: 'file.html',
  body: html,
  contentType: 'text/html',
  cacheControl: 'public, max-age=3600'
});
```

---

## Comparison: R2 vs S3

| Feature | R2 | S3 |
|---------|----|----|
| **Storage** | $0.015/GB | $0.023/GB |
| **Egress** | **FREE** 🎉 | $0.09/GB |
| **API** | S3-compatible | S3 native |
| **CDN** | Cloudflare | CloudFront (extra) |
| **Locations** | Global (auto) | Regional |
| **Setup** | 10 min | 15 min |
| **Free Tier** | 10GB/month | 5GB/12 months |

**Winner:** R2 for most use cases (especially high egress)

---

## Next Steps

- **Monitor usage:** Check R2 Analytics in dashboard
- **Set up alerts:** Configure budget alerts in Cloudflare
- **Add CDN:** Already included with custom domain!

---

## Quick Reference

### Required Environment Variables
```bash
STORAGE_BACKEND=cloudflare-r2
R2_ACCOUNT_ID=abc123def456...
R2_ACCESS_KEY_ID=abc123...
R2_SECRET_ACCESS_KEY=xyz789...
R2_BUCKET_NAME=nextmeeting-data
R2_PUBLIC_DOMAIN=files.yourdomain.com  # Optional
```

### R2 Endpoint
```
https://ACCOUNT_ID.r2.cloudflarestorage.com
```

### Public URLs
- Custom domain: `https://files.yourdomain.com/file.html`
- Direct: `https://pub-[hash].r2.dev/file.html`

---

## Support

- Cloudflare R2 Docs: https://developers.cloudflare.com/r2/
- Cloudflare Community: https://community.cloudflare.com/
- Wrangler Docs: https://developers.cloudflare.com/workers/wrangler/
