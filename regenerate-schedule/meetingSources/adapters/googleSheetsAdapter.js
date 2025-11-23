/**
 * Google Sheets Meeting Source Adapter
 * 
 * Fetches meeting data from Google Sheets
 */

const { GoogleSpreadsheet } = require('google-spreadsheet');

/**
 * Fetch meetings from Google Sheets
 * 
 * @param {string} sheetId - Google Sheets document ID
 * @returns {Promise<RawMeeting[]>} Array of raw meeting objects
 */
async function fetchMeetings(sheetId) {
  console.log(`[Google Sheets] Fetching from sheet: ${sheetId}`);
  
  const sheet = await downloadSheet(sheetId);
  const meetings = await extractMeetingsFromSheet(sheet);
  
  console.log(`[Google Sheets] Fetched ${meetings.length} meetings`);
  
  return meetings;
}

/**
 * Download and load Google Sheet
 */
async function downloadSheet(sheetId) {
  const doc = await getGoogleSheetsDoc(sheetId);
  const sheet = doc.sheetsByIndex[0];
  
  console.log(`[Google Sheets] Sheet title: ${sheet.title}`);
  console.log(`[Google Sheets] Loading cells...`);
  
  await sheet.loadCells();
  
  console.log(`[Google Sheets] Loaded ${sheet.rowCount} rows`);
  
  return sheet;
}

/**
 * Authenticate and get Google Sheets document
 */
async function getGoogleSheetsDoc(docId) {
  // Temporarily unset proxy env vars to avoid proxy issues
  const originalHttpProxy = process.env.HTTP_PROXY;
  const originalHttpsProxy = process.env.HTTPS_PROXY;
  const originalHttpProxyLower = process.env.http_proxy;
  const originalHttpsProxyLower = process.env.https_proxy;
  
  delete process.env.HTTP_PROXY;
  delete process.env.HTTPS_PROXY;
  delete process.env.http_proxy;
  delete process.env.https_proxy;
  
  try {
    const doc = new GoogleSpreadsheet(docId);
    
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_API_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_API_PRIVATE_KEY.replace(/\\n/g, "\n")
    });

    await doc.loadInfo();
    return doc;
  } finally {
    // Restore proxy settings
    if (originalHttpProxy) process.env.HTTP_PROXY = originalHttpProxy;
    if (originalHttpsProxy) process.env.HTTPS_PROXY = originalHttpsProxy;
    if (originalHttpProxyLower) process.env.http_proxy = originalHttpProxyLower;
    if (originalHttpsProxyLower) process.env.https_proxy = originalHttpsProxyLower;
  }
}

/**
 * Extract meetings from sheet
 */
async function extractMeetingsFromSheet(sheet) {
  const ROWS_OCCUPIED_BY_HEADER = 2;
  const ROWS_TO_IGNORE_FROM_END = 2;
  const COLUMN_COUNT = 9;  // Increased to include duration
  
  const meetingCount = sheet.rowCount - ROWS_TO_IGNORE_FROM_END;
  const meetings = [];
  
  for (let rowIndex = ROWS_OCCUPIED_BY_HEADER; rowIndex < meetingCount; rowIndex++) {
    const rowData = getRowContent(sheet, rowIndex, COLUMN_COUNT);
    const meeting = rowDataToMeeting(rowData);
    
    if (meeting) {
      meetings.push(meeting);
    }
  }
  
  return meetings;
}

/**
 * Get content from a row
 */
function getRowContent(sheet, rowNumber, columnCount) {
  const rowData = [];
  
  for (let colIndex = 0; colIndex < columnCount; colIndex++) {
    try {
      const cell = sheet.getCell(rowNumber, colIndex);
      rowData.push(cell._rawData.formattedValue);
    } catch (error) {
      rowData.push(undefined);
    }
  }
  
  return rowData;
}

/**
 * Convert row data to meeting object
 */
function rowDataToMeeting(rowData) {
  const [
    dayOfWeek,
    startTime,
    meetingName,
    meetingId,
    password,
    joinUrl,
    contactInfo,
    notes,
    durationMinutes
  ] = rowData;
  
  // Skip if no start time (indicates empty row)
  if (!startTime) {
    return null;
  }
  
  return {
    dayOfWeek: dayOfWeek?.trim(),
    startTime: startTime?.trim(),
    meetingName: meetingName?.trim() || '<Untitled Meeting>',
    meetingId: meetingId?.trim(),
    password: password?.trim(),
    joinUrl: joinUrl?.trim(),
    contactInfo: contactInfo?.trim(),
    notes: notes?.trim() || '',
    durationMinutes: parseDuration(durationMinutes) || 60
  };
}

/**
 * Parse duration from various formats
 */
function parseDuration(value) {
  if (!value) return null;
  
  // If it's already a number
  if (typeof value === 'number') return Math.floor(value);
  
  // If it's a string number
  const parsed = parseInt(value);
  if (!isNaN(parsed)) return parsed;
  
  // Could extend to parse "1 hour", "90 min", etc.
  return null;
}

/**
 * Test Google Sheets connection
 */
async function testConnection() {
  try {
    // Check required env vars
    if (!process.env.GOOGLE_API_CLIENT_EMAIL || !process.env.GOOGLE_API_PRIVATE_KEY) {
      console.error('[Google Sheets] Missing required credentials');
      return false;
    }
    
    console.log('[Google Sheets] Credentials found');
    return true;
  } catch (error) {
    console.error('[Google Sheets] Connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  fetchMeetings,
  testConnection,
  name: 'Google Sheets'
};
