# CloudFront CDN Setup Guide

Complete guide to set up AWS CloudFront CDN for caching and fast global delivery of your NextMeeting schedules.

## Overview

**What is CloudFront?**
AWS's Content Delivery Network (CDN) that caches your S3 files at edge locations worldwide for fast access.

**What you'll create:**
- CloudFront distribution
- Cache invalidation configuration  
- Custom domain (optional)
- SSL certificate (optional)

**Time required:** ~20 minutes

**Cost:** 
- Free tier: 1TB transfer/month for 12 months
- After: $0.085/GB (first 10TB)
- Requests: $0.0075 per 10,000 HTTP requests

**Why CloudFront?**
- 🌍 **Global edge locations** - 400+ POPs worldwide
- ⚡ **Fast** - Sub-100ms latency globally
- 💰 **Cost-effective** - Reduces S3 costs
- 🔒 **HTTPS** - Free SSL certificates
- 📊 **Analytics** - Detailed metrics

---

## Prerequisites

- AWS Account
- S3 bucket with website files (see [S3 Setup Guide](../storage/aws-s3-setup.md))
- Domain name (optional, for custom URL)

---

## Step 1: Create CloudFront Distribution

### Via AWS Console

1. **Go to CloudFront Console**
   - Navigate to: https://console.aws.amazon.com/cloudfront/

2. **Create Distribution**
   - Click **"Create distribution"**

3. **Origin Settings**
   - **Origin domain:** Select your S3 bucket (e.g., `nextmeeting-sites.s3.amazonaws.com`)
   - **Origin path:** Leave empty
   - **Name:** Auto-filled
   - **Origin access:** Select **"Origin access control settings (recommended)"**
     - Click **"Create control setting"**
     - Name: `nextmeeting-oac`
     - Click **"Create"**

4. **Default Cache Behavior**
   - **Viewer protocol policy:** **"Redirect HTTP to HTTPS"**
   - **Allowed HTTP methods:** **"GET, HEAD, OPTIONS"**
   - **Cache policy:** **"CachingOptimized"**
   - **Origin request policy:** Leave default

5. **Settings**
   - **Price class:** **"Use only North America and Europe"** (or "Use all edge locations")
   - **Alternate domain names (CNAME):** Add your custom domain (optional)
     - e.g., `meetings.yourdomain.com`
   - **Custom SSL certificate:** Select certificate (if using custom domain)
   - **Default root object:** `index.html`

6. **Create Distribution**
   - Click **"Create distribution"**
   - **Note the distribution ID** (e.g., `E1ABCDEFGHIJKL`)
   - Wait 5-15 minutes for deployment

### Via AWS CLI

```bash
# Create distribution
aws cloudfront create-distribution \
  --origin-domain-name nextmeeting-sites.s3.amazonaws.com \
  --default-root-object index.html

# Get distribution ID from output
DISTRIBUTION_ID=E1ABCDEFGHIJKL
```

---

## Step 2: Update S3 Bucket Policy

CloudFront needs permission to access your S3 bucket.

1. **Copy Policy from CloudFront**
   - In CloudFront console, you'll see a banner:
   - "The S3 bucket policy needs to be updated"
   - Click **"Copy policy"**

2. **Update S3 Bucket**
   - Go to S3 Console
   - Select your `nextmeeting-sites` bucket
   - Go to **"Permissions"** tab
   - Click **"Bucket Policy"** → **"Edit"**
   - Paste the copied policy
   - Click **"Save changes"**

**Example Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::nextmeeting-sites/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT-ID:distribution/E1ABCDEFGHIJKL"
        }
      }
    }
  ]
}
```

---

## Step 3: Test Distribution

### Get CloudFront URL

```bash
# From console
# Go to CloudFront → Distributions
# Copy "Distribution domain name"
# e.g., d111111abcdef8.cloudfront.net
```

### Test Access

```bash
# Test with curl
curl https://d111111abcdef8.cloudfront.net/UUID.html

# Should return your HTML file

# Check headers for caching
curl -I https://d111111abcdef8.cloudfront.net/UUID.html

# Look for:
# X-Cache: Hit from cloudfront
# X-Amz-Cf-Pop: IAD89-C1
```

---

## Step 4: Configure Cache Invalidation

Your app needs to invalidate the CDN cache when files are updated.

### Create IAM Policy

1. **Go to IAM Console** → Policies
2. **Create policy** with this JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListInvalidations"
      ],
      "Resource": "arn:aws:cloudfront::ACCOUNT-ID:distribution/E1ABCDEFGHIJKL"
    }
  ]
}
```

3. **Name:** `NextMeetingCloudFrontInvalidation`
4. **Attach to your IAM user** (from S3 setup)

