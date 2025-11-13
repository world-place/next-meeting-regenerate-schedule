# Slack Notifications Setup Guide

Quick guide to set up Slack notifications for NextMeeting schedule generation.

## Overview

**What you'll get:**
- Success/failure notifications in Slack
- Links to logs
- Real-time alerts

**Time required:** ~5 minutes

**Cost:** FREE

---

## Step 1: Create Slack Workspace (if needed)

If you don't have a Slack workspace:

1. Go to https://slack.com/create
2. Enter your email
3. Check email and click **"Create a Workspace"**
4. Follow setup wizard

---

## Step 2: Create Slack Channel

1. **Open Slack**
2. **Create channel:**
   - Click **"+"** next to "Channels"
   - **Name:** `nextmeeting-alerts` (or your preference)
   - **Description:** "Automated notifications from NextMeeting cron job"
   - Click **"Create"**

---

## Step 3: Create Incoming Webhook

1. **Go to Slack API**
   - Navigate to: https://api.slack.com/apps

2. **Create App**
   - Click **"Create New App"**
   - Select **"From scratch"**
   - **App name:** `NextMeeting Notifications`
   - **Workspace:** Select your workspace
   - Click **"Create App"**

3. **Enable Incoming Webhooks**
   - In left sidebar, click **"Incoming Webhooks"**
   - Toggle **"Activate Incoming Webhooks"** to **ON**

4. **Add Webhook to Workspace**
   - Scroll down and click **"Add New Webhook to Workspace"**
   - **Select channel:** `#nextmeeting-alerts`
   - Click **"Allow"**

5. **Copy Webhook URL**
   - You'll see: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`
   - Click **"Copy"**
   - **Save this URL securely!**

---

## Step 4: Configure Environment Variable

```bash
# Add to .env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX

# For Fly.io
fly secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"
```

---

## Step 5: Test

### Test Locally

```bash
# Start server
npm start

# Check logs for:
# ✅ Slack notifications enabled

# Trigger job
curl -X POST http://localhost:8080/trigger

# Check Slack channel for message:
# ✅ NextMeeting schedules regenerated
```

### Test Webhook Directly

```bash
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message from NextMeeting!"}'
```

---

## Message Types

Your app will send two types of messages:

### Success Message
```
✅ NextMeeting schedules regenerated (<dev>)
```

### Error Message
```
❗️ Error! Error message here (<dev>)
```

---

## Customization

### Custom Messages

Edit `global.js` to customize messages:

