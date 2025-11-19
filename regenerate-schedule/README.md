# NextMeeting Schedule Regeneration - Cron Job Server

A Node.js cron job server that generates meeting schedule JSON files from Google Sheets and deploys them to cloud storage.

## 🚀 Quick Links

- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 5 minutes
- **[FLY_DEPLOYMENT.md](./FLY_DEPLOYMENT.md)** - Deploy to Fly.io
- **[STORAGE_OPTIONS.md](./STORAGE_OPTIONS.md)** - Choose your storage backend
- **[MIGRATION.md](./MIGRATION.md)** - Migrated from AWS Lambda

## ✨ Features

### Pluggable Data Sources
Import meeting data from whatever system you already have:
- Google Sheets (default)
- REST/JSON APIs, databases, Airtable, or static JSON files
- **New:** Jotform API integration for SA's Virtual Meeting Finder

See [docs/DATA_SOURCES.md](./docs/DATA_SOURCES.md) for adapter configuration.

### Flexible Storage Backends
Choose the storage that fits your needs:
- **AWS S3** - Reliable, proven, AWS ecosystem
- **Cloudflare R2** - Zero egress fees, 40% cheaper than S3
- **Fly.io Volumes** - Self-contained, private, simple
- **Local Filesystem** - Development and testing

See [STORAGE_OPTIONS.md](./STORAGE_OPTIONS.md) for detailed comparison.

### Optional Services
All monitoring and notification services are **optional**:
- ✅ **Honeybadger** - Error tracking (optional)
- ✅ **Slack** - Notifications (optional)
- ✅ **CloudFront** - CDN invalidation (optional)

The app gracefully skips services that aren't configured.

### Easy Development
Minimal configuration required:
```bash
# Only Google Sheets API + storage backend required
GOOGLE_API_CLIENT_EMAIL=...
GOOGLE_API_PRIVATE_KEY=...
STORAGE_BACKEND=local  # For development
```

## 📋 Requirements

**Required:**
- Node.js 14+
- Google Sheets API credentials

**Optional:**
- AWS S3 or Cloudflare R2 or Fly.io Volumes (for production)
- Slack webhook (for notifications)
- Honeybadger API key (for error tracking)
- CloudFront distribution (for AWS CDN)

## 🏃 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example ../.env
# Edit ../.env with your credentials

# Start server
npm start

# Test endpoints
curl http://localhost:8080/health
curl -X POST http://localhost:8080/trigger
```

### Deploy to Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
fly launch --no-deploy

# Set secrets
fly secrets set GOOGLE_API_CLIENT_EMAIL="..."
fly secrets set GOOGLE_API_PRIVATE_KEY="..."
fly secrets set STORAGE_BACKEND="cloudflare-r2"
# ... (see FLY_DEPLOYMENT.md)

# Deploy
fly deploy

# Monitor
fly logs
```

## 🏗️ Architecture

```
┌─────────────────┐
│  Cron Scheduler │  (node-cron)
│  Every hour     │
└────────┬────────┘
         ↓
┌────────┴────────┐
│   Express App   │  HTTP Server
│  - /health      │  Health checks
│  - /trigger     │  Manual runs
└────────┬────────┘
         ↓
┌────────┴────────┐
│  Job Executor   │
│  1. Fetch from  │
│     Sheets      │
│  2. Generate    │
│     JSON        │
│  3. Upload to   │
│     Storage     │
│  4. Notify      │
└────────┬────────┘
         ↓
    ┌────┴────┐
    ↓         ↓
[Storage] [Services]
AWS S3    Slack
R2        Honeybadger
Volumes   CloudFront
Local
```

## 📂 Project Structure

