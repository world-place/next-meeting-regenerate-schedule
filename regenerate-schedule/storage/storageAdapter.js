/**
 * Storage Adapter Interface
 * 
 * Provides a unified interface for different storage backends:
 * - AWS S3
 * - Cloudflare R2
 * - Fly.io Volumes
 * - Local Filesystem
 */

const STORAGE_BACKEND = process.env.STORAGE_BACKEND || 'aws-s3';

let storageAdapter;

function getStorageAdapter() {
  if (storageAdapter) return storageAdapter;

  console.log(`📦 Initializing storage adapter: ${STORAGE_BACKEND}`);

  switch (STORAGE_BACKEND) {
    case 'aws-s3':
      storageAdapter = require('./adapters/s3Adapter');
      break;
    case 'cloudflare-r2':
      storageAdapter = require('./adapters/r2Adapter');
      break;
    case 'fly-volumes':
      storageAdapter = require('./adapters/flyVolumesAdapter');
      break;
    case 'local':
      storageAdapter = require('./adapters/localAdapter');
      break;
    default:
      throw new Error(`Unknown storage backend: ${STORAGE_BACKEND}`);
  }

  return storageAdapter;
}

/**
 * Upload a file to storage
 * @param {Object} params
 * @param {string} params.bucket - Bucket/container name
 * @param {string} params.key - File path/key
 * @param {string|Buffer} params.body - File content
 * @param {string} params.contentType - MIME type
 */
async function uploadFile({ bucket, key, body, contentType }) {
  const adapter = getStorageAdapter();
  return adapter.uploadFile({ bucket, key, body, contentType });
}

/**
 * Download a file from storage
 * @param {Object} params
 * @param {string} params.bucket - Bucket/container name
 * @param {string} params.key - File path/key
 * @returns {Promise<string|Buffer>} File content
 */
async function downloadFile({ bucket, key }) {
  const adapter = getStorageAdapter();
  return adapter.downloadFile({ bucket, key });
}

/**
 * Check if a file exists
 * @param {Object} params
 * @param {string} params.bucket - Bucket/container name
 * @param {string} params.key - File path/key
 * @returns {Promise<boolean>}
 */
async function fileExists({ bucket, key }) {
  const adapter = getStorageAdapter();
  return adapter.fileExists({ bucket, key });
}

/**
 * Get the public URL for a file (if applicable)
 * @param {Object} params
 * @param {string} params.bucket - Bucket/container name
 * @param {string} params.key - File path/key
 * @returns {string|null} Public URL or null
 */
function getPublicUrl({ bucket, key }) {
  const adapter = getStorageAdapter();
  if (adapter.getPublicUrl) {
    return adapter.getPublicUrl({ bucket, key });
  }
  return null;
}

/**
 * Get storage backend information
 * @returns {Object} Backend info
 */
function getStorageInfo() {
  return {
    backend: STORAGE_BACKEND,
    features: {
      publicUrls: ['aws-s3', 'cloudflare-r2'].includes(STORAGE_BACKEND),
      cdnIntegration: ['aws-s3', 'cloudflare-r2'].includes(STORAGE_BACKEND),
      persistence: true
    }
  };
}

module.exports = {
  uploadFile,
  downloadFile,
  fileExists,
  getPublicUrl,
  getStorageInfo,
  STORAGE_BACKEND
};
