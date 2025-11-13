
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

require("isomorphic-fetch");
const AWS = require('aws-sdk');

function log(str) {
  if(!process.env.IS_TEST_MODE) console.log(str);
}

function error(str) {
  if(!process.env.IS_TEST_MODE) console.error(str);
}

function validateEnvVars(envVars) {
  envVars.forEach(envVar => {
    if(!process.env[envVar]) throw `Missing required env var "${envVar}"`;
  })
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

async function asyncParallelForEach(array, callback) {
  
  const promises = array.map((item, index, array) => {
    return callback(array[index], index, array);
  })

  return Promise.all(promises);
}

async function asyncMap(array, callback) {
  const results = [];
  for (let index = 0; index < array.length; index++) {
    results.push(await callback(array[index], index, array));
  }
  return results;
}

async function sendSlackNotification(text) {
  if(process.env.IS_TEST_MODE) return;
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
  if(!SLACK_WEBHOOK_URL) {
    console.log('[Slack] Skipped (no webhook URL configured)');
    return;
  }
  
  try {
    const logDeeplink = getCloudWatchLogDeeplink();
    const slackLink = logDeeplink ? ` <${logDeeplink}| Logs ›>` : `(\`<dev>\`)`;
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'post',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({"text": text + slackLink})
    });
    
    if (!response.ok) {
      console.error(`[Slack] Failed to send notification: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('[Slack] Error sending notification:', error.message);
    // Don't throw - Slack failures shouldn't break the main job
  }
}

async function sendErrorNotification({text, args = "", id = ""}) {
  if(process.env.SUPPRESS_ERROR_NOTIFICATIONS && parseBoolean(process.env.SUPPRESS_ERROR_NOTIFICATIONS)) return;
  const ERROR_WEBHOOK_URL = process.env.ERROR_WEBHOOK_URL;
  if(!ERROR_WEBHOOK_URL) return;  

  const populatedMessage = text.
    replace("%s", args).
    replace("%id", id).
    replace('%log', `<${getCloudWatchLogDeeplink()}| Logs ›>`);

  await fetch(ERROR_WEBHOOK_URL, {
    method: 'post',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({"text": populatedMessage})
  }) 
}

// Cloudwatch deeplink

const cloudwatchRoot = 'https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/'

function cloudWatchURLEncode(str) {
  return str.
    replace(/\$/g, '$2524').
    replace(/\//g, '$252F').
    replace(/\[/g, '$255B').
    replace(/\]/g, '$255D')
}

function getCloudWatchLogDeeplink() {
  if(!process.env.AWS_LAMBDA_LOG_GROUP_NAME || !process.env.AWS_LAMBDA_LOG_STREAM_NAME) return "";
  let encodedUrl = cloudwatchRoot + cloudWatchURLEncode(process.env.AWS_LAMBDA_LOG_GROUP_NAME) + '/log-events/' + cloudWatchURLEncode(process.env.AWS_LAMBDA_LOG_STREAM_NAME);
  return encodedUrl;
}


async function sleep(ms) {
  return await new Promise(resolve => setTimeout(resolve, ms));
}

function parseBoolean(str) {
  if(str === undefined || str === null) throw `Must be called with String or Boolean but got \`${str}\``
  if (typeof str === "boolean") return str;
  const normalized = normalizeToken(str);
  if (normalized == 'true') return true;
  if (normalized == 'false') return false;
  throw `parseBoolean failed. Unable to convert string "${str}" to Boolean.`;
}

const normalizeToken = str => str.trim().toLowerCase();

const pipe = (...fns) => x => fns.reduce((y, f) => f(y), x);

const resolveFilePath = filepath => path.resolve(process.cwd(), filepath)

const readFile = pipe(
  resolveFilePath,
  fs.readFileSync,
  buffer => buffer.toString()
)



function loadEnvVars(envFilePath) {
  const envVars = readFile(envFilePath).
    split("\n").
    map(line => line.split("="));

  envVars.forEach(([key, value])=>{
    process.env[key] = value;
  });
}

const map = (i, fn) => Array.from({length: i}).map((_, index) => fn(index));


async function uploadJsonFile({bucket, folderName = "", fileName, fileContents}) {
  return new Promise(function(resolve, reject) {
      s3.upload({
          Bucket: bucket,
          Key: `${folderName}/${fileName}`,
          Body: zlib.gzipSync(JSON.stringify(fileContents))
      }).
      promise().
      then(resolve, reject);
  });
}

async function sendHoneybadgerCheckIn() {
  const HONEYBADGER_CHECK_IN_TOKEN = process.env.HONEYBADGER_CHECK_IN_TOKEN;
  if(!HONEYBADGER_CHECK_IN_TOKEN) {
    console.log('[Honeybadger] Check-in skipped (no token configured)');
    return;
  }
  
  try {
    const url = `https://api.honeybadger.io/v1/check_in/${HONEYBADGER_CHECK_IN_TOKEN}`;
    const response = await fetch(url, { method: 'get' });
    
    if (!response.ok) {
      console.error(`[Honeybadger] Check-in failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('[Honeybadger] Error during check-in:', error.message);
    // Don't throw - Honeybadger failures shouldn't break the main job
  }
}

exports.log = log;
exports.error = error;
exports.validateEnvVars = validateEnvVars;
exports.asyncMap = asyncMap;

exports.asyncForEach = asyncForEach;
exports.asyncParallelForEach = asyncParallelForEach;

exports.sendSlackNotification = sendSlackNotification;

exports.sendErrorNotification = sendErrorNotification;

exports.getCloudWatchLogDeeplink = getCloudWatchLogDeeplink;

exports.sleep = sleep;

exports.parseBoolean = parseBoolean;

exports.loadEnvVars = loadEnvVars;
exports.readFile = readFile;
exports.resolveFilePath = resolveFilePath;
exports.pipe = pipe;
exports.map = map;
exports.uploadJsonFile = uploadJsonFile;
exports.sendHoneybadgerCheckIn = sendHoneybadgerCheckIn;