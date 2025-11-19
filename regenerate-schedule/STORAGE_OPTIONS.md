# Storage Options

The NextMeeting Schedule Generator supports multiple storage backends for maximum flexibility. You can choose the storage option that best fits your infrastructure and budget.

## Available Storage Backends

### 1. AWS S3 (Default)

**Best for:** AWS-based infrastructure, proven reliability

**Configuration:**

```bash
STORAGE_BACKEND=aws-s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket
AWS_S3_REGION=us-east-1
STATIC_SITE_S3_BUCKET=your-static-site-bucket
S3_BUCKET_NAME=your-bucket
```

**Features:**
- ✅ Public URLs available
- ✅ CDN integration (CloudFront)
- ✅ High availability (99.99%)
- ✅ Global edge locations
- ✅ Mature ecosystem

**Cost:** ~$0.023/GB storage + $0.09/GB transfer

**Setup:**
1. Create S3 buckets in AWS Console
2. Create IAM user with S3 permissions
3. Generate access keys
4. Set environment variables

---

### 2. Cloudflare R2

**Best for:** Cost-effective storage, Cloudflare CDN integration

**Configuration:**

```bash
STORAGE_BACKEND=cloudflare-r2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-r2-key
R2_SECRET_ACCESS_KEY=your-r2-secret
R2_BUCKET_NAME=your-bucket
R2_PUBLIC_DOMAIN=your-custom-domain.com  # Optional
```

**Features:**
- ✅ S3-compatible API
- ✅ No egress fees (FREE data transfer)
- ✅ Cloudflare CDN integration
- ✅ Custom domain support
- ✅ Lower cost than S3

**Cost:** $0.015/GB storage, **$0.00/GB egress** 🎉

**Setup:**
1. Go to Cloudflare Dashboard → R2
2. Create a bucket
3. Generate R2 API tokens
4. (Optional) Set up custom domain for public access
5. Set environment variables

**Why choose R2?**
- 💰 **Zero egress fees** - Perfect for high-traffic sites
- 🚀 **Cloudflare CDN** - Global performance
- 💵 **Lower cost** - ~40% cheaper storage than S3
- 🔄 **S3 compatible** - Easy migration

---

### 3. Fly.io Volumes

**Best for:** Self-contained deployment, privacy, simplicity

**Configuration:**

```bash
STORAGE_BACKEND=fly-volumes
FLY_VOLUME_PATH=/data
FLY_APP_URL=https://your-app.fly.dev  # Optional, for URLs
```

**Features:**
- ✅ Persistent volumes on Fly.io
- ✅ No external dependencies
- ✅ Fast local access
- ✅ Private by default
- ✅ Simple setup

**Cost:** $0.15/GB per month

**Setup:**
1. Create a volume:
   ```bash
   fly volumes create nextmeeting_data --size 10
   ```

2. Update `fly.toml`:
   ```toml
   [[mounts]]
   source = "nextmeeting_data"
   destination = "/data"
   ```

3. Set environment variables:
   ```bash
   fly secrets set STORAGE_BACKEND=fly-volumes
   fly secrets set FLY_VOLUME_PATH=/data
   ```

**Why choose Fly Volumes?**
- 🔒 **Private** - Data stays on your infrastructure
- 🚀 **Fast** - Local filesystem speed
- 💡 **Simple** - No external service setup
- 💰 **Predictable** - Fixed cost per GB

---

### 4. Local Filesystem

**Best for:** Development, testing, local deployments

**Configuration:**

```bash
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./local-storage  # Optional, defaults to ./local-storage
```

**Features:**
- ✅ No external dependencies
- ✅ Easy development
- ✅ Fast access
- ⚠️ Not for production
- ⚠️ No redundancy

**Cost:** FREE (uses local disk)

**Setup:**
Just set the environment variable - no external setup needed!

**Use cases:**
- Local development
- Testing
- Demo environments
- Single-machine deployments

---

## Comparison Table

| Feature | AWS S3 | Cloudflare R2 | Fly Volumes | Local |
|---------|--------|---------------|-------------|-------|
| **Storage Cost** | $0.023/GB | $0.015/GB | $0.15/GB | Free |
| **Egress Cost** | $0.09/GB | **FREE** | Included | Free |
| **Public URLs** | ✅ Yes | ✅ Yes (with domain) | ⚠️ Via app | ❌ No |
| **CDN Integration** | CloudFront | Cloudflare | Manual | ❌ No |
| **Redundancy** | 99.99% | 99.99% | ⚠️ Single disk | ❌ No |
| **Setup Complexity** | Medium | Medium | Low | None |
| **Best For** | AWS users | Cost savings | Simplicity | Development |

