/**
 * Fly.io Volumes Storage Adapter
 * 
 * Uses mounted volumes for persistent storage
 * Files are stored on the local filesystem in the volume
 */

const fs = require('fs').promises;
const path = require('path');

const VOLUME_PATH = process.env.FLY_VOLUME_PATH || '/data';

async function uploadFile({ bucket, key, body, contentType }) {
  console.log(`[Fly Volumes] Writing to ${VOLUME_PATH}/${bucket}/${key}`);
  
  const fullPath = path.join(VOLUME_PATH, bucket, key);
  const dir = path.dirname(fullPath);
  
  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });
  
  // Write file
  const content = Buffer.isBuffer(body) ? body : Buffer.from(body);
  await fs.writeFile(fullPath, content);
  
  // Store content type in metadata file
  if (contentType) {
    await fs.writeFile(`${fullPath}.meta`, JSON.stringify({ contentType }));
  }
  
  return { Location: fullPath };
}

async function downloadFile({ bucket, key }) {
  console.log(`[Fly Volumes] Reading from ${VOLUME_PATH}/${bucket}/${key}`);
  
  const fullPath = path.join(VOLUME_PATH, bucket, key);
  const content = await fs.readFile(fullPath, 'utf-8');
  return content;
}

async function fileExists({ bucket, key }) {
  const fullPath = path.join(VOLUME_PATH, bucket, key);
  
  try {
    await fs.access(fullPath);
    return true;
  } catch (error) {
    return false;
  }
}

function getPublicUrl({ bucket, key }) {
  // Fly volumes are not publicly accessible
  // You'd need to serve them via the web server
  const baseUrl = process.env.FLY_APP_URL;
  if (baseUrl) {
    return `${baseUrl}/files/${bucket}/${key}`;
  }
  return null;
}

module.exports = {
  uploadFile,
  downloadFile,
  fileExists,
  getPublicUrl
};