### Configure Environment Variable

```bash
# Add to .env
CLOUDFRONT_DISTRIBUTION_ID=E1ABCDEFGHIJKL

# For Fly.io
fly secrets set CLOUDFRONT_DISTRIBUTION_ID=E1ABCDEFGHIJKL
```

### Test Invalidation

```bash
# Manually trigger invalidation
aws cloudfront create-invalidation \
  --distribution-id E1ABCDEFGHIJKL \
  --paths "/*"

# Check invalidation status
aws cloudfront get-invalidation \
  --distribution-id E1ABCDEFGHIJKL \
  --id I1ABCDEFGHIJKL
```

---

## Step 5: (Optional) Custom Domain

### Prerequisites

- Domain registered (AWS Route 53 or elsewhere)
- ACM SSL certificate in `us-east-1` region

### Create SSL Certificate

1. **Go to ACM Console** (Certificate Manager)
   - **Important:** Must be in `us-east-1` region for CloudFront
   - https://console.aws.amazon.com/acm/home?region=us-east-1

2. **Request Certificate**
   - Click **"Request a certificate"**
   - Select **"Request a public certificate"**
   - **Domain name:** `meetings.yourdomain.com`
   - **Validation method:** **"DNS validation"**
   - Click **"Request"**

3. **Validate Domain**
   - Click into the certificate
   - Click **"Create records in Route 53"** (if using Route 53)
   - Or manually add CNAME to your DNS provider
   - Wait for status: **"Issued"** (~5-30 minutes)

### Add Domain to Distribution

1. **Go to CloudFront** → Your distribution → **"Edit"**
2. **Alternate domain names (CNAMEs):**
   - Add: `meetings.yourdomain.com`
3. **Custom SSL certificate:**
   - Select your ACM certificate
4. **Save changes**

### Update DNS

Create CNAME record pointing to CloudFront:

**Route 53:**
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "meetings.yourdomain.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "d111111abcdef8.cloudfront.net"}]
      }
    }]
  }'
```

**Other DNS Providers:**
- Type: `CNAME`
- Name: `meetings`
- Value: `d111111abcdef8.cloudfront.net`
- TTL: `300`

### Test Custom Domain

```bash
# Wait for DNS propagation (1-5 minutes)
nslookup meetings.yourdomain.com

