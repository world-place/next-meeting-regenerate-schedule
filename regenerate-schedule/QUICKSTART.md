# Quick Start Guide

## Local Development

### 1. Install Dependencies

```bash
cd regenerate-schedule
npm install
```

### 2. Set Up Environment Variables

Copy the example env file:

```bash
cp .env.example ../.env
```

Edit `../.env` (in project root) with your actual credentials.

### 3. Run the Server

```bash
npm start
```

The server will start on http://localhost:8080

### 4. Test the Endpoints

**Health Check:**
```bash
curl http://localhost:8080/health
```

**Manual Trigger:**
```bash
curl -X POST http://localhost:8080/trigger
```

**View Status:**
```bash
curl http://localhost:8080/
```

## Fly.io Deployment

See [FLY_DEPLOYMENT.md](./FLY_DEPLOYMENT.md) for detailed deployment instructions.

**Quick Deploy:**

```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Launch app (don't deploy yet)
fly launch --no-deploy

# 4. Set secrets
fly secrets set GOOGLE_API_CLIENT_EMAIL="..."
fly secrets set GOOGLE_API_PRIVATE_KEY="..."
fly secrets set AWS_ACCESS_KEY_ID="..."
fly secrets set AWS_SECRET_ACCESS_KEY="..."
fly secrets set CLOUDFRONT_DISTRIBUTION_ID="..."
fly secrets set AWS_S3_BUCKET="..."
fly secrets set AWS_S3_REGION="us-east-1"
fly secrets set SLACK_WEBHOOK_URL="..."
fly secrets set STATIC_SITE_S3_BUCKET="..."
fly secrets set S3_BUCKET_NAME="..."
fly secrets set HONEYBADGER_API_KEY="..."
fly secrets set HONEYBADGER_CHECK_IN_TOKEN="..."

# 5. Deploy
fly deploy
```

## How It Works

1. **Express Server**: Runs continuously on Fly.io
2. **Cron Scheduler**: Executes the job on a schedule (default: every hour)
3. **Job Execution**: 
   - Fetches meeting data from Google Sheets
   - Generates JSON schedules
   - Updates S3-hosted static HTML sites
   - Invalidates CloudFront CDN
   - Sends notifications to Slack and Honeybadger

## Architecture Differences

### AWS Lambda (Old)
- Event-driven, triggered by EventBridge
- Stateless, cold starts
- Managed by AWS

### Fly.io Cron Server (New)
- Always running HTTP server
- Node-cron scheduler built-in
- More flexible (can trigger manually)
- Easier local development
- Better logging

## Monitoring

- **Logs**: `fly logs` (or in dev: console output)
- **Health**: `GET /health` endpoint
- **Manual Run**: `POST /trigger` endpoint
- **Slack**: Notifications on success/failure
- **Honeybadger**: Error tracking and check-ins

## Configuration

### Cron Schedule

Edit the `CRON_SCHEDULE` environment variable:

```bash
# Every hour (default)
CRON_SCHEDULE="0 * * * *"

# Every 30 minutes
CRON_SCHEDULE="*/30 * * * *"

# Daily at 3 AM UTC
CRON_SCHEDULE="0 3 * * *"
```

### Run on Startup

Set `RUN_ON_STARTUP=true` to execute the job immediately when the server starts.

## Troubleshooting

**Job not running?**
- Check logs: `fly logs`
- Verify cron schedule: Check `CRON_SCHEDULE` env var
- Check health: `curl https://your-app.fly.dev/health`

**Authentication errors?**
- Verify all secrets are set: `fly secrets list`
- Check Google API credentials
- Verify AWS credentials have proper permissions

**Out of memory?**
- Increase memory in `fly.toml`:
  ```toml
  [[vm]]
    memory_mb = 1024
  ```
- Redeploy: `fly deploy`

## Support

- Check logs first: `fly logs`
- Review FLY_DEPLOYMENT.md for detailed setup
- Fly.io community: https://community.fly.io
