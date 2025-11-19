# Honeybadger Error Tracking Setup Guide

Quick guide to set up Honeybadger for error tracking and uptime monitoring.

## Overview

**What is Honeybadger?**
Error tracking and uptime monitoring service for Node.js applications.

**What you'll get:**
- Automatic error reporting
- Stack traces
- Uptime check-ins
- Email/Slack alerts

**Time required:** ~5 minutes

**Cost:** 
- Free tier: 100 errors/month
- Solo plan: $39/month (7 day free trial)

---

## Step 1: Create Honeybadger Account

1. **Sign Up**
   - Go to: https://www.honeybadger.io/
   - Click **"Start Free Trial"**
   - Enter your email and create password
   - Click **"Create Account"**

2. **Create Project**
   - Click **"New Project"**
   - **Project name:** `NextMeeting Schedule Generator`
   - **Platform:** Select **"Node.js"**
   - Click **"Create Project"**

---

## Step 2: Get API Keys

### Main API Key (for error reporting)

1. **Find API Key**
   - You'll see it on the setup page
   - Or: Settings → API Keys
   - Format: `hbp_abc123...`

2. **Copy API Key**
   - Click **"Copy"** or select and copy
   - **Save securely**

### Check-In Token (for uptime monitoring)

1. **Go to Check-Ins**
   - In project, click **"Uptime"** tab
   - Click **"New Check-In"**

2. **Create Check-In**
   - **Name:** `Schedule Generation`
   - **Schedule:** Select **"Hourly"** (or match your cron)
   - **Grace period:** `15 minutes`
   - Click **"Create Check-In"**

3. **Copy Token**
   - You'll see: `Check-in URL: https://api.honeybadger.io/v1/check_in/TOKEN`
   - Copy the **TOKEN** part only (last segment)
   - Format: `abc123`

---

## Step 3: Configure Environment Variables

```bash
# Add to .env
HONEYBADGER_API_KEY=hbp_abc123...
HONEYBADGER_CHECK_IN_TOKEN=abc123

# For Fly.io
fly secrets set HONEYBADGER_API_KEY="hbp_abc123..."
fly secrets set HONEYBADGER_CHECK_IN_TOKEN="abc123"
```

---

## Step 4: Test

### Test Error Reporting

```bash
# Start server
npm start

# Check logs for:
# ✅ Honeybadger error tracking enabled

# Trigger an error manually (in code):
```

```javascript
// Temporary test code
Honeybadger.notify(new Error("Test error from NextMeeting"));
```

### Test Check-In

```bash
# Run the job
curl -X POST http://localhost:8080/trigger

# Check Honeybadger dashboard
# Uptime tab should show check-in received
```

### Verify in Dashboard

1. **Go to Honeybadger Dashboard**
2. **Errors tab:** Should see test error
3. **Uptime tab:** Should see check-in received

---

## Features

### Automatic Error Tracking

All uncaught errors are automatically reported:

```javascript
// This error will be reported automatically
throw new Error("Something went wrong!");

// Async errors too
async function process() {
  throw new Error("Async error");
}
```

### Manual Error Reporting

Report errors with context:

```javascript
const Honeybadger = require('@honeybadger-io/js');

try {
  await riskyOperation();
} catch (error) {
  await Honeybadger.notifyAsync(error, {
    context: {
      userId: user.id,
      operation: 'processSchedule',
      configName: config.name
    },
    fingerprint: 'schedule-processing-error'
  });
}
```

### Uptime Monitoring

Automatic check-ins on successful runs:

```javascript
// Already implemented in server.js
await sendHoneybadgerCheckIn();

// This pings: https://api.honeybadger.io/v1/check_in/TOKEN
```

**If check-in missed:**
- Grace period (15 min) expires
- Honeybadger sends alert
- You know job failed

---

## Configuration Options

### Error Filters

Ignore specific errors:

```javascript
// In server.js
Honeybadger.configure({
  apiKey: process.env.HONEYBADGER_API_KEY,
  environment: process.env.NODE_ENV || 'development',
  
  // Ignore specific errors
  filters: ['password', 'credit_card'],
  
  // Ignore error classes
  ignore_errors: [
    'ValidationError',
    'NotFoundError'
  ]
});
```

### User Context

Add user context to errors:

```javascript
Honeybadger.setContext({
  user_id: 123,
  user_email: 'admin@example.com',
  environment: 'production'
});
```

### Custom Breadcrumbs

Track events leading to error:

```javascript
Honeybadger.addBreadcrumb('Starting schedule generation');
// ... do work
Honeybadger.addBreadcrumb('Downloaded from Google Sheets');
// ... more work
Honeybadger.addBreadcrumb('Uploading to S3');
// Error occurs - breadcrumbs are included!
```

---

## Notifications

### Email Alerts

1. **Go to Settings → Notifications**
2. **Email:**
   - Check **"Send email notifications"**
   - Enter email addresses
   - Select notification triggers:
     - New errors
     - Re-opened errors
     - Uptime check-ins missed

### Slack Integration

1. **Go to Settings → Integrations**
2. **Find Slack**
3. **Click "Add to Slack"**
4. **Authorize**
5. **Choose channel:** `#nextmeeting-errors`
6. **Configure:**
   - ✅ New errors
   - ✅ Uptime alerts
   - ⬜ Comments

### Webhooks

