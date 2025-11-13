# Fly.io Deployment Guide

This guide will help you deploy the NextMeeting Schedule Regeneration service to Fly.io as a cron job.

## Prerequisites

1. **Fly.io Account**: Sign up at https://fly.io
2. **Fly CLI**: Install the Fly CLI tool
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```
3. **Authentication**: Log in to Fly.io
   ```bash
   fly auth login
   ```

## Initial Setup

### 1. Update fly.toml

Edit `fly.toml` and change the app name to something unique:

```toml
app = "your-unique-app-name"
```

### 2. Set Environment Variables

You'll need to set these secrets in Fly.io (these are NOT stored in fly.toml for security):

```bash
fly secrets set GOOGLE_API_CLIENT_EMAIL="your-email@project.iam.gserviceaccount.com"
fly secrets set GOOGLE_API_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
fly secrets set AWS_ACCESS_KEY_ID="your-aws-key"
fly secrets set AWS_SECRET_ACCESS_KEY="your-aws-secret"
fly secrets set CLOUDFRONT_DISTRIBUTION_ID="your-distribution-id"
fly secrets set AWS_S3_BUCKET="your-s3-bucket"
fly secrets set AWS_S3_REGION="us-east-1"
fly secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
fly secrets set STATIC_SITE_S3_BUCKET="your-static-site-bucket"
fly secrets set S3_BUCKET_NAME="your-s3-bucket"
fly secrets set HONEYBADGER_API_KEY="your-honeybadger-key"
fly secrets set HONEYBADGER_CHECK_IN_TOKEN="your-checkin-token"
```

**Note**: For `GOOGLE_API_PRIVATE_KEY`, you may need to escape newlines:
```bash
fly secrets set GOOGLE_API_PRIVATE_KEY="$(cat google-key.json | jq -r '.private_key')"
```

## Deployment

### First Deployment

```bash
cd regenerate-schedule
fly launch --no-deploy

# Follow the prompts:
# - Choose your app name
# - Select region (iad = Virginia, recommended for AWS us-east-1)
# - Don't create a database
# - Don't deploy yet

# Set all your secrets (see above)
# Then deploy:
fly deploy
```

### Subsequent Deployments

```bash
fly deploy
```

## Configuration Options

### Cron Schedule

By default, the job runs every hour. You can change this by setting the `CRON_SCHEDULE` environment variable:

```bash
# Every 30 minutes
fly secrets set CRON_SCHEDULE="*/30 * * * *"

# Every day at midnight UTC
fly secrets set CRON_SCHEDULE="0 0 * * *"

# Every 6 hours
fly secrets set CRON_SCHEDULE="0 */6 * * *"
```

Format: `minute hour day month weekday`

### Run on Startup

To run the job immediately when the server starts:

```bash
fly secrets set RUN_ON_STARTUP="true"
```

## Monitoring

### View Logs

```bash
fly logs
```

### Check Status

```bash
fly status
```

### Health Check

```bash
curl https://your-app-name.fly.dev/health
```

### Manual Trigger

You can manually trigger a job run:

```bash
curl -X POST https://your-app-name.fly.dev/trigger
```

## Scaling

### Adjust Resources

Edit `fly.toml` to change CPU and memory:

```toml
[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 1024  # Increase if needed
```

Then redeploy:

```bash
fly deploy
```

### Multiple Regions

You can deploy to multiple regions for redundancy:

```bash
fly regions add lax ord  # Add Los Angeles and Chicago
```

**Note**: Be careful with multiple regions for cron jobs - you may run the job multiple times!

## Troubleshooting

### Check Environment Variables

```bash
fly secrets list
```

### SSH into Container

```bash
fly ssh console
```

### Restart the App

```bash
fly apps restart
```

### Check Metrics

```bash
fly dashboard
```

Then click on your app to see metrics in the web UI.

## Cost Optimization

- **Auto-stop disabled**: The app stays running to execute cron jobs
- **Minimum resources**: Uses 1 shared CPU and 512MB RAM
- **Single region**: Deployed to one region only

Estimated cost: ~$2-3/month for a single instance running 24/7

## Migration from Lambda

Key differences from AWS Lambda:

1. **Always Running**: Unlike Lambda, this runs continuously
2. **Health Checks**: Fly.io monitors the `/health` endpoint
3. **Manual Triggers**: You can trigger jobs via HTTP POST
4. **Logs**: Use `fly logs` instead of CloudWatch
5. **Secrets**: Use `fly secrets` instead of Lambda environment variables

## Backup Strategy

Consider setting up monitoring alerts:

1. **Honeybadger**: Already integrated for error tracking
2. **Slack**: Already integrated for notifications
3. **Fly.io Metrics**: Set up alerts in the Fly.io dashboard

## Rollback

If a deployment fails, you can rollback:

```bash
fly releases
fly releases rollback <version>
```

## Additional Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Fly.io Pricing](https://fly.io/docs/about/pricing/)
- [Node-cron Documentation](https://www.npmjs.com/package/node-cron)
