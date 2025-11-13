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

// Initialize Honeybadger
Honeybadger.configure({
  apiKey: process.env.HONEYBADGER_API_KEY
});

// Validate required environment variables
validateEnvVars([
  "GOOGLE_API_CLIENT_EMAIL",
  "GOOGLE_API_PRIVATE_KEY",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "CLOUDFRONT_DISTRIBUTION_ID",
  "AWS_S3_BUCKET",
  "AWS_S3_REGION",
  "SLACK_WEBHOOK_URL",
  "STATIC_SITE_S3_BUCKET"
]);

// Meeting configurations
const configs = [ 
  {
    name: "S-Anon",
    googleSheetId: '1UJneS5GKFQSIy_iAfkLE21nRC_E8VzJ8diTT4Z3JnrA',
    siteUUID: 'B0E7F18B-4CF5-49FF-BBD3-75E1CA52AA5E'
  },
  {
    name: 'SA',
    googleSheetId: '1_QxT6VIm1HTLKSl71DtDqSMWVZYrdbqSl0WSF0Ch6g4',
    siteUUID: '275EE30A-220F-4FF2-A950-0ED2B5E4C257'
  },
  {
    name: 'ACA',
    googleSheetId: '1EyR9SJSbEn0rIKtb10hYTQQCBHdJ42pBKFE6ezQeY8A',
    siteUUID: '0BF67B1D-444F-45F5-BA5B-E3ADD7E4C30B'
  },
  {
    name: 'DA',
    googleSheetId: '18gkS_5ghZGW0smYwV0OHYZL4yph-r02wIcVXujEF8HQ',
    siteUUID: 'A93E4DF2-F779-4F15-B25B-826D8A3B8009-DA'
  },
  {
    name: 'AAA',
    googleSheetId: '1RkJpxqJCHeQZjr0yYt6QMheujiynsCwY9M7G3BeV55E',
    siteUUID: '5205ac4c-ec58-4f11-8c90-2be7fcd4d6f5-AAA'
  }
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
        await Honeybadger.notifyAsync(error);
      }
    });

    // Invalidate CloudFront CDN
    await invalidateCdn({
      files: ["/*"],
      awsCredentials: {}
    });

    console.log(`✅ Schedule regeneration completed successfully!`);
    
    await sendSlackNotification("✅ NextMeeting schedules regenerated");
    await sendHoneybadgerCheckIn();
    
    if (errors.length > 0) {
      console.log(`⚠️  Completed with ${errors.length} error(s)`);
      return { success: false, errors: errors.length };
    }
    
    return { success: true };
  } catch (err) {
    console.error(`❗️ Fatal error! ${err} ${JSON.stringify(err)}`);
    await Honeybadger.notifyAsync(err);
    await sendSlackNotification(`❗️ Error! ${err} ${JSON.stringify(err)}`);
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