```javascript
// global.js
async function sendSlackNotification(text) {
  // ... existing code ...
  
  // Custom format
  const message = {
    text: text,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*NextMeeting Update*\n${text}`
        }
      }
    ]
  };
  
  await fetch(SLACK_WEBHOOK_URL, {
    method: 'post',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(message)
  });
}
```

### Rich Messages

Use Slack's Block Kit:

```javascript
const message = {
  blocks: [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "✅ Schedule Updated"
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Status:*\nSuccess`
        },
        {
          type: "mrkdwn",
          text: `*Duration:*\n${duration}s`
        }
      ]
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "View Logs"
          },
          url: logUrl
        }
      ]
    }
  ]
};
```

Test your blocks: https://app.slack.com/block-kit-builder/

### Add Icons

```javascript
const message = {
  text: "Schedule updated",
  username: "NextMeeting Bot",
  icon_emoji: ":calendar:",  // Or ":white_check_mark:"
  // OR
  icon_url: "https://yourdomain.com/icon.png"
};
```

---

## Multiple Channels

Send to different channels for different events:

```bash
# Success notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/.../success

# Error notifications  
SLACK_ERROR_WEBHOOK_URL=https://hooks.slack.com/services/.../errors
```

```javascript
// In code
async function sendSlackNotification(text, isError = false) {
  const webhookUrl = isError 
    ? process.env.SLACK_ERROR_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL
    : process.env.SLACK_WEBHOOK_URL;
    
  // ... send message
}
```

---

## Troubleshooting

### "Invalid Token" Error

**Cause:** Webhook URL is incorrect

**Fix:**
1. Verify URL is complete: `https://hooks.slack.com/services/T.../B.../XXX...`
2. No spaces or line breaks
3. Regenerate webhook if needed

### Messages Not Appearing

**Check:**
1. Webhook is for correct channel
2. Channel exists
3. App isn't removed from workspace

**Fix:**
```bash
# Test webhook directly
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test"}'

# Check response
# 200 OK = success
# 404 = invalid webhook
```

### Rate Limiting

**Slack limits:**
- 1 message per second per webhook

**Fix:** Add throttling:
```javascript
const lastSent = {};

async function sendSlackNotification(text) {
  const now = Date.now();
  if (lastSent.slack && now - lastSent.slack < 1000) {
    await sleep(1000);
  }
  
  // ... send message
  lastSent.slack = now;
}
```

---

## Alternatives

### Slack App with OAuth

For more features (channels, DMs, reactions):

1. Create Slack App
2. Add OAuth scopes: `chat:write`, `channels:read`
3. Install to workspace
4. Use Bot Token instead of webhook

```javascript
const { WebClient } = require('@slack/web-api');
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

await slack.chat.postMessage({
  channel: '#nextmeeting-alerts',
  text: 'Schedule updated!'
});
```

### Microsoft Teams

Similar webhook setup:

```bash
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...
```

### Discord

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## Security

### Protect Webhook URL

- ✅ Never commit to git
- ✅ Use environment variables
- ✅ Rotate if exposed
- ✅ Limit to specific channel

### Rotate Webhook

1. Go to Slack API → Your App
2. Click **"Incoming Webhooks"**
3. Find your webhook
4. Click **"Revoke"** (old one)
5. Click **"Add New Webhook to Workspace"**
6. Update environment variable

---

## Monitoring

### Track Notification Failures

```javascript
// In global.js
async function sendSlackNotification(text) {
  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'post',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({text})
    });
    
    if (!response.ok) {
      console.error(`[Slack] Failed: ${response.status}`);
      // Log to monitoring service
    }
  } catch (error) {
    console.error('[Slack] Error:', error);
    // Don't throw - Slack failures shouldn't break job
  }
}
```

---

## Advanced Features

### Thread Replies

Reply to previous message:

```javascript
// Save thread_ts from previous message
const response = await fetch(SLACK_WEBHOOK_URL, {
  method: 'post',
  body: JSON.stringify({
    text: "Job started",
    // Store response.ts for later
  })
});

// Later, reply in thread
await fetch(SLACK_WEBHOOK_URL, {
  method: 'post',
  body: JSON.stringify({
    text: "Job completed",
    thread_ts: savedThreadTs  // Creates thread
  })
});
```

### Mentions

Mention users or groups:

```javascript
const message = {
  text: "<!channel> Schedule update failed! <@U12345678> please check"
};

// Mention types:
// <!channel> - @channel
// <!here> - @here
// <@U12345678> - @specific user
// <!subteam^S12345678> - @usergroup
```

### Scheduled Messages

```javascript
const message = {
  text: "Daily summary",
  // Post at specific time
  post_at: Math.floor(Date.now() / 1000) + 3600  // 1 hour from now
};
```

---

## Best Practices

1. **Use consistent formatting**
   ```
   ✅ Success messages start with ✅
   ❗️ Error messages start with ❗
   ⏰ Scheduled tasks start with ⏰
   ```

2. **Include useful context**
   ```
   ✅ Updated 5 schedules in 23.4s
   ❗️ Failed to upload to S3: AccessDenied
   ```

3. **Link to logs**
   ```
   View logs: https://fly.io/apps/your-app/monitoring
   ```

4. **Don't spam**
   - Batch updates when possible
   - Use threads for related messages
   - Consider digest summaries

---

## Quick Reference

### Environment Variable
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../XXX...
```

### Test Command
```bash
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test from NextMeeting"}'
```

### URLs
- Create webhooks: https://api.slack.com/apps
- Block Kit Builder: https://app.slack.com/block-kit-builder/
- API Docs: https://api.slack.com/messaging/webhooks

---

## Support

- Slack API Documentation: https://api.slack.com/
- Community: https://community.slack.com/
- Block Kit: https://api.slack.com/block-kit
