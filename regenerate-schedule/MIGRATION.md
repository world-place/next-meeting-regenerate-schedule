# Migration from AWS Lambda to Fly.io Cron Job

## Summary

This project has been successfully migrated from an AWS Lambda function triggered by EventBridge to a self-contained Node.js cron job server suitable for deployment on Fly.io or any Node.js hosting platform.

## What Changed

### New Files

1. **`server.js`** - Main Express server with cron scheduler
   - Health check endpoint at `/health`
   - Manual trigger endpoint at `POST /trigger`
   - Service info endpoint at `/`
   - Built-in cron scheduler using node-cron

2. **`Dockerfile`** - Container configuration for Fly.io
   - Based on Node.js 18 Alpine
   - Includes health checks
   - Optimized for production

3. **`.dockerignore`** - Excludes unnecessary files from Docker image

4. **`fly.toml`** - Fly.io configuration
   - HTTP service setup
   - Health checks
   - Resource allocation
   - Environment variables

5. **Documentation**
   - `FLY_DEPLOYMENT.md` - Complete deployment guide
   - `QUICKSTART.md` - Quick start for developers
   - `MIGRATION.md` - This file
   - `.env.example` - Environment variable template

### Modified Files

1. **`package.json`**
   - Added `express` - HTTP server framework
   - Added `node-cron` - Cron job scheduler
   - Moved `aws-sdk` to dependencies (was in devDependencies)
   - Added `start` script pointing to `server.js`
   - Updated version to 2.0.0

2. **`README.md`**
   - Updated with Fly.io deployment instructions
   - Added endpoint documentation
   - Marked Lambda deployment as deprecated

### Unchanged Files

All the business logic remains unchanged:
- `app.js` - Original Lambda handler (kept for reference)
- `generateSchedule.js` - Schedule generation logic
- `formatMeeting.js` - Meeting formatting
- `rebuildAndDeploySite.js` - Site rebuild logic
- `updateStaticSite.js` - S3 upload logic
- `invalidateCdn.js` - CloudFront invalidation
- `global.js` - Utility functions

## Architecture Comparison

### AWS Lambda (Before)

```
EventBridge (hourly) → Lambda → Execute job
                                    ↓
                      ┌─────────────┴─────────────┐
                      ↓                           ↓
                Google Sheets              AWS Services
                      ↓                    (S3, CloudFront)
                Generate JSON                    ↓
                                          Upload & Invalidate
```

**Pros:**
- Fully managed by AWS
- Pay per execution
- No server maintenance

**Cons:**
- Cold starts
- 15-minute timeout limit
- Complex local development
- Vendor lock-in
- More expensive for frequent runs

### Fly.io Cron Server (After)

```
Node.js Server (Always Running)
        ↓
   node-cron (scheduler)
        ↓
   Execute job (hourly)
        ↓
┌───────┴────────┐
↓                ↓
Google Sheets    AWS Services
↓                (S3, CloudFront)
Generate JSON    ↓
            Upload & Invalidate
```

**Pros:**
- No cold starts
- Simpler deployment
- Easy local development
- Manual trigger capability
- More flexible (can add webhooks, APIs, etc.)
- Better logging
- Platform agnostic

**Cons:**
- Runs continuously (small fixed cost ~$2-3/month)
- Need to manage the server (minimal with Fly.io)

## Key Benefits

1. **Better Developer Experience**
   - Run locally with `npm start`
   - Same code in dev and production
   - No Lambda emulation needed
   - Easy debugging

2. **More Flexible**
   - Can trigger jobs manually via HTTP
   - Easy to add new endpoints
   - Can integrate webhooks
   - Can add a dashboard if needed

3. **Better Monitoring**
   - Real-time logs with `fly logs`
   - Health check endpoint
   - Easy to SSH into container
   - Better observability

4. **Platform Agnostic**
   - Can deploy to Fly.io, Railway, Render, Heroku, etc.
   - Can run on any Docker platform
   - Can run on a VPS
   - Not locked into AWS

5. **Cost Effective**
   - Fixed ~$2-3/month vs variable Lambda costs
   - No charges for invocations
   - No API Gateway needed
   - Predictable billing

## Migration Checklist

- [x] Create Express server wrapper
- [x] Add cron scheduler
- [x] Update package.json
- [x] Create Dockerfile
- [x] Create Fly.io configuration
- [x] Write deployment documentation
- [x] Create .env.example
- [x] Update README
- [ ] Deploy to Fly.io
- [ ] Set up all environment variables
- [ ] Test in production
- [ ] Monitor first few runs
- [ ] Decommission Lambda (after confirming everything works)

## Environment Variables

All environment variables from Lambda are still required. Set them using:

```bash
fly secrets set VARIABLE_NAME="value"
```

**New optional variables:**
- `PORT` - Server port (default: 8080)
- `CRON_SCHEDULE` - Cron schedule (default: "0 * * * *")
- `RUN_ON_STARTUP` - Run job on startup (default: false)

## Deployment Steps

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Authenticate**
   ```bash
   fly auth login
   ```

3. **Launch App**
   ```bash
   cd regenerate-schedule
   fly launch --no-deploy
   ```

4. **Set Secrets**
   ```bash
   fly secrets set GOOGLE_API_CLIENT_EMAIL="..."
   # ... set all other secrets
   ```

5. **Deploy**
   ```bash
   fly deploy
   ```

6. **Monitor**
   ```bash
   fly logs
   ```

## Testing

### Local Testing

```bash
cd regenerate-schedule
npm install
# Copy and edit .env file
npm start
```

Then test:
```bash
# Health check
curl http://localhost:8080/health

# Manual trigger
curl -X POST http://localhost:8080/trigger
```

### Production Testing

```bash
# Health check
curl https://your-app.fly.dev/health

# Manual trigger (test the job)
curl -X POST https://your-app.fly.dev/trigger

# View logs
fly logs
```

## Rollback Plan

If anything goes wrong:

1. **Keep Lambda running** until Fly.io deployment is confirmed working
2. **Monitor both** for 24-48 hours
3. **Compare results** to ensure parity
4. **Disable Lambda** only after confidence is high

To rollback Fly.io deployment:
```bash
fly releases
fly releases rollback <version>
```

## Performance Considerations

- **Memory**: Start with 512MB, increase if needed
- **CPU**: 1 shared CPU is sufficient for this workload
- **Region**: Deploy to `iad` (Virginia) for best AWS connectivity
- **Scaling**: Keep at 1 instance (cron jobs don't need horizontal scaling)

## Security

- All secrets stored in Fly.io secrets (encrypted)
- No secrets in code or fly.toml
- HTTPS enforced by default
- Health check doesn't expose sensitive data

## Future Enhancements

Now that we have a full HTTP server, we could add:

1. **Dashboard** - Web UI to view job history
2. **Webhooks** - Trigger jobs via GitHub webhooks
3. **API** - Expose meeting data via REST API
4. **Metrics** - Prometheus endpoint for monitoring
5. **Admin Panel** - Manage configurations without code changes

## Support

- **Documentation**: See FLY_DEPLOYMENT.md and QUICKSTART.md
- **Fly.io Docs**: https://fly.io/docs/
- **Community**: https://community.fly.io
- **Issues**: Create issues in the repository

## Conclusion

The migration from AWS Lambda to a Fly.io cron job server provides:
- Better developer experience
- More flexibility
- Platform independence
- Simpler deployment
- Better monitoring

While Lambda is great for sporadic, event-driven workloads, a cron job server is more appropriate for scheduled tasks that run frequently.
