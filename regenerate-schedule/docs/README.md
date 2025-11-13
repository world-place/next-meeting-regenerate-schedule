# NextMeeting Schedule Generator - Documentation Index

Complete documentation for setup, configuration, and customization.

---

## 📚 Quick Links

### Getting Started
- [Quick Start Guide](../QUICKSTART.md) - Get running in 5 minutes
- [Fly.io Deployment](../FLY_DEPLOYMENT.md) - Complete deployment guide
- [Migration from Lambda](../MIGRATION.md) - AWS Lambda → Fly.io migration

### Storage Options
- [Storage Overview](../STORAGE_OPTIONS.md) - Compare all storage backends
- [AWS S3 Setup](./storage/aws-s3-setup.md) - Detailed S3 configuration
- [Cloudflare R2 Setup](./storage/cloudflare-r2-setup.md) - R2 with zero egress fees
- [Fly Volumes Setup](./storage/fly-volumes-setup.md) - Self-contained storage
- [Local Storage Setup](./storage/local-setup.md) - Development storage

### Optional Features
- [CloudFront CDN Setup](./optional/cloudfront-setup.md) - Global CDN caching
- [Slack Notifications Setup](./optional/slack-setup.md) - Team notifications
- [Honeybadger Error Tracking Setup](./optional/honeybadger-setup.md) - Error monitoring

### Data Sources
- [Data Sources Guide](./DATA_SOURCES.md) - Complete guide to meeting data sources
  - Google Sheets (default)
  - REST API
  - Database (PostgreSQL/MySQL)
  - JSON Files
  - Airtable
  - Custom adapters

---

## 🗂️ Documentation Structure

```
docs/
├── README.md (this file)
├── storage/
│   ├── aws-s3-setup.md           # AWS S3 step-by-step
│   ├── cloudflare-r2-setup.md    # Cloudflare R2 step-by-step
│   ├── fly-volumes-setup.md      # Fly Volumes step-by-step
│   └── local-setup.md            # Local filesystem
├── optional/
│   ├── cloudfront-setup.md       # CloudFront CDN
│   ├── slack-setup.md            # Slack notifications
│   └── honeybadger-setup.md      # Error tracking
└── DATA_SOURCES.md               # Meeting data sources

../
├── QUICKSTART.md                  # Quick start guide
├── FLY_DEPLOYMENT.md             # Fly.io deployment
├── STORAGE_OPTIONS.md            # Storage comparison
├── MIGRATION.md                  # Lambda migration
└── README.md                     # Main project readme
```

---

## 🎯 Common Tasks

### First Time Setup

1. **Choose Storage** → See [Storage Options](../STORAGE_OPTIONS.md)
2. **Set Up Storage** → Follow storage-specific guide
3. **Configure Credentials** → See [.env.example](../.env.example)
4. **Deploy** → Follow [Fly.io Deployment](../FLY_DEPLOYMENT.md)

### Adding Optional Features

- **Slack** → [Slack Setup](./optional/slack-setup.md) (~5 min)
- **Honeybadger** → [Honeybadger Setup](./optional/honeybadger-setup.md) (~5 min)
- **CloudFront** → [CloudFront Setup](./optional/cloudfront-setup.md) (~20 min)

### Changing Data Sources

1. Read [Data Sources Guide](./DATA_SOURCES.md)
2. Choose your source (Google Sheets, API, Database, etc.)
3. Implement adapter if needed
4. Update `MEETING_SOURCE` environment variable
5. Test and deploy

---

## 📖 Documentation by Use Case

### "I want to deploy to production"

1. [Fly.io Deployment Guide](../FLY_DEPLOYMENT.md)
2. Choose storage: [Cloudflare R2](./storage/cloudflare-r2-setup.md) (recommended)
3. Optional: [Slack Notifications](./optional/slack-setup.md)
4. Optional: [Honeybadger Monitoring](./optional/honeybadger-setup.md)

### "I want to test locally"

