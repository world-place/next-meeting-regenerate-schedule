/**
 * Cloudflare R2 Storage Adapter
 * 
 * R2 is S3-compatible, so we use the AWS SDK
 * but with Cloudflare endpoints
 */

const AWS = require('aws-sdk');

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

const r2 = new AWS.S3({
  endpoint: R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
  region: 'auto' // R2 doesn't use regions, but SDK requires this
});

async function uploadFile({ bucket, key, body, contentType }) {
  console.log(`[R2] Uploading to r2://${bucket}/${key}`);
  
  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType || 'application/octet-stream'
  };

  return r2.upload(params).promise();
}

async function downloadFile({ bucket, key }) {
  console.log(`[R2] Downloading from r2://${bucket}/${key}`);
  
  const params = {
    Bucket: bucket,
    Key: key
  };

  const response = await r2.getObject(params).promise();
  return response.Body.toString();
}

async function fileExists({ bucket, key }) {
  try {
    await r2.headObject({ Bucket: bucket, Key: key }).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
}

function getPublicUrl({ bucket, key }) {
  // R2 public URLs require custom domain setup
  const customDomain = process.env.R2_PUBLIC_DOMAIN;
  if (customDomain) {
    return `https://${customDomain}/${key}`;
  }
  
  // R2 doesn't have default public URLs like S3
  console.warn('[R2] No R2_PUBLIC_DOMAIN set, cannot generate public URL');
  return null;
}

module.exports = {
  uploadFile,
  downloadFile,
  fileExists,
  getPublicUrl
};