---

## Migration Between Backends

### From S3 to R2

R2 is S3-compatible, making migration straightforward:

1. Copy data from S3 to R2:
   ```bash
   # Using rclone
   rclone copy s3:your-bucket r2:your-bucket
   ```

2. Update environment variables:
   ```bash
   fly secrets set STORAGE_BACKEND=cloudflare-r2
   fly secrets set R2_ACCOUNT_ID=...
   # ... other R2 vars
   ```

3. Deploy and test

### From S3/R2 to Fly Volumes

1. Download files from S3/R2 locally

2. Create Fly volume and update fly.toml

3. SSH into Fly instance:
   ```bash
   fly ssh console
   ```

4. Upload files to volume

5. Update environment variables:
   ```bash
   fly secrets set STORAGE_BACKEND=fly-volumes
   ```

---

## Recommendations

### For Production

**High Traffic (>1TB egress/month):**
→ **Cloudflare R2** - Zero egress fees save $$

**AWS Ecosystem:**
→ **AWS S3** - Native integration, familiar

**Privacy/Compliance:**
→ **Fly Volumes** - Keep data on your infrastructure

### For Development

**Local Development:**
→ **Local Filesystem** - No setup required

**Staging/Testing:**
→ **Cloudflare R2** - Free tier available

---

## Environment Variable Reference

### Required for All Backends
```bash
STORAGE_BACKEND=aws-s3|cloudflare-r2|fly-volumes|local
GOOGLE_API_CLIENT_EMAIL=...
GOOGLE_API_PRIVATE_KEY=...
```

### AWS S3 Specific
```bash
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
AWS_S3_REGION=us-east-1
STATIC_SITE_S3_BUCKET=...
S3_BUCKET_NAME=...
```

### Cloudflare R2 Specific
```bash
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_DOMAIN=...  # Optional
```

### Fly Volumes Specific
```bash
FLY_VOLUME_PATH=/data
FLY_APP_URL=...  # Optional
```

### Local Filesystem Specific
```bash
LOCAL_STORAGE_PATH=./local-storage  # Optional
```

---

## Troubleshooting

### "Unknown storage backend" error
- Check `STORAGE_BACKEND` is set correctly
- Must be one of: `aws-s3`, `cloudflare-r2`, `fly-volumes`, `local`

### S3 permission errors
- Verify IAM user has `s3:PutObject`, `s3:GetObject` permissions
- Check bucket policies

### R2 authentication errors
- Verify R2 API token is active
- Check account ID is correct
- Ensure bucket exists

### Fly Volumes not persisting
- Verify volume is mounted in fly.toml
- Check FLY_VOLUME_PATH matches mount destination
- Use `fly ssh console` to inspect volume

### Local storage issues
- Check LOCAL_STORAGE_PATH directory exists and is writable
- Verify sufficient disk space

---

## Advanced: Custom Storage Backend

You can add your own storage backend by creating an adapter:

1. Create `storage/adapters/yourBackend.js`
2. Implement these functions:
   - `uploadFile({ bucket, key, body, contentType })`
   - `downloadFile({ bucket, key })`
   - `fileExists({ bucket, key })`
   - `getPublicUrl({ bucket, key })` (optional)

3. Update `storage/storageAdapter.js` to include your backend

Example backends you could add:
- Azure Blob Storage
- Google Cloud Storage
- DigitalOcean Spaces
- Backblaze B2
- MinIO
- IPFS

---

## Cost Estimates (10GB storage, 100GB egress/month)

| Backend | Storage | Egress | Total/Month |
|---------|---------|--------|-------------|
| **AWS S3** | $0.23 | $9.00 | **$9.23** |
| **Cloudflare R2** | $0.15 | $0.00 | **$0.15** 🎉 |
| **Fly Volumes** | $1.50 | Included | **$1.50** |
| **Local** | Free | Included | **$0.00** |

> **Note:** R2 has a massive advantage for high-traffic sites due to free egress!

---

## Questions?

- **Which should I use?** → Start with R2 (best value)
- **Can I switch later?** → Yes, easily!
- **Do I need CDN?** → Recommended for production
- **What about backups?** → S3/R2 have built-in redundancy

For more help, see:
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Fly.io Volumes Documentation](https://fly.io/docs/reference/volumes/)
