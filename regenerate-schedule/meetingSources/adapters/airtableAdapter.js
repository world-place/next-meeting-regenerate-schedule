/**
 * Airtable Meeting Source Adapter
 * 
 * Fetches meeting data from an Airtable base
 * 
 * Requires:
 * - npm install airtable
 * - AIRTABLE_API_KEY environment variable
 * - AIRTABLE_BASE_ID environment variable
 * - AIRTABLE_TABLE_NAME environment variable (default: "Meetings")
 */

require("isomorphic-fetch");

/**
 * Fetch meetings from Airtable
 * 
 * @param {string} sourceId - Table name (or use AIRTABLE_TABLE_NAME env var)
 * @returns {Promise<RawMeeting[]>} Array of raw meeting objects
 */
async function fetchMeetings(sourceId) {
  console.log(`[Airtable] Fetching from table: ${sourceId}`);
  
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = sourceId || process.env.AIRTABLE_TABLE_NAME || 'Meetings';
  
  if (!apiKey || !baseId) {
    throw new Error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID environment variables');
  }
  
  try {
    // Fetch records from Airtable API
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Airtable API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`[Airtable] Fetched ${data.records.length} records`);
    
    // Transform Airtable records to raw meetings
    return data.records.map(record => transformAirtableRecord(record.fields));
    
  } catch (error) {
    console.error(`[Airtable] Error fetching meetings:`, error.message);
    throw error;
  }
}

/**
 * Transform Airtable record to standard raw meeting format
 * 
 * Adapt field names to match your Airtable schema
 */
function transformAirtableRecord(fields) {
  return {
    dayOfWeek: fields['Day of Week'] || fields.dayOfWeek,
    startTime: fields['Start Time'] || fields.startTime,
    meetingName: fields['Meeting Name'] || fields.name,
    meetingId: fields['Meeting ID'] || fields.meetingId,
    password: fields['Password'] || fields.password,
    joinUrl: fields['Join URL'] || fields.joinUrl || fields.url,
    contactInfo: fields['Contact Info'] || fields.contactInfo,
    notes: fields['Notes'] || fields.notes,
    durationMinutes: fields['Duration (minutes)'] || fields.duration || 60
  };
}

/**
 * Test Airtable connection
 */
async function testConnection() {
  try {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    if (!apiKey || !baseId) {
      console.error('[Airtable] Missing API credentials');
      return false;
    }
    
    console.log('[Airtable] Testing connection...');
    
    // Test with a simple API call
    const url = `https://api.airtable.com/v0/${baseId}/Meetings?maxRecords=1`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.ok) {
      console.log('[Airtable] Connection successful');
      return true;
    }
    
    console.error(`[Airtable] Connection failed: ${response.status}`);
    return false;
    
  } catch (error) {
    console.error('[Airtable] Connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  fetchMeetings,
  testConnection,
  name: 'Airtable'
};