1. [Quick Start](../QUICKSTART.md)
2. [Local Storage Setup](./storage/local-setup.md)
3. Skip optional services (they're optional!)

### "I want to switch from AWS Lambda"

1. [Migration Guide](../MIGRATION.md)
2. [Fly.io Deployment](../FLY_DEPLOYMENT.md)
3. Keep same AWS S3 storage or migrate to R2

### "I want to use my own data source"

1. [Data Sources Guide](./DATA_SOURCES.md)
2. Implement custom adapter
3. Test with sample data
4. Deploy

### "I want to save money on storage"

1. [Storage Options Comparison](../STORAGE_OPTIONS.md)
2. Switch to [Cloudflare R2](./storage/cloudflare-r2-setup.md) (98% savings!)
3. Or use [Fly Volumes](./storage/fly-volumes-setup.md) (self-contained)

---

## 🛠️ Configuration Reference

### Environment Variables

**Required (minimum):**
```bash
GOOGLE_API_CLIENT_EMAIL=...
GOOGLE_API_PRIVATE_KEY=...
STORAGE_BACKEND=aws-s3|cloudflare-r2|fly-volumes|local
```

**Storage-specific:**
```bash
# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...

# Fly Volumes
FLY_VOLUME_PATH=/data

# Local
LOCAL_STORAGE_PATH=./local-storage
```

**Optional services:**
```bash
SLACK_WEBHOOK_URL=...
HONEYBADGER_API_KEY=...
CLOUDFRONT_DISTRIBUTION_ID=...
```

**Meeting sources:**
```bash
MEETING_SOURCE=google-sheets  # default
# See DATA_SOURCES.md for other options
```

See complete list in [.env.example](../.env.example)

---

## 🔍 Troubleshooting Guides

Each setup guide includes a **Troubleshooting** section:

- [S3 Troubleshooting](./storage/aws-s3-setup.md#troubleshooting)
- [R2 Troubleshooting](./storage/cloudflare-r2-setup.md#troubleshooting)
- [Fly Volumes Troubleshooting](./storage/fly-volumes-setup.md#troubleshooting)
- [CloudFront Troubleshooting](./optional/cloudfront-setup.md#troubleshooting)
- [Data Sources Troubleshooting](./DATA_SOURCES.md#troubleshooting)

### Common Issues

**"Can't connect to Google Sheets"**
→ Check `GOOGLE_API_CLIENT_EMAIL` and `GOOGLE_API_PRIVATE_KEY`

**"Storage upload failed"**
→ Verify storage credentials and bucket/volume exists

**"Slack notifications not working"**
→ Test webhook URL directly (see Slack setup guide)

**"Job runs but meetings don't update"**
→ Check storage backend is configured correctly

---

## 📊 Architecture Diagrams

### Overall Architecture

```
┌─────────────────┐
│  Cron Scheduler │
│  (node-cron)    │
└────────┬────────┘
         ↓
┌────────┴────────┐
│   Main Job      │
│  - Fetch data   │
│  - Generate     │
│  - Upload       │
│  - Notify       │
└────────┬────────┘
         ↓
    ┌────┴────┐
    ↓         ↓
[Storage] [Services]
```

### Storage Adapters

```
Application
     ↓
Storage Adapter
     ↓
┌────┴────┬─────────┬──────────┐
↓         ↓         ↓          ↓
S3        R2      Volumes    Local
```

### Data Source Adapters

```
Application
     ↓
Meeting Source Adapter
     ↓
┌────┴────┬─────────┬──────────┐
↓         ↓         ↓          ↓
Sheets   API     Database   File
```

---

## 🎓 Learning Path

### Beginner
1. Read [Quick Start](../QUICKSTART.md)
2. Follow [Local Setup](./storage/local-setup.md)
3. Run locally and test

### Intermediate
1. Choose storage: [Storage Options](../STORAGE_OPTIONS.md)
2. Deploy to Fly.io: [Deployment Guide](../FLY_DEPLOYMENT.md)
3. Add Slack: [Slack Setup](./optional/slack-setup.md)

### Advanced
1. Create custom data source: [Data Sources](./DATA_SOURCES.md)
2. Implement custom storage adapter
3. Set up monitoring and alerting
4. Optimize for your use case

---

## 📞 Support

- **Issues**: Create an issue in the repository
- **Questions**: Check existing documentation first
- **Feature Requests**: Open an issue with [Feature Request] prefix

---

## 🔄 Updates

This documentation is updated with each release. Check the main [README](../README.md) for changelog.

**Last Updated:** 2024-01-15  
**Version:** 2.0.0

---

## ✨ Quick Tips

💡 **Start with Cloudflare R2** - Best value for production  
💡 **Use local storage** - Perfect for development  
💡 **All services are optional** - Start minimal, add later  
💡 **Test locally first** - Save deployment time  
💡 **Read troubleshooting sections** - Most issues are covered  

---

Happy deploying! 🚀