```
regenerate-schedule/
├── server.js                   # Main cron server
├── app.js                      # Original Lambda handler (legacy)
├── generateSchedule.js         # Schedule generation logic
├── formatMeeting.js            # Meeting data formatting
├── rebuildAndDeploySite.js     # Site rebuild orchestration
├── updateStaticSite.js         # Storage upload (uses adapter)
├── invalidateCdn.js            # CDN invalidation (optional)
├── global.js                   # Utility functions
├── storage/
│   ├── storageAdapter.js       # Storage abstraction
│   └── adapters/
│       ├── s3Adapter.js        # AWS S3 implementation
│       ├── r2Adapter.js        # Cloudflare R2 implementation
│       ├── flyVolumesAdapter.js # Fly Volumes implementation
│       └── localAdapter.js     # Local filesystem implementation
├── Dockerfile                  # Container configuration
├── fly.toml                    # Fly.io configuration
├── package.json                # Dependencies
├── .env.example                # Environment template
├── QUICKSTART.md              # Quick start guide
├── FLY_DEPLOYMENT.md          # Deployment guide
├── STORAGE_OPTIONS.md         # Storage backend guide
└── MIGRATION.md               # Lambda migration details
```

## 🔧 Configuration

### Storage Backend

Set `STORAGE_BACKEND` to choose where files are stored:

```bash
STORAGE_BACKEND=aws-s3          # AWS S3
STORAGE_BACKEND=cloudflare-r2   # Cloudflare R2 (recommended)
STORAGE_BACKEND=fly-volumes     # Fly.io Volumes
STORAGE_BACKEND=local           # Local filesystem (dev only)
```

See [STORAGE_OPTIONS.md](./STORAGE_OPTIONS.md) for detailed setup.

### Cron Schedule

Default: Every hour (`0 * * * *`)

Change with:
```bash
CRON_SCHEDULE="*/30 * * * *"  # Every 30 minutes
CRON_SCHEDULE="0 3 * * *"     # Daily at 3 AM UTC
```

### Optional Services

```bash
# All optional - gracefully skipped if not set
SLACK_WEBHOOK_URL=...
HONEYBADGER_API_KEY=...
CLOUDFRONT_DISTRIBUTION_ID=...
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:8080/health
# Expected: {"status":"ok","timestamp":"...","uptime":123}
```

### Manual Trigger
```bash
curl -X POST http://localhost:8080/trigger
# Expected: 202 Accepted, job runs in background
```

### View Logs
```bash
# Local
npm start  # Watch console

# Fly.io
fly logs
```

## 💰 Cost Comparison

For 10GB storage + 100GB egress/month:

| Backend | Monthly Cost |
|---------|--------------|
| Cloudflare R2 | **$0.15** ⭐ |
| Fly Volumes | $1.50 |
| AWS S3 | $9.23 |
| Local | $0 (dev only) |

**Winner:** Cloudflare R2 saves 95%+ due to zero egress fees!

## 🐛 Troubleshooting

### Job not running?
```bash
# Check logs
fly logs

# Verify cron schedule
fly ssh console
echo $CRON_SCHEDULE

# Trigger manually
curl -X POST https://your-app.fly.dev/trigger
```

### Storage errors?
```bash
# Verify backend
fly ssh console
echo $STORAGE_BACKEND

# Check credentials are set
fly secrets list
```

### Service disabled warnings?
This is normal! Optional services (Slack, Honeybadger, CloudFront) show warnings when not configured. The job still runs successfully.

## 📚 Additional Documentation

- **[IMPROVEMENTS_SUMMARY.md](../IMPROVEMENTS_SUMMARY.md)** - Latest improvements
- **[CONVERSION_SUMMARY.md](../CONVERSION_SUMMARY.md)** - Lambda → Fly.io conversion
- **Project README:** [../README.md](../README.md)

## 🆘 Support

- **Fly.io Docs:** https://fly.io/docs/
- **Cloudflare R2 Docs:** https://developers.cloudflare.com/r2/
- **AWS S3 Docs:** https://docs.aws.amazon.com/s3/

## 📜 License

MIT

---

**Previously:** AWS Lambda function (deprecated)  
**Now:** Flexible, cost-effective Node.js cron server ✨
