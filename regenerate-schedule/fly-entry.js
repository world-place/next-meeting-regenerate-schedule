const DEFAULT_INTERVAL_MINUTES = Number(process.env.RUN_INTERVAL_MINUTES ?? 60);
const intervalMinutes = Number.isFinite(DEFAULT_INTERVAL_MINUTES) ? DEFAULT_INTERVAL_MINUTES : 60;
const intervalMs = Math.max(intervalMinutes, 0) * 60 * 1000;

if (!process.env.AWS_LAMBDA_LOG_GROUP_NAME) {
  process.env.AWS_LAMBDA_LOG_GROUP_NAME = 'fly';
}

if (!process.env.AWS_LAMBDA_LOG_STREAM_NAME) {
  process.env.AWS_LAMBDA_LOG_STREAM_NAME = 'fly-machine';
}

const { handler } = require('./app.js');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runOnce() {
  const start = new Date();
  console.log(`[${start.toISOString()}] Starting schedule regeneration run...`);
  try {
    await handler();
    const end = new Date();
    console.log(`[${end.toISOString()}] Run completed successfully (duration ${(end - start) / 1000}s).`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Run failed:`, error);
  }
}

async function main() {
  do {
    await runOnce();
    if (intervalMs <= 0) {
      console.log('RUN_INTERVAL_MINUTES <= 0, exiting after single run.');
      return;
    }
    console.log(`Sleeping for ${intervalMinutes} minute(s) before next run...`);
    await sleep(intervalMs);
  } while (true);
}

main().catch(error => {
  console.error('Fly worker crashed:', error);
  process.exit(1);
});
