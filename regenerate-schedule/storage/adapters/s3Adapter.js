/**
 * AWS S3 Storage Adapter
 */

const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_S3_REGION || 'us-east-1'
});

async function uploadFile({ bucket, key, body, contentType }) {
  console.log(`[S3] Uploading to s3://${bucket}/${key}`);
  
  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType || 'application/octet-stream'
  };

  return s3.upload(params).promise();
}

async function downloadFile({ bucket, key }) {
  console.log(`[S3] Downloading from s3://${bucket}/${key}`);
  
  const params = {
    Bucket: bucket,
    Key: key
  };

  const response = await s3.getObject(params).promise();
  return response.Body.toString();
}

async function fileExists({ bucket, key }) {
  try {
    await s3.headObject({ Bucket: bucket, Key: key }).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
}

function getPublicUrl({ bucket, key }) {
  const region = process.env.AWS_S3_REGION || 'us-east-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

module.exports = {
  uploadFile,
  downloadFile,
  fileExists,
  getPublicUrl
};