# Test access
curl https://meetings.yourdomain.com/UUID.html
```

---

## Configuration Options

### Cache Behaviors

Control caching per path:

```yaml
# Example behaviors:
/static/*    -> Cache for 1 year
/*.html      -> Cache for 1 hour
/*.json      -> Cache for 5 minutes
/api/*       -> No caching
```

### Set in Console:
1. Distribution → **"Behaviors"** tab
2. **"Create behavior"**
3. **Path pattern:** `/*.json`
4. **Cache policy:** Create custom with TTL = 300

### Compression

Enable Gzip/Brotli compression:

1. Distribution → **"Behaviors"** → Edit default
2. **Compress objects automatically:** **Yes**
3. Save changes

### Geographic Restrictions

Block/allow specific countries:

1. Distribution → **"Security"** tab
2. **Geographic restrictions:** Edit
3. **Restriction type:**
   - Allow list: Only listed countries
   - Block list: All except listed countries
4. Select countries
5. Save

---

## Monitoring

### CloudFront Metrics

View in CloudWatch:

```bash
# Get cache hit rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=E1ABCDEFGHIJKL \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average
```

### Enable Real-Time Logs

1. Distribution → **"Logs"** tab
2. **"Create log configuration"**
3. Select fields to log
4. Choose Kinesis stream
5. Save

### Set Up Alarms

```bash
# Alert on low cache hit rate
aws cloudwatch put-metric-alarm \
  --alarm-name cloudfront-low-cache-hit \
  --alarm-description "Cache hit rate below 80%" \
  --metric-name CacheHitRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=DistributionId,Value=E1ABCDEFGHIJKL
```

---

## Cost Optimization

### 1. Choose Appropriate Price Class

```bash
# North America & Europe only (cheapest)
Price Class: 100

# North America, Europe, Asia, Middle East, Africa
Price Class: 200

# All edge locations (most expensive)
Price Class: All
```

**Savings:** 20-30% with Price Class 100

### 2. Optimize Cache Hit Rate

Higher cache hit rate = fewer S3 requests = lower cost

**Tips:**
- Set appropriate TTLs
- Use query string caching wisely
- Enable compression
- Use versioned filenames

### 3. Use Reserved Capacity (High Volume)

If you transfer >10TB/month:
- Contact AWS for reserved capacity pricing
- Save up to 30%

---

## Security

### 1. Origin Access Control (OAC)

Prevents direct S3 access:
- ✅ Configured in Step 1
- Ensures all traffic goes through CloudFront
- S3 bucket can be private

### 2. Enable WAF (Web Application Firewall)

```bash
# Create WAF Web ACL
aws wafv2 create-web-acl \
  --name nextmeeting-waf \
  --scope CLOUDFRONT \
  --default-action Allow={} \
  --rules file://waf-rules.json

# Associate with distribution
aws cloudfront update-distribution \
  --id E1ABCDEFGHIJKL \
  --web-acl-id WAF_ACL_ID
```

### 3. Enable HTTPS Only

1. Distribution → Edit
2. **Viewer protocol policy:** "Redirect HTTP to HTTPS"
3. **Minimum SSL/TLS version:** "TLSv1.2_2021"

### 4. Enable Access Logs

```bash
# Create logging bucket
aws s3 mb s3://nextmeeting-cloudfront-logs

# Enable logging on distribution
aws cloudfront update-distribution \
  --id E1ABCDEFGHIJKL \
  --logging-config Enabled=true,Bucket=nextmeeting-cloudfront-logs.s3.amazonaws.com,Prefix=logs/
```

---

## Troubleshooting

### "403 Forbidden" Errors

**Causes:**
- S3 bucket policy not updated
- OAC not configured
- Object doesn't exist

**Fix:**
1. Check S3 bucket policy (Step 2)
2. Verify OAC in distribution settings
3. Test S3 object exists:
   ```bash
   aws s3 ls s3://nextmeeting-sites/UUID.html
   ```

### "504 Gateway Timeout"

**Causes:**
- Origin (S3) taking too long
- Network issues

**Fix:**
1. Check S3 bucket region matches
2. Increase origin timeout:
   - Distribution → Origins → Edit
   - Origin response timeout: 30 seconds

### Stale Content

**Cause:** Cache not invalidated

**Fix:**
```bash
# Invalidate specific files
aws cloudfront create-invalidation \
  --distribution-id E1ABCDEFGHIJKL \
  --paths "/UUID.html" "/UUID.json"

# Invalidate everything
aws cloudfront create-invalidation \
  --distribution-id E1ABCDEFGHIJKL \
  --paths "/*"
```

### "Distribution Not Found"

**Check:**
- Distribution ID is correct
- Distribution is deployed (status: "Deployed")

---

## Best Practices

### 1. Use Cache-Control Headers

Set in S3 when uploading:

```javascript
await s3.upload({
  Bucket: 'nextmeeting-sites',
  Key: 'UUID.html',
  Body: html,
  ContentType: 'text/html',
  CacheControl: 'public, max-age=3600'  // Cache for 1 hour
}).promise();
```

### 2. Version Your Files

Append version/hash to filename:

```javascript
// Good (cache-friendly)
const filename = `${uuid}.${hash}.html`;

// Bad (requires invalidation)
const filename = `${uuid}.html`;
```

### 3. Separate Cache Behaviors

Different TTLs for different content:

```
/*.html        -> 1 hour TTL
/*.json        -> 5 minutes TTL
/static/*      -> 1 year TTL
```

### 4. Monitor Cache Hit Rate

Aim for >80% cache hit rate:

```bash
# Check cache hit rate
aws cloudwatch get-metric-statistics \
  --metric-name CacheHitRate \
  --namespace AWS/CloudFront \
  ...
```

---

## Quick Reference

### Required Environment Variable
```bash
CLOUDFRONT_DISTRIBUTION_ID=E1ABCDEFGHIJKL  # Optional feature
```

### Common Commands
```bash
# Create invalidation
aws cloudfront create-invalidation \
  --distribution-id E1ABC... \
  --paths "/*"

# List distributions
aws cloudfront list-distributions

# Get distribution info
aws cloudfront get-distribution --id E1ABC...
```

### URLs
- Console: https://console.aws.amazon.com/cloudfront/
- Docs: https://docs.aws.amazon.com/cloudfront/

---

## Alternative: Cloudflare CDN

If using Cloudflare R2 storage:
- CDN is **included automatically** with custom domains
- No separate setup required
- Zero additional cost
- See [Cloudflare R2 Setup](../storage/cloudflare-r2-setup.md)

---

## Next Steps

- Monitor cache hit rates
- Set up CloudWatch alarms
- Test from multiple regions
- Consider Lambda@Edge for dynamic content

---

## Support

- CloudFront Documentation: https://docs.aws.amazon.com/cloudfront/
- AWS Support: https://console.aws.amazon.com/support/
- Community: https://repost.aws/tags/TA4IvCeWI1TE-q6qvZ6f6LXg/aws-cloud-front
