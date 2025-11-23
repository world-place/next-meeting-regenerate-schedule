/*
 * Cron Job Server for NextMeeting Schedule Generation
 * 
 * This server runs as a standalone Node.js application with a cron scheduler.
 * Designed for deployment on Fly.io or any Node.js hosting platform.
 */

const express = require('express');
const cron = require('node-cron');
require("isomorphic-fetch");

const Honeybadger = require('@honeybadger-io/js');
const { 
  validateEnvVars, 
  asyncForEach, 
  sendSlackNotification, 
  sendHoneybadgerCheckIn 
} = require("./global.js");

const { rebuildAndDeploySite } = require('./rebuildAndDeploySite.js');
const { invalidateCdn } = require("./invalidateCdn.js");

// Initialize Honeybadger (optional)
const HONEYBADGER_ENABLED = !!process.env.HONEYBADGER_API_KEY;
if (HONEYBADGER_ENABLED) {
  console.log('✅ Honeybadger error tracking enabled');
  Honeybadger.configure({
    apiKey: process.env.HONEYBADGER_API_KEY
  });
} else {
  console.log('⚠️  Honeybadger disabled (no API key provided)');
}

// Check optional services
const SLACK_ENABLED = !!process.env.SLACK_WEBHOOK_URL;
const CLOUDFRONT_ENABLED = !!process.env.CLOUDFRONT_DISTRIBUTION_ID;

if (SLACK_ENABLED) {
  console.log('✅ Slack notifications enabled');
} else {
  console.log('⚠️  Slack notifications disabled (no webhook URL provided)');
}

if (CLOUDFRONT_ENABLED) {
  console.log('✅ CloudFront CDN invalidation enabled');
} else {
  console.log('⚠️  CloudFront CDN invalidation disabled (no distribution ID provided)');
}

// Validate REQUIRED environment variables only
validateEnvVars([
  "GOOGLE_API_CLIENT_EMAIL",
  "GOOGLE_API_PRIVATE_KEY"
]);

// Validate storage backend is configured
const STORAGE_BACKEND = process.env.STORAGE_BACKEND || 'aws-s3';
console.log(`📦 Storage backend: ${STORAGE_BACKEND}`);

if (STORAGE_BACKEND === 'aws-s3') {
  validateEnvVars([
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_S3_BUCKET",
    "AWS_S3_REGION",
    "STATIC_SITE_S3_BUCKET"
  ]);
} else if (STORAGE_BACKEND === 'cloudflare-r2') {
  validateEnvVars([
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME"
  ]);
} else if (STORAGE_BACKEND === 'fly-volumes') {
  validateEnvVars(["FLY_VOLUME_PATH"]);
} else if (STORAGE_BACKEND === 'local') {
  console.log('⚠️  Using local filesystem storage (not recommended for production)');
}

// Meeting configurations
const configs = [ 
  {
    name: "SA Virtual Meeting Finder (Alpha)",
    googleSheetId: '1VL60c6yxyiEGIjzIgI4LVDuedDBMt6mFKD1gmMkIwNs',
    siteUUID: 'B4E7C2F1-8A3D-4F5E-9B1C-6D2A4E8F3B7C'
  },
];

// The main job function (extracted from the Lambda handler)
async function runScheduleRegenerationJob() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Starting schedule regeneration job at ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    const errors = [];
    
    // Process each config
    await asyncForEach(configs, async (config) => {
      try {
        await rebuildAndDeploySite(config);
      } catch(error) {
        console.error(`❗ Caught error in deploy for ${config.name}!`);
        console.error(error);
        errors.push(error);
        if (HONEYBADGER_ENABLED) {
          await Honeybadger.notifyAsync(error).catch(e => 
            console.error('Failed to notify Honeybadger:', e)
          );
        }
      }
    });

    // Invalidate CloudFront CDN (if enabled)
    if (CLOUDFRONT_ENABLED) {
      try {
        await invalidateCdn({
          files: ["/*"],
          awsCredentials: {}
        });
      } catch (error) {
        console.error('⚠️  CloudFront invalidation failed:', error);
        // Don't fail the entire job for CDN issues
      }
    } else {
      console.log('⏭️  Skipping CloudFront invalidation (not configured)');
    }

    console.log(`✅ Schedule regeneration completed successfully!`);
    
    if (SLACK_ENABLED) {
      await sendSlackNotification("✅ NextMeeting schedules regenerated").catch(e =>
        console.error('Failed to send Slack notification:', e)
      );
    }
    
    if (HONEYBADGER_ENABLED && process.env.HONEYBADGER_CHECK_IN_TOKEN) {
      await sendHoneybadgerCheckIn().catch(e =>
        console.error('Failed to send Honeybadger check-in:', e)
      );
    }
    
    if (errors.length > 0) {
      console.log(`⚠️  Completed with ${errors.length} error(s)`);
      return { success: false, errors: errors.length };
    }
    
    return { success: true };
  } catch (err) {
    console.error(`❗️ Fatal error! ${err} ${JSON.stringify(err)}`);
    
    if (HONEYBADGER_ENABLED) {
      await Honeybadger.notifyAsync(err).catch(e =>
        console.error('Failed to notify Honeybadger:', e)
      );
    }
    
    if (SLACK_ENABLED) {
      await sendSlackNotification(`❗️ Error! ${err} ${JSON.stringify(err)}`).catch(e =>
        console.error('Failed to send Slack notification:', e)
      );
    }
    
    throw err;
  }
}

// Create Express server
const app = express();
const PORT = process.env.PORT || 8080;

// Health check endpoint (required by Fly.io)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Manual trigger endpoint (for testing/debugging)
app.post('/trigger', async (req, res) => {
  console.log('📬 Manual trigger received');
  
  // Don't wait for the job to complete - respond immediately
  res.status(202).json({ 
    message: 'Job triggered',
    timestamp: new Date().toISOString()
  });
  
  // Run the job asynchronously
  try {
    await runScheduleRegenerationJob();
  } catch (error) {
    console.error('Job failed:', error);
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'NextMeeting Schedule Regeneration',
    status: 'running',
    endpoints: {
      health: '/health',
      trigger: 'POST /trigger'
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Manual trigger: POST http://localhost:${PORT}/trigger`);
});

// Set up cron job
// Default: Run every hour at minute 0
// Can be overridden with CRON_SCHEDULE environment variable
// Format: "minute hour day month weekday"
// Examples:
//   - "0 * * * *" = every hour at minute 0
//   - "*/30 * * * *" = every 30 minutes
//   - "0 0 * * *" = daily at midnight
const cronSchedule = process.env.CRON_SCHEDULE || '0 * * * *';

console.log(`⏰ Setting up cron job with schedule: ${cronSchedule}`);

cron.schedule(cronSchedule, async () => {
  try {
    await runScheduleRegenerationJob();
  } catch (error) {
    console.error('❌ Cron job failed:', error);
  }
}, {
  timezone: "UTC"
});

console.log('✅ Cron job scheduled');

// Run once on startup if RUN_ON_STARTUP is set
if (process.env.RUN_ON_STARTUP === 'true') {
  console.log('🚀 Running job on startup...');
  runScheduleRegenerationJob().catch(error => {
    console.error('Startup job failed:', error);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully...');
  process.exit(0);
});
