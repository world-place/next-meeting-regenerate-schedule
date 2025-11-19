# Fly.io Volumes Setup Guide

Complete step-by-step guide to set up Fly.io Volumes for NextMeeting schedule storage.

## Overview

**What you'll create:**
- Persistent volume on Fly.io
- Volume mount configuration
- Local filesystem storage on your Fly instance

**Time required:** ~5 minutes

**Cost:** $0.15/GB/month (simple, predictable)

**Why Fly Volumes?**
- 🔒 **Private** - Data stays on your infrastructure
- 🚀 **Fast** - Local disk speed
- 💡 **Simple** - No external services needed
- 💰 **Predictable** - Fixed cost per GB
- 🛡️ **Secure** - No API keys to manage

---

## Prerequisites

- Fly.io account (sign up at https://fly.io)
- Fly CLI installed
- App already created (from main deployment)

---

## Step 1: Install Fly CLI

### MacOS/Linux

```bash
curl -L https://fly.io/install.sh | sh
```

### Windows (PowerShell)

```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

### Verify Installation

```bash
fly version
# Should show: flyctl v0.x.x
```

---

## Step 2: Authenticate

```bash
# Login to Fly.io
fly auth login

# This opens a browser to authenticate
# Or use: fly auth token
```

---

## Step 3: Create Volume

### Choose Volume Size

Determine how much storage you need:

| Data Size | Recommended Volume | Cost/Month |
|-----------|-------------------|------------|
| Small (< 1GB) | 3GB | $0.45 |
| Medium (1-10GB) | 10GB | $1.50 |
| Large (10-50GB) | 50GB | $7.50 |
| X-Large (50-100GB) | 100GB | $15.00 |

### Create the Volume

```bash
# Basic syntax
fly volumes create <volume-name> --size <size-in-gb>

# Example: 10GB volume
fly volumes create nextmeeting_data --size 10

# Or with region specified
fly volumes create nextmeeting_data --size 10 --region iad

# Choose your region (closest to your Google Sheets API):
# iad = Virginia (US East)
# ord = Chicago (US Central)
# sjc = San Jose (US West)
# lhr = London (Europe)
# nrt = Tokyo (Asia)
```

### Verify Volume Created

```bash
# List volumes
fly volumes list

# You should see:
# ID           NAME              SIZE  REGION  ATTACHED VM  CREATED AT
# vol_abc123   nextmeeting_data  10GB  iad     -            2024-01-15
```

---

## Step 4: Update fly.toml Configuration

Add volume mount to your `fly.toml`:

```toml
# fly.toml

app = "your-app-name"
primary_region = "iad"

[build]

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false
  auto_start_machines = false
  min_machines_running = 1

# ⬇️ ADD THIS SECTION ⬇️
[[mounts]]
  source = "nextmeeting_data"    # Volume name from Step 3
  destination = "/data"           # Where it mounts in the container

[env]
  PORT = "8080"
  CRON_SCHEDULE = "0 * * * *"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

**Important:** The `source` must match your volume name!

---

## Step 5: Configure Environment Variables

```bash
# Set storage backend
fly secrets set STORAGE_BACKEND=fly-volumes

# Set mount path (must match fly.toml destination)
fly secrets set FLY_VOLUME_PATH=/data

# Optional: set app URL for generating public URLs
fly secrets set FLY_APP_URL=https://your-app.fly.dev
```

---

## Step 6: Deploy

```bash
# Deploy with volume mounted
fly deploy

# Watch the deployment
# You'll see: "Mounting volume nextmeeting_data at /data"
```

### Verify Mount

```bash
# SSH into your instance
fly ssh console

# Check if volume is mounted
df -h | grep /data

# You should see:
# /dev/vdb  10G  100M  9.9G  1%  /data

# Check permissions
ls -la /data

# Exit
exit
```

---

## Step 7: Upload Template Files

Since the volume is local to the Fly instance, you have a few options:

### Option 1: Upload via SFTP/SCP (Recommended)

```bash
# Get the instance IP
fly ips list

# Upload files via fly proxy
fly proxy 10022:22

# In another terminal:
scp -P 10022 template.html root@localhost:/data/templates/
```

### Option 2: Upload via SSH

```bash
# SSH into instance
fly ssh console

# Create directories
mkdir -p /data/templates
mkdir -p /data/sites

# Use fly sftp (requires fly sftp shell)
fly ssh sftp shell

# Upload files
put local-template.html /data/templates/template.html

# Exit
exit
```

### Option 3: Bootstrap on First Run

Store templates in your repository and copy on startup:

Create `bootstrap.sh`:

```bash
#!/bin/bash
# Copy templates from app to volume on first run
if [ ! -f /data/.initialized ]; then
  echo "Initializing volume..."
  mkdir -p /data/templates
  mkdir -p /data/sites
  
  # Copy templates from app directory
  cp -r ./templates/* /data/templates/
  
  touch /data/.initialized
  echo "Volume initialized!"
fi
```

Update `Dockerfile`:

```dockerfile
# ... existing Dockerfile ...

# Add templates to image
COPY templates/ ./templates/

# Add bootstrap script
COPY bootstrap.sh ./
RUN chmod +x bootstrap.sh

# Run bootstrap before starting app
CMD ["sh", "-c", "./bootstrap.sh && npm start"]
```

---

## Step 8: Test

### Check Logs

```bash
fly logs

# Should see:
# ✅ Storage backend: fly-volumes
# [Fly Volumes] Writing to /data/templates/...
```

### Trigger Job

```bash
# Get your app URL
fly status

# Trigger job
curl -X POST https://your-app.fly.dev/trigger

# Check logs
fly logs
```

### Verify Files

```bash
# SSH into instance
fly ssh console

# List files
ls -lh /data/templates/
ls -lh /data/sites/

# Check file contents
cat /data/sites/latest.html

# Exit
exit
```

---

## Volume Management

### List Volumes

```bash
fly volumes list

# Shows all volumes in your account
```

### Show Volume Details

```bash
fly volumes show vol_abc123

# Shows size, region, attached VM, creation date
```

### Extend Volume Size

```bash
# Extend to 20GB
fly volumes extend vol_abc123 --size 20

# No downtime - extends in place!
```

### Clone/Snapshot Volume

```bash
# Create snapshot
fly volumes snapshot vol_abc123

# List snapshots
fly volumes snapshots list

# Restore from snapshot
fly volumes create nextmeeting_data_restore \
  --snapshot-id snap_xyz789
```

### Delete Volume

```bash
# ⚠️ DANGER: Deletes all data!
fly volumes delete vol_abc123

# Confirm deletion
```

---

## Backup Strategy

### Option 1: Manual Backup

```bash
# SSH and tar the data
fly ssh console

cd /data
tar -czf backup-$(date +%Y%m%d).tar.gz templates/ sites/

# Copy to local machine
fly ssh sftp get /data/backup-20240115.tar.gz ./backup.tar.gz
```

### Option 2: Automated Backup Script

Create `backup.sh` in your app:

```bash
#!/bin/bash
# backup.sh - Run daily via cron

BACKUP_DIR="/data/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
tar -czf $BACKUP_FILE \
  /data/templates \
  /data/sites

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "Backup complete: $BACKUP_FILE"
```

Add to your cron or run periodically.

### Option 3: Sync to External Storage

Copy important files to S3/R2 periodically:

```javascript
// In your app
const { uploadFile } = require('./storage/adapters/s3Adapter');

async function backupToS3() {
  const fs = require('fs');
  const files = fs.readdirSync('/data/sites');
  
  for (const file of files) {
    const content = fs.readFileSync(`/data/sites/${file}`);
    await uploadFile({
      bucket: 'backup-bucket',
      key: `backups/${file}`,
      body: content
    });
  }
}
```

---

## Directory Structure

Recommended organization on the volume:

```
/data/
├── templates/           # HTML templates
│   ├── UUID1.template.html
│   ├── UUID2.template.html
│   └── UUID3.template.html
├── sites/              # Generated sites
│   ├── UUID1.html
│   ├── UUID1.json
│   ├── UUID2.html
│   └── UUID2.json
├── backups/            # Automated backups
│   ├── backup_20240115.tar.gz
│   └── backup_20240114.tar.gz
└── logs/               # Optional: application logs
    └── app.log
```

---

## Performance Optimization

### 1. Use Local Cache

Since it's local disk, leverage filesystem caching:

```javascript
const fs = require('fs').promises;
const cache = new Map();

async function getCachedFile(path) {
  if (cache.has(path)) {
    return cache.get(path);
  }
  
  const content = await fs.readFile(path, 'utf-8');
  cache.set(path, content);
  return content;
}
```

### 2. Parallel Writes

Local disk is fast - use parallel operations:

```javascript
await Promise.all([
  writeFile('/data/sites/file1.html', html1),
  writeFile('/data/sites/file2.html', html2),
  writeFile('/data/sites/file3.html', html3)
]);
```

### 3. Compression

Compress files to save space:

```javascript
const zlib = require('zlib');
const { promisify } = require('util');
const gzip = promisify(zlib.gzip);

const compressed = await gzip(Buffer.from(html));
await fs.writeFile('/data/sites/file.html.gz', compressed);
```

---

## Monitoring

### Check Disk Usage

```bash
# SSH into instance
fly ssh console

# Check volume usage
df -h /data

# Check directory sizes
du -sh /data/*

# Find large files
find /data -type f -size +10M -exec ls -lh {} \;
```

### Set Up Alerts

Create a monitoring script:

```javascript
// monitor-disk.js
const { exec } = require('child_process');

async function checkDiskUsage() {
  exec('df -h /data | tail -1', (error, stdout) => {
    const usage = stdout.split(/\s+/)[4]; // e.g., "45%"
    const percent = parseInt(usage);
    
    if (percent > 80) {
      console.error(`⚠️ Disk usage high: ${percent}%`);
      // Send alert via Slack/email
    }
  });
}

// Run every hour
setInterval(checkDiskUsage, 3600000);
```

---

## Troubleshooting

### Volume Not Mounting

**Symptoms:**
- App starts but no `/data` directory
- "No such file or directory" errors

**Check:**
1. Volume name in `fly.toml` matches actual volume
2. Volume is in same region as app
3. Volume isn't already attached to another instance

**Fix:**
```bash
# Verify volume exists
fly volumes list

# Check fly.toml configuration
cat fly.toml | grep -A 3 mounts

# Redeploy
fly deploy
```

### Permission Denied

**Symptoms:**
- "EACCES: permission denied" errors
- Can't write to `/data`

**Fix:**
```bash
# SSH into instance
fly ssh console

# Check ownership
ls -la /data

# Fix permissions (if needed)
chown -R root:root /data
chmod -R 755 /data
```

### Out of Space

**Symptoms:**
- "ENOSPC: no space left on device"
- Disk full errors

**Fix:**
```bash
# Check usage
fly ssh console
df -h /data

# Clean old files
find /data -mtime +30 -delete

# Or extend volume
fly volumes extend vol_abc123 --size 20
```

### Volume Corruption

**Rare but possible after crashes:**

```bash
# Create new volume
fly volumes create nextmeeting_data_new --size 10

# Update fly.toml
# Change source to: nextmeeting_data_new

# Restore from backup
fly ssh console
# ... restore backup.tar.gz to /data

# Delete old volume
fly volumes delete vol_abc123_old
```

---

## Scaling Considerations

### Multiple Instances

⚠️ **Important:** Fly volumes can only be attached to ONE instance at a time!

**For multi-instance setup:**
1. Use shared storage (S3/R2) instead
2. OR create volume per instance
3. OR use a single writer instance

**Example: Single writer, multiple readers:**

```toml
# fly.toml

# Writer instance (has volume)
[processes]
  writer = "npm run writer"

# Reader instances (no volume)
  reader = "npm run reader"

[[mounts]]
  processes = ["writer"]  # Only writer gets volume
  source = "nextmeeting_data"
  destination = "/data"
```

---

## Cost Optimization

### Right-Size Your Volume

```bash
# Check actual usage
fly ssh console
du -sh /data

# If using 5GB with 10GB volume, shrink:
# 1. Create smaller volume
fly volumes create nextmeeting_data_small --size 6

# 2. Copy data over
# 3. Update fly.toml
# 4. Deploy
# 5. Delete old volume
```

### Use Compression

Save 50-70% space on text files:

```javascript
const zlib = require('zlib');

// Compress before writing
const compressed = zlib.gzipSync(html);
fs.writeFileSync('/data/sites/file.html.gz', compressed);

// Read and decompress
const compressed = fs.readFileSync('/data/sites/file.html.gz');
const html = zlib.gunzipSync(compressed).toString();
```

---

## Migration

### From S3/R2 to Fly Volumes

```bash
# 1. Create volume (see Step 3)

# 2. Download from S3
aws s3 sync s3://your-bucket ./temp-data/

# 3. SSH into Fly instance
fly ssh console

# 4. Upload to volume (from another terminal)
fly ssh sftp shell
put -r ./temp-data/* /data/

# 5. Update secrets
fly secrets set STORAGE_BACKEND=fly-volumes
fly deploy
```

### From Fly Volumes to S3/R2

```bash
# 1. SSH into instance
fly ssh console

# 2. Install AWS CLI (or use existing tools)
# 3. Sync to S3
aws s3 sync /data/ s3://your-bucket/

# 4. Update secrets
fly secrets set STORAGE_BACKEND=aws-s3
# ... set AWS credentials
fly deploy
```

---

## Quick Reference

### Required Environment Variables
```bash
STORAGE_BACKEND=fly-volumes
FLY_VOLUME_PATH=/data
FLY_APP_URL=https://your-app.fly.dev  # Optional
```

### fly.toml Mount Configuration
```toml
[[mounts]]
  source = "nextmeeting_data"
  destination = "/data"
```

### Useful Commands
```bash
fly volumes list              # List volumes
fly volumes extend vol_xxx    # Extend size
fly ssh console               # Access instance
df -h /data                   # Check disk usage
```

---

## Next Steps

- Set up automated backups
- Monitor disk usage
- Consider compression for text files
- Plan for volume expansion if needed

---

## Support

- Fly.io Volumes Docs: https://fly.io/docs/reference/volumes/
- Fly.io Community: https://community.fly.io/
- Fly CLI Reference: https://fly.io/docs/flyctl/
