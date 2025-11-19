/**
 * JSON File Meeting Source Adapter
 * 
 * Loads meeting data from a JSON file
 * 
 * Example JSON format:
 * {
 *   "meetings": [
 *     {
 *       "dayOfWeek": "Monday",
 *       "startTime": "7:00 PM",
 *       "meetingName": "Monday Night Meeting",
 *       ...
 *     }
 *   ]
 * }
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Fetch meetings from JSON file
 * 
 * @param {string} sourceId - Path to JSON file (relative or absolute)
 * @returns {Promise<RawMeeting[]>} Array of raw meeting objects
 */
async function fetchMeetings(sourceId) {
  console.log(`[JSON File] Loading from: ${sourceId}`);
  
  try {
    // Resolve path (support relative paths)
    const filePath = path.isAbsolute(sourceId) 
      ? sourceId 
      : path.join(process.cwd(), sourceId);
    
    // Read file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Parse JSON
    const data = JSON.parse(fileContent);
    
    // Extract meetings array
    const meetings = data.meetings || data.data || data;
    
    if (!Array.isArray(meetings)) {
      throw new Error('JSON must contain an array of meetings');
    }
    
    console.log(`[JSON File] Loaded ${meetings.length} meetings from ${path.basename(sourceId)}`);
    
    return meetings;
    
  } catch (error) {
    console.error(`[JSON File] Error loading file:`, error.message);
    throw error;
  }
}

/**
 * Test JSON file access
 */
async function testConnection() {
  try {
    const testFile = process.env.JSON_FILE_PATH || './meetings.json';
    
    console.log(`[JSON File] Testing access to: ${testFile}`);
    
    await fs.access(testFile);
    
    console.log('[JSON File] File access successful');
    return true;
    
  } catch (error) {
    console.error('[JSON File] File access failed:', error.message);
    return false;
  }
}

module.exports = {
  fetchMeetings,
  testConnection,
  name: 'JSON File'
};
