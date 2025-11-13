/**
 * Database Meeting Source Adapter
 * 
 * Fetches meeting data from a SQL database (PostgreSQL, MySQL, etc.)
 * 
 * Requires:
 * - npm install pg (PostgreSQL) or mysql2 (MySQL)
 * - DATABASE_URL environment variable
 * 
 * Example DATABASE_URL:
 * - PostgreSQL: postgres://user:pass@host:5432/dbname
 * - MySQL: mysql://user:pass@host:3306/dbname
 */

/**
 * Fetch meetings from database
 * 
 * @param {string} sourceId - Table name or query identifier
 * @returns {Promise<RawMeeting[]>} Array of raw meeting objects
 */
async function fetchMeetings(sourceId) {
  console.log(`[Database] Fetching from: ${sourceId}`);
  
  const databaseUrl = process.env.DATABASE_URL;
  const dbType = process.env.DATABASE_TYPE || 'postgresql';  // or 'mysql'
  
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL environment variable');
  }
  
  try {
    let client, rows;
    
    if (dbType === 'postgresql') {
      // PostgreSQL
      const { Client } = require('pg');
      client = new Client({ connectionString: databaseUrl });
      
      await client.connect();
      
      const query = `
        SELECT 
          day_of_week,
          start_time,
          meeting_name,
          meeting_id,
          password,
          join_url,
          contact_info,
          notes,
          duration_minutes
        FROM ${sourceId}
        WHERE active = true
        ORDER BY day_of_week, start_time
      `;
      
      const result = await client.query(query);
      rows = result.rows;
      
      await client.end();
      
    } else if (dbType === 'mysql') {
      // MySQL
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection(databaseUrl);
      
      const [rows] = await connection.execute(`
        SELECT 
          day_of_week,
          start_time,
          meeting_name,
          meeting_id,
          password,
          join_url,
          contact_info,
          notes,
          duration_minutes
        FROM ${sourceId}
        WHERE active = 1
        ORDER BY day_of_week, start_time
      `);
      
      await connection.end();
    } else {
      throw new Error(`Unsupported database type: ${dbType}`);
    }
    
    console.log(`[Database] Fetched ${rows.length} meetings`);
    
    // Transform database rows to raw meetings
    return rows.map(transformDatabaseRow);
    
  } catch (error) {
    console.error(`[Database] Error fetching meetings:`, error.message);
    throw error;
  }
}

/**
 * Transform database row to standard raw meeting format
 */
function transformDatabaseRow(row) {
  return {
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    meetingName: row.meeting_name,
    meetingId: row.meeting_id,
    password: row.password,
    joinUrl: row.join_url,
    contactInfo: row.contact_info,
    notes: row.notes,
    durationMinutes: row.duration_minutes || 60
  };
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    const dbType = process.env.DATABASE_TYPE || 'postgresql';
    
    if (!databaseUrl) {
      console.error('[Database] No DATABASE_URL configured');
      return false;
    }
    
    console.log(`[Database] Testing ${dbType} connection...`);
    
    if (dbType === 'postgresql') {
      const { Client } = require('pg');
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
    } else if (dbType === 'mysql') {
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection(databaseUrl);
      await connection.execute('SELECT 1');
      await connection.end();
    }
    
    console.log('[Database] Connection successful');
    return true;
    
  } catch (error) {
    console.error('[Database] Connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  fetchMeetings,
  testConnection,
  name: 'Database'
};
