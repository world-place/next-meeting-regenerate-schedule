/**
 * Meeting Source Adapter Interface
 * 
 * Provides a unified interface for different meeting data sources:
 * - Google Sheets (current)
 * - REST API
 * - Database (PostgreSQL, MySQL, etc.)
 * - CSV/JSON files
 * - Airtable
 * - Notion
 * 
 * Data sources must implement the getMeetings() method
 * which returns an array of meetings in the standard format.
 */

const MEETING_SOURCE = process.env.MEETING_SOURCE || 'google-sheets';

let sourceAdapter;

function getMeetingSourceAdapter() {
  if (sourceAdapter) return sourceAdapter;

  console.log(`📋 Initializing meeting source adapter: ${MEETING_SOURCE}`);

  switch (MEETING_SOURCE) {
    case 'google-sheets':
      sourceAdapter = require('./adapters/googleSheetsAdapter');
      break;
    case 'rest-api':
      sourceAdapter = require('./adapters/restApiAdapter');
      break;
    case 'database':
      sourceAdapter = require('./adapters/databaseAdapter');
      break;
    case 'json-file':
      sourceAdapter = require('./adapters/jsonFileAdapter');
      break;
    case 'airtable':
      sourceAdapter = require('./adapters/airtableAdapter');
      break;
    case 'jotform':
      sourceAdapter = require('./adapters/jotformAdapter');
      break;
    default:
      throw new Error(`Unknown meeting source: ${MEETING_SOURCE}`);
  }

  return sourceAdapter;
}

/**
 * Fetch meetings from the configured data source
 * 
 * @param {string} sourceId - Source identifier (e.g., Google Sheet ID, API endpoint, table name)
 * @returns {Promise<RawMeeting[]>} Array of raw meeting objects
 * 
 * @typedef {Object} RawMeeting
 * @property {string} dayOfWeek - Day of week (Monday, Tuesday, etc.)
 * @property {string} startTime - Start time (e.g., "7:00 PM", "19:00")
 * @property {string} meetingName - Name of the meeting
 * @property {string} [meetingId] - Meeting ID (Zoom, etc.)
 * @property {string} [password] - Meeting password
 * @property {string} [joinUrl] - Meeting join URL
 * @property {string} [contactInfo] - Contact information
 * @property {string} [notes] - Additional notes
 * @property {number} [durationMinutes] - Meeting duration (defaults to 60)
 */
async function fetchMeetings(sourceId) {
  const adapter = getMeetingSourceAdapter();
  return adapter.fetchMeetings(sourceId);
}

/**
 * Get information about the current meeting source
 * 
 * @returns {Object} Source information
 */
function getSourceInfo() {
  return {
    source: MEETING_SOURCE,
    adapter: getMeetingSourceAdapter().name || MEETING_SOURCE,
    supportsRealtime: ['rest-api', 'database'].includes(MEETING_SOURCE),
    supportsValidation: true
  };
}

/**
 * Test connection to the meeting source
 * 
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  const adapter = getMeetingSourceAdapter();
  
  if (adapter.testConnection) {
    return adapter.testConnection();
  }
  
  // Default test: try to fetch empty data
  try {
    await adapter.fetchMeetings('test');
    return true;
  } catch (error) {
    console.error('[Meeting Source] Connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  fetchMeetings,
  getSourceInfo,
  testConnection,
  MEETING_SOURCE
};