Send to custom endpoint:

1. **Settings → Integrations → Webhooks**
2. **Add webhook URL:** `https://your-api.com/webhook`
3. **Select events**
4. **Save**

---

## Troubleshooting

### Errors Not Appearing

**Check:**
1. API key is correct
2. `HONEYBADGER_API_KEY` is set
3. Error actually occurred
4. Not in test mode: `process.env.IS_TEST_MODE` should be undefined

**Test:**
```javascript
// Force an error
Honeybadger.notify(new Error("Test error"));

// Check response
console.log("Error reported to Honeybadger");
```

### Check-Ins Not Working

**Check:**
1. Check-in token is correct
2. `HONEYBADGER_CHECK_IN_TOKEN` is set
3. Job actually completed successfully

**Test manually:**
```bash
curl https://api.honeybadger.io/v1/check_in/YOUR_TOKEN

# Should return: {"ok":true}
```

### Too Many Errors

**Solution 1: Rate limiting**
```javascript
Honeybadger.configure({
  maxErrors: 10,  // Max errors per minute
  maxBreadcrumbs: 20
});
```

**Solution 2: Error grouping**
```javascript
// Group similar errors together
Honeybadger.notify(error, {
  fingerprint: `${error.name}-${config.name}`
});
```

---

## Dashboard Features

### Error Details

Each error shows:
- Stack trace
- Context/metadata
- Breadcrumbs
- Affected users
- First/last occurrence
- Frequency graph

### Trends

View trends:
- Errors over time
- Most common errors
- Error rate
- Resolution time

### Team Features

- Assign errors to team members
- Add comments
- Mark as resolved
- Re-open if reoccurs

---

## Best Practices

### 1. Add Context

```javascript
try {
  await processConfig(config);
} catch (error) {
  await Honeybadger.notifyAsync(error, {
    context: {
      config: config.name,
      googleSheetId: config.googleSheetId,
      timestamp: new Date().toISOString()
    }
  });
}
```

### 2. Use Fingerprints

Group related errors:

```javascript
// All S3 upload errors grouped together
Honeybadger.notify(error, {
  fingerprint: 's3-upload-error'
});
```

### 3. Set Environments

```javascript
Honeybadger.configure({
  environment: process.env.NODE_ENV || 'development'
});

// Only report errors in production
if (process.env.NODE_ENV === 'production') {
  Honeybadger.notify(error);
}
```

### 4. Monitor Check-Ins

- Set appropriate grace period
- Match schedule to your cron
- Test missed check-in alerts

---

## Cost Optimization

### Free Tier (100 errors/month)

**Tips:**
- Group similar errors (fingerprints)
- Filter out common errors
- Use rate limiting
- Fix errors promptly

### Upgrade When

- Errors > 100/month
- Need longer retention (> 30 days)
- Want more team members
- Need custom integrations

### Pricing

| Plan | Errors | Price |
|------|--------|-------|
| **Free** | 100/mo | $0 |
| **Solo** | 500/mo | $39/mo |
| **Startup** | 5,000/mo | $99/mo |
| **Business** | 25,000/mo | $199/mo |

---

## Alternatives

### Sentry

```bash
npm install @sentry/node

# Configure
const Sentry = require("@sentry/node");
Sentry.init({ dsn: "https://..." });

# Report
Sentry.captureException(error);
```

### Rollbar

```bash
npm install rollbar

# Configure
const Rollbar = require('rollbar');
const rollbar = new Rollbar({ accessToken: '...' });

# Report
rollbar.error(error);
```

### BugSnag

```bash
npm install @bugsnag/js @bugsnag/plugin-node

# Configure and report
```

---

## Advanced Features

### Source Maps

Upload source maps for better stack traces:

```bash
# Install plugin
npm install @honeybadger-io/webpack

# webpack.config.js
const HoneybadgerSourceMapPlugin = require('@honeybadger-io/webpack');

plugins: [
  new HoneybadgerSourceMapPlugin({
    apiKey: 'hbp_...',
    assetsUrl: 'https://yourapp.com/assets'
  })
]
```

### Deploy Tracking

Track deploys to see which introduced errors:

```bash
# In your deploy script
curl https://api.honeybadger.io/v1/deploys \
  -H "X-API-Key: $HONEYBADGER_API_KEY" \
  -F environment=production \
  -F revision=$(git rev-parse HEAD) \
  -F repository=$(git remote get-url origin)
```

### Performance Monitoring

Track slow operations:

```javascript
const timer = Honeybadger.startTimer();
await slowOperation();
Honeybadger.metric('slow_operation', {
  duration: timer.stop(),
  context: { operation: 'generateSchedule' }
});
```

---

## Quick Reference

### Environment Variables
```bash
HONEYBADGER_API_KEY=hbp_...
HONEYBADGER_CHECK_IN_TOKEN=abc123
```

### Manual Error Report
```javascript
Honeybadger.notify(error, { context: {...} });
```

### Check-In URL
```
https://api.honeybadger.io/v1/check_in/TOKEN
```

### URLs
- Dashboard: https://app.honeybadger.io/
- Docs: https://docs.honeybadger.io/
- Node.js Guide: https://docs.honeybadger.io/lib/node/

---

## Support

- Documentation: https://docs.honeybadger.io/
- Support: support@honeybadger.io
- Community: https://community.honeybadger.io/
