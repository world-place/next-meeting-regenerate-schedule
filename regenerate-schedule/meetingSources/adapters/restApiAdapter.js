/**
 * REST API Meeting Source Adapter
 * 
 * Fetches meeting data from a REST API endpoint
 * 
 * Example API response format:
 * {
 *   "meetings": [
 *     {
 *       "dayOfWeek": "Monday",
 *       "startTime": "7:00 PM",
 *       "meetingName": "Monday Night Meeting",
 *       "joinUrl": "https://zoom.us/j/123456789",
 *       ...
 *     }
 *   ]
 * }
 */

require("isomorphic-fetch");

/**
 * Fetch meetings from REST API
 * 
 * @param {string} sourceId - API endpoint URL
 * @returns {Promise<RawMeeting[]>} Array of raw meeting objects
 */
async function fetchMeetings(sourceId) {
  console.log(`[REST API] Fetching from: ${sourceId}`);
  
  const apiUrl = sourceId.startsWith('http') ? sourceId : process.env.API_BASE_URL + sourceId;
  
  // Add authentication if configured
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (process.env.API_AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.API_AUTH_TOKEN}`;
  }
  
  if (process.env.API_KEY) {
    headers['X-API-Key'] = process.env.API_KEY;
  }
  
  try {
    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract meetings array (adapt to your API structure)
    const meetings = data.meetings || data.data || data;
    
    console.log(`[REST API] Fetched ${meetings.length} meetings`);
    
    // Transform API response to standard format
    return meetings.map(transformApiMeeting);
    
  } catch (error) {
    console.error(`[REST API] Error fetching meetings:`, error.message);
    throw error;
  }
}

/**
 * Transform API meeting to standard raw meeting format
 */
function transformApiMeeting(apiMeeting) {
  return {
    dayOfWeek: apiMeeting.dayOfWeek || apiMeeting.day_of_week,
    startTime: apiMeeting.startTime || apiMeeting.start_time,
    meetingName: apiMeeting.name || apiMeeting.title || apiMeeting.meetingName,
    meetingId: apiMeeting.meetingId || apiMeeting.meeting_id,
    password: apiMeeting.password,
    joinUrl: apiMeeting.joinUrl || apiMeeting.join_url || apiMeeting.url,
    contactInfo: apiMeeting.contactInfo || apiMeeting.contact_info || apiMeeting.contact,
    notes: apiMeeting.notes || apiMeeting.description,
    durationMinutes: apiMeeting.durationMinutes || apiMeeting.duration || 60
  };
}

/**
 * Test REST API connection
 */
async function testConnection() {
  try {
    const testUrl = process.env.API_BASE_URL || process.env.API_ENDPOINT;
    
    if (!testUrl) {
      console.error('[REST API] No API_BASE_URL or API_ENDPOINT configured');
      return false;
    }
    
    console.log(`[REST API] Testing connection to: ${testUrl}`);
    
    // Try a simple GET request
    const response = await fetch(testUrl);
    
    if (response.ok) {
      console.log('[REST API] Connection successful');
      return true;
    }
    
    console.error(`[REST API] Connection failed: ${response.status}`);
    return false;
    
  } catch (error) {
    console.error('[REST API] Connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  fetchMeetings,
  testConnection,
  name: 'REST API'
};
