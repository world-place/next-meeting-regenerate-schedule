# Local Filesystem Storage Setup Guide

Quick guide to set up local filesystem storage for development and testing.

## Overview

**Use case:** Development, testing, single-machine deployments

**Time required:** < 2 minutes

**Cost:** FREE (uses local disk)

⚠️ **Warning:** Not recommended for production use!

**Why Local Storage?**
- ⚡ **Instant setup** - No external services
- 🚀 **Fast** - Local disk speed
- 💰 **Free** - No cloud costs
- 🧪 **Perfect for development** - Test without credentials

**Why NOT for production?**
- ❌ No redundancy
- ❌ No backups
- ❌ Not publicly accessible
- ❌ Lost on container restart (unless mounted)

---

## Step 1: Configure Environment Variables

That's it! Just set these variables:

```bash
# .env file
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./local-storage     # Optional, defaults to ./local-storage
```

Or for specific path:

```bash
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=/Users/yourname/nextmeeting-data
```

---

## Step 2: Create Directory Structure

The storage adapter will create directories automatically, but you can pre-create them:

```bash
# Create storage directory
mkdir -p ./local-storage/templates
mkdir -p ./local-storage/sites

# Set permissions (if needed)
chmod -R 755 ./local-storage
```

---

## Step 3: Add Template Files

Just copy your templates to the local directory:

```bash
# Copy templates
cp B0E7F18B-4CF5-49FF-BBD3-75E1CA52AA5E.template.html \
   ./local-storage/templates/

# Verify
ls -l ./local-storage/templates/
```

---

## Step 4: Test

```bash
# Start server
npm start

# Check logs for:
# ✅ Storage backend: local
# [Local] Writing to ./local-storage/...

# Trigger a job
curl -X POST http://localhost:8080/trigger

# Check generated files
ls -l ./local-storage/sites/
```

---

## Directory Structure

```
local-storage/
├── templates/
│   ├── B0E7F18B-4CF5-49FF-BBD3-75E1CA52AA5E.template.html
│   ├── 275EE30A-220F-4FF2-A950-0ED2B5E4C257.template.html
│   └── ...
└── sites/
    ├── B0E7F18B-4CF5-49FF-BBD3-75E1CA52AA5E.html
    ├── B0E7F18B-4CF5-49FF-BBD3-75E1CA52AA5E.json
    ├── 275EE30A-220F-4FF2-A950-0ED2B5E4C257.html
    ├── 275EE30A-220F-4FF2-A950-0ED2B5E4C257.json
    └── ...
```

---

## Advanced Configuration

### Custom Path

Use any directory on your filesystem:

```bash
# Absolute path
LOCAL_STORAGE_PATH=/var/data/nextmeeting

# Relative path
LOCAL_STORAGE_PATH=../../shared-data

# User home directory
LOCAL_STORAGE_PATH=~/nextmeeting-storage
```

### Separate Buckets

Simulate multiple buckets:

```bash
LOCAL_STORAGE_PATH=/var/data

# Results in:
# /var/data/templates/
# /var/data/sites/
```

### Read-Only Mode

Useful for testing without writes:

```javascript
// In local adapter, make files read-only
async function uploadFile({ bucket, key, body }) {
  if (process.env.READ_ONLY_MODE === 'true') {
    console.log('[Local] Skipping write (read-only mode)');
    return;
  }
  // ... normal upload
}
```

---

## Git Ignore

Add to `.gitignore` to avoid committing generated files:

```gitignore
# Local storage
local-storage/
!local-storage/templates/

# OR keep templates in git
local-storage/sites/
```

---

## Using with Docker

### Mount Volume

```dockerfile
# docker-compose.yml
version: '3'
services:
  app:
    build: .
    volumes:
      - ./local-storage:/app/local-storage
    environment:
      - STORAGE_BACKEND=local
      - LOCAL_STORAGE_PATH=/app/local-storage
```

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Create storage directory
RUN mkdir -p /app/local-storage

# Copy app
COPY . .

# Install deps
RUN npm install

# Set permissions
RUN chown -R node:node /app/local-storage

USER node

CMD ["npm", "start"]
```

---

## Backup

### Manual Backup

```bash
# Tar backup
tar -czf backup-$(date +%Y%m%d).tar.gz local-storage/

# Copy to safe location
cp backup-*.tar.gz ~/backups/
```

### Automated Backup

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
tar -czf $BACKUP_DIR/nextmeeting-$DATE.tar.gz local-storage/

# Keep only last 7 days
find $BACKUP_DIR -name "nextmeeting-*.tar.gz" -mtime +7 -delete

echo "Backup complete: nextmeeting-$DATE.tar.gz"
```

