const { sleep } = require("./global.js");
const { uploadFile, downloadFile } = require("./storage/storageAdapter.js");

const S3_DOWNLOAD_RETRY_TIMEOUT_DEFAULT_MS = 300;

const HTML_TEMPLATE_FILE_KEY = "index.template.html";
const HTML_TEMPLATE_JSON_INJECT_MARKER = "/* INJECT_SCHEDULE_JSON */"
const HTML_GENERATED_FILE_NAME = "index.html";



// Main

async function updateStaticSite({
  jsonSchedule,
  templateFileKey,
  uploadFileName,
  siteUUID
}) {
  
  console.log("ℹ️ Updating static site");
  
  // Get bucket names based on storage backend
  const sourceBucket = process.env.S3_BUCKET_NAME || process.env.R2_BUCKET_NAME || 'templates';
  const deployBucket = process.env.STATIC_SITE_S3_BUCKET || process.env.R2_BUCKET_NAME || 'sites';

  console.log("🌀 Downloading template HTML...");
  
  const templateHtml = await downloadFileWithRetry({ 
    bucket: sourceBucket, 
    key: templateFileKey
  });
  
  const jsonToInject = `const JSON_SCHEDULE=${JSON.stringify(jsonSchedule)}`
  const populatedHtml = templateHtml.replace(HTML_TEMPLATE_JSON_INJECT_MARKER, jsonToInject);
  
  console.log("ℹ️ Injected schedule JSON");

  console.log("🌀 Uploading built HTML...");
  await uploadFile({
    bucket: deployBucket,
    key: uploadFileName,
    body: populatedHtml,
    contentType: "text/html"
  });
  console.log(`✅ Done`);
  
  console.log("🌀 Uploading JSON version...");
  await uploadFile({
    bucket: deployBucket,
    key: `${siteUUID}.json`,
    body: JSON.stringify(jsonSchedule),
    contentType: "application/json"
  });
  console.log(`✅ Done`);
  
  console.log(`✅ Static site redeployed`);
}



const downloadFileWithRetry = async ({bucket, key}) => {
  let retriesRemaining = 3;
  const RETRY_TIMEOUT_MS = process.env.STORAGE_DOWNLOAD_RETRY_TIMEOUT_MS || S3_DOWNLOAD_RETRY_TIMEOUT_DEFAULT_MS;
  let response, error;
  
  while(response === undefined && retriesRemaining > 0) {
    try {
      console.log(`Attempting download. (${retriesRemaining} retries remaining)`);
      
      response = await downloadFile({ bucket, key });
      
      console.log("✅ Download successful");
    } catch(e) {
      error = e;
      console.error(e);
      retriesRemaining -= 1;
      if (retriesRemaining > 0) {
        await sleep(RETRY_TIMEOUT_MS);
      }
    }
  }

  if(response !== undefined) return response;
  throw {name: "DOWNLOAD_FAILED", key, error};
}

exports.default = updateStaticSite;
exports.updateStaticSite = updateStaticSite;