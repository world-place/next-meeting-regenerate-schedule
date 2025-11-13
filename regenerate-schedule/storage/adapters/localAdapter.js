/**
 * Local Filesystem Storage Adapter
 * 
 * For development and testing only
 * Not recommended for production use
 */

const fs = require('fs').promises;
const path = require('path');

const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || './local-storage';

async function uploadFile({ bucket, key, body, contentType }) {
  console.log(`[Local] Writing to ${LOCAL_STORAGE_PATH}/${bucket}/${key}`);
  
  const fullPath = path.join(LOCAL_STORAGE_PATH, bucket, key);
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
  console.log(`[Local] Reading from ${LOCAL_STORAGE_PATH}/${bucket}/${key}`);
  
  const fullPath = path.join(LOCAL_STORAGE_PATH, bucket, key);
  const content = await fs.readFile(fullPath, 'utf-8');
  return content;
}

async function fileExists({ bucket, key }) {
  const fullPath = path.join(LOCAL_STORAGE_PATH, bucket, key);
  
  try {
    await fs.access(fullPath);
    return true;
  } catch (error) {
    return false;
  }
}

function getPublicUrl({ bucket, key }) {
  // Local storage is not publicly accessible
  return `file://${path.join(LOCAL_STORAGE_PATH, bucket, key)}`;
}

module.exports = {
  uploadFile,
  downloadFile,
  fileExists,
  getPublicUrl
};