Run with cron:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup.sh
```

---

## Serving Files (Optional)

### Option 1: Express Static Middleware

Add to `server.js`:

```javascript
// Serve generated sites
app.use('/files', express.static('./local-storage/sites'));

// Access at: http://localhost:8080/files/UUID.html
```

### Option 2: Nginx

```nginx
server {
  listen 80;
  server_name localhost;
  
  location /files/ {
    alias /path/to/local-storage/sites/;
    autoindex on;
  }
}
```

### Option 3: Python HTTP Server

```bash
# Quick file server
cd local-storage/sites
python3 -m http.server 8000

# Access at: http://localhost:8000/UUID.html
```

---

## Performance

### Fast Operations

Local storage is FAST for development:

```javascript
// Typical speeds on SSD:
// Read:  500-1000 MB/s
// Write: 300-500 MB/s

// Compare to:
// S3:    10-50 MB/s
// R2:    20-100 MB/s
```

### Caching

No need for caching - OS does it automatically:

```javascript
// OS-level caching means:
// - First read: ~5ms
// - Subsequent reads: ~0.1ms
```

---

## Troubleshooting

### Permission Denied

```bash
# Check permissions
ls -la local-storage/

# Fix permissions
chmod -R 755 local-storage/

# Or change owner
chown -R $USER local-storage/
```

### Directory Not Found

```bash
# Create manually
mkdir -p local-storage/templates
mkdir -p local-storage/sites

# Or let app create automatically
# (adapter creates directories on first write)
```

### Path Issues

```bash
# Use absolute path to avoid issues
LOCAL_STORAGE_PATH=/full/path/to/storage

# Or use ~ for home directory
LOCAL_STORAGE_PATH=~/nextmeeting-storage
```

---

## Migration

### To Production Storage (S3/R2)

```bash
# 1. Set up S3/R2 (see other guides)

# 2. Copy files to S3
aws s3 sync ./local-storage/templates s3://bucket/templates/
aws s3 sync ./local-storage/sites s3://bucket/sites/

# 3. Update environment
STORAGE_BACKEND=aws-s3
# ... add AWS credentials

# 4. Restart app
```

### From Production to Local

```bash
# Download from S3
aws s3 sync s3://bucket/templates ./local-storage/templates/
aws s3 sync s3://bucket/sites ./local-storage/sites/

# Update environment
STORAGE_BACKEND=local

# Restart app
```

---

## When to Use Local Storage

### ✅ Good Use Cases

- **Development** - Fast iteration, no cloud costs
- **Testing** - Unit tests, integration tests
- **Demos** - Quick demos without setup
- **CI/CD** - Test pipelines
- **Single-machine** - Self-hosted on VPS

### ❌ Not Recommended

- **Production** - No redundancy, no backups
- **Multi-instance** - Can't share across instances
- **High availability** - No failover
- **Public websites** - Not accessible from internet

---

## Comparison with Cloud Storage

| Feature | Local | S3 | R2 | Volumes |
|---------|-------|----|----|---------|
| **Setup Time** | < 1 min | 15 min | 10 min | 5 min |
| **Cost** | FREE | $$ | $ | $ |
| **Speed** | ⚡⚡⚡ | ⚡ | ⚡⚡ | ⚡⚡ |
| **Reliability** | ⚠️ Low | ✅ High | ✅ High | ✅ Medium |
| **Redundancy** | ❌ | ✅ | ✅ | ⚠️ |
| **Public URLs** | ❌ | ✅ | ✅ | ⚠️ |
| **Multi-instance** | ❌ | ✅ | ✅ | ❌ |

---

## Production Checklist

If you MUST use local storage in production:

- [ ] Set up automated backups (daily minimum)
- [ ] Use RAID for disk redundancy
- [ ] Monitor disk usage (set alerts)
- [ ] Have restore procedure documented
- [ ] Test backups regularly
- [ ] Mount on persistent volume (if containerized)
- [ ] Set up monitoring and alerting
- [ ] Document recovery procedures

**Better:** Use cloud storage (S3/R2) for production!

---

## Quick Reference

### Environment Variables
```bash
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./local-storage  # Optional
```

### Directory Structure
```
local-storage/
├── templates/    # Input templates
└── sites/        # Generated outputs
```

### Common Commands
```bash
# View files
ls -lR local-storage/

# Check disk usage
du -sh local-storage/

# Backup
tar -czf backup.tar.gz local-storage/

# Clean generated files
rm -rf local-storage/sites/*
```

---

## Support

For production storage options, see:
- [AWS S3 Setup](./aws-s3-setup.md)
- [Cloudflare R2 Setup](./cloudflare-r2-setup.md)
- [Fly Volumes Setup](./fly-volumes-setup.md)
