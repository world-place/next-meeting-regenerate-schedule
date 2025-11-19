# Meeting Data Sources - Complete Guide

This guide explains how to use different data sources for your meeting schedules and how to create custom adapters.

## Overview

The NextMeeting Schedule Generator uses an **adapter pattern** for data sources, making it easy to switch between or add new sources without changing the core application code.

**Available Adapters:**
- ✅ Google Sheets (default, production-ready)
- ✅ REST API (example implementation)
- ✅ Database (PostgreSQL/MySQL)
- ✅ JSON File (for testing/development)
- ✅ Airtable (example implementation)
- ✅ Jotform (API integration)

---

## Architecture

```
Application
    ↓
Meeting Source Adapter (interface)
    ↓
┌───┴────┬─────────┬──────────┬───────────┬──────────┐
↓        ↓         ↓          ↓           ↓          ↓
Google   REST    Database   JSON      Airtable   Custom
Sheets   API                 File                 Adapter
```

---

## Data Format Specification

### Raw Meeting Object

All adapters must return meetings in this standard format:

```javascript
{
  // REQUIRED FIELDS
  dayOfWeek: "Monday",        // Day of week: Monday-Sunday
  startTime: "7:00 PM",        // Time in 12-hour or 24-hour format
  meetingName: "Monday Night Meeting",
  
  // OPTIONAL FIELDS
  meetingId: "123456789",      // Zoom/platform meeting ID
  password: "secret123",       // Meeting password
  joinUrl: "https://zoom.us/j/123456789",
  contactInfo: "admin@example.com",
  notes: "Beginner friendly",
  durationMinutes: 60          // Default: 60
}
```

### Formatted Meeting Object

The adapter output is automatically formatted to:

```javascript
{
  name: "Monday Night Meeting",
  nextOccurrence: "2024-01-15T19:00:00.000Z",  // ISO 8601
  connectionDetails: {
    platform: "zoom",          // zoom, skype, phone-number, email, unknown
    mustContactForConnectionInfo: false,
    meetingId: "123456789",
    password: "secret123",
    joinUrl: "https://zoom.us/j/123456789"
  },
  contactInfo: "admin@example.com",
  feedbackEmail: "admin@example.com",
  notes: "Beginner friendly",
  participantCount: "",
  durationMinutes: 60,
  metadata: {
    hostLocation: "",
    localTimezoneOffset: undefined,
    language: "en",
    restrictions: {
      openMeeting: false,      // Extracted from meeting name
      gender: "ALL"            // ALL, WOMEN_ONLY, MEN_ONLY
    }
  }
}
```

---

## Using Different Data Sources

### 1. Google Sheets (Default)

**Configuration:**

```bash
MEETING_SOURCE=google-sheets
GOOGLE_API_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com
GOOGLE_API_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**Source ID:** Google Sheet document ID

**Example:**
```javascript
// In app config
{
  name: "SA",
  googleSheetId: '1_QxT6VIm1HTLKSl71DtDqSMWVZYrdbqSl0WSF0Ch6g4',
  siteUUID: '275EE30A-220F-4FF2-A950-0ED2B5E4C257'
}
```

**Sheet Format:**

| Day of Week | Start Time | Meeting Name | Meeting ID | Password | Join URL | Contact Info | Notes |
|-------------|------------|--------------|------------|----------|----------|--------------|-------|
| Monday | 7:00 PM | Monday Night | 123456789 | abc123 | https://... | email@... | Notes |

---

### 2. REST API

**Configuration:**

```bash
MEETING_SOURCE=rest-api
API_BASE_URL=https://api.yourapp.com
API_AUTH_TOKEN=your-bearer-token  # Optional
API_KEY=your-api-key              # Optional
```

**Source ID:** API endpoint path or full URL

**Example:**
```javascript
// Source ID can be:
sourceId: '/meetings/sa'
// OR
sourceId: 'https://api.yourapp.com/meetings/sa'
```

**Expected API Response:**

```json
{
  "meetings": [
    {
      "dayOfWeek": "Monday",
      "startTime": "7:00 PM",
      "meetingName": "Monday Night Meeting",
      "joinUrl": "https://zoom.us/j/123456789",
      "meetingId": "123456789",
      "password": "abc123",
      "contactInfo": "admin@example.com",
      "notes": "Open meeting",
      "durationMinutes": 60
    }
  ]
}
```

**Creating Your API:**

```javascript
// Express example
app.get('/meetings/:groupId', async (req, res) => {
  const meetings = await getMeetingsFromDatabase(req.params.groupId);
  res.json({ meetings });
});
```

---

### 3. Database (PostgreSQL/MySQL)

**Configuration:**

```bash
MEETING_SOURCE=database
DATABASE_TYPE=postgresql  # or mysql
DATABASE_URL=postgres://user:pass@host:5432/dbname
```

**Source ID:** Table name

**Database Schema:**

```sql
CREATE TABLE meetings (
  id SERIAL PRIMARY KEY,
  day_of_week VARCHAR(20) NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  meeting_name VARCHAR(255) NOT NULL,
  meeting_id VARCHAR(100),
  password VARCHAR(100),
  join_url TEXT,
  contact_info TEXT,
  notes TEXT,
  duration_minutes INTEGER DEFAULT 60,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_meetings_active ON meetings(active, day_of_week, start_time);
```

**Example Data:**

```sql
INSERT INTO meetings (
  day_of_week, start_time, meeting_name, 
  join_url, meeting_id, password, contact_info
) VALUES (
  'Monday', '7:00 PM', 'Monday Night Meeting',
  'https://zoom.us/j/123456789', '123456789', 
  'abc123', 'admin@example.com'
);
```

---

### 4. JSON File

**Configuration:**

```bash
MEETING_SOURCE=json-file
JSON_FILE_PATH=./meetings.json  # Optional, defaults to this
```

**Source ID:** Path to JSON file

**File Format (`meetings.json`):**

```json
{
  "meetings": [
    {
      "dayOfWeek": "Monday",
      "startTime": "7:00 PM",
      "meetingName": "Monday Night Meeting",
      "joinUrl": "https://zoom.us/j/123456789",
      "meetingId": "123456789",
      "password": "abc123",
      "contactInfo": "admin@example.com",
      "notes": "Open meeting",
      "durationMinutes": 60
    },
    {
      "dayOfWeek": "Tuesday",
      "startTime": "6:30 PM",
      "meetingName": "Tuesday Evening Group",
      "joinUrl": "https://zoom.us/j/987654321"
    }
  ]
}
```

---

### 5. Airtable

**Configuration:**

```bash
MEETING_SOURCE=airtable
AIRTABLE_API_KEY=keyABC123...
AIRTABLE_BASE_ID=appXYZ456...
AIRTABLE_TABLE_NAME=Meetings  # Optional, defaults to "Meetings"
```

**Source ID:** Table name (or use AIRTABLE_TABLE_NAME)

**Airtable Base Structure:**

| Field Name | Type | Description |
|------------|------|-------------|
| Day of Week | Single select | Monday-Sunday |
| Start Time | Single line text | "7:00 PM" |
| Meeting Name | Single line text | Meeting title |
| Join URL | URL | Zoom/meeting link |
| Meeting ID | Single line text | Platform meeting ID |
| Password | Single line text | Meeting password |
| Contact Info | Email or text | Contact information |
| Notes | Long text | Additional notes |
| Duration (minutes) | Number | Meeting length |

---

### 6. Jotform

**Configuration:**

```bash
MEETING_SOURCE=jotform
JOTFORM_API_KEY=your-readonly-api-key
JOTFORM_FORM_IDS=123456789012345,987654321098765   # Comma-separated list

# Optional
JOTFORM_BASE_URL=https://api.jotform.com        # Override for EU/Enterprise
JOTFORM_PAGE_SIZE=200                          # Pagination size (default 200)
JOTFORM_RATE_LIMIT_PER_DAY=1000                # Informational logging only

# Mapping helpers
JOTFORM_FIELD_MAP='{"dayOfWeek":["Day of Week"],"startTime":["Start Time"]}'
JOTFORM_TRANSFORMER_PATH=./path/to/customTransformer.js
```

**Source ID:** Optional override for `JOTFORM_FORM_IDS`. Pass a comma-separated list (or array) of form IDs when calling `generateSchedule` to target specific forms per deployment.

**What it does:**

1. Calls Jotform's REST API (`/form/{id}/submissions`) with pagination until all submissions are collected for each configured form.
2. Logs rate-limit information (if provided) so you can tune scheduling based on your plan.
3. Passes each submission through a transformer that maps Jotform answers → raw meeting objects consumed by `formatMeeting.js`.

**Transformers & Field Mapping:**

- The default transformer ships with sensible aliases (e.g., "Day of Week", "dayOfWeek", "Meeting Time") and looks for matching question labels, names, or IDs.
- Override or extend the mapping by supplying a JSON string via `JOTFORM_FIELD_MAP`.
  ```bash
  JOTFORM_FIELD_MAP='{
    "meetingName": ["Meeting Title", "Group Name"],
    "joinUrl": ["Zoom Link"]
  }'
  ```
- For full control, point `JOTFORM_TRANSFORMER_PATH` at a module that exports either a function or `{ transformSubmission }`. The function receives `(submission, context)` and must return either a single raw meeting, an array of meetings, or `null` to skip.

```javascript
// customTransformer.js
module.exports = (submission, context) => {
  const answers = submission.answers || {};
  const name = answers['3']?.answer;
  if (!name) return null;

  return {
    dayOfWeek: answers['1']?.answer,
    startTime: answers['2']?.answer,
    meetingName: name,
    joinUrl: answers['4']?.answer,
    contactInfo: submission.sender_email,
    notes: `Source form: ${context.formId}`,
    durationMinutes: 90,
  };
};
```

**Testing the connection:**

```bash
node -e "require('./meetingSources/meetingSourceAdapter').testConnection().then(console.log)"
```

The adapter will either fetch the first configured form or fall back to listing forms via `/user/forms` if none are provided yet.

---

## Creating a Custom Adapter

### Step 1: Create Adapter File

Create `meetingSources/adapters/yourAdapter.js`:

```javascript
/**
 * Your Custom Meeting Source Adapter
 */

async function fetchMeetings(sourceId) {
  console.log(`[Your Adapter] Fetching from: ${sourceId}`);
  
  // 1. Connect to your data source
  // 2. Fetch raw data
  // 3. Transform to standard format
  
  const rawData = await yourDataSource.fetch(sourceId);
  
  const meetings = rawData.map(item => ({
    dayOfWeek: item.day,
    startTime: item.time,
    meetingName: item.name,
    meetingId: item.id,
    password: item.pass,
    joinUrl: item.url,
    contactInfo: item.contact,
    notes: item.notes,
    durationMinutes: item.duration || 60
  }));
  
  console.log(`[Your Adapter] Fetched ${meetings.length} meetings`);
  
  return meetings;
}

async function testConnection() {
  try {
    // Test your data source connection
    await yourDataSource.ping();
    console.log('[Your Adapter] Connection successful');
    return true;
  } catch (error) {
    console.error('[Your Adapter] Connection failed:', error);
    return false;
  }
}

module.exports = {
  fetchMeetings,
  testConnection,
  name: 'Your Adapter'
};
```

### Step 2: Register Adapter

Edit `meetingSources/meetingSourceAdapter.js`:

```javascript
function getMeetingSourceAdapter() {
  // ... existing code ...
  
  switch (MEETING_SOURCE) {
    // ... existing cases ...
    
    case 'your-adapter':
      sourceAdapter = require('./adapters/yourAdapter');
      break;
    
    default:
      throw new Error(`Unknown meeting source: ${MEETING_SOURCE}`);
  }
  
  return sourceAdapter;
}
```

### Step 3: Configure and Use

```bash
MEETING_SOURCE=your-adapter
YOUR_ADAPTER_CONFIG=...
```

---

## Field Mapping Guide

### Time Formats (Supported)

```javascript
// 12-hour format
"7:00 PM"
"07:00 PM"
"7:00 pm"

// 24-hour format  
"19:00"
"19:00:00"
```

### Day of Week (Accepted)

```javascript
// Full names (preferred)
"Monday", "Tuesday", "Wednesday", "Thursday", 
"Friday", "Saturday", "Sunday"

// Case insensitive
"monday", "MONDAY", "Monday"

// Abbreviations (if you add support)
"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
```

### Platform Detection

Automatically detected from `joinUrl`:

| URL Pattern | Platform |
|-------------|----------|
| Contains `.zoom.us/` | zoom |
| Contains `join.skype` | skype |
| Starts with `tel:` | phone-number |
| Starts with `mailto:` | email |
| Otherwise | unknown |

### Gender Restrictions

Automatically detected from `meetingName`:

| Name Contains | Restriction |
|---------------|-------------|
| women, woman, female | WOMEN_ONLY |
| men, man, male | MEN_ONLY |
| Otherwise | ALL |

### Open Meeting Detection

Detected from `meetingName`:

- Contains "open" or "open meeting" → `openMeeting: true`

---

## Migration Examples

### From Google Sheets to Database

1. **Export existing data:**

```javascript
// One-time script
const { fetchMeetings } = require('./meetingSources/adapters/googleSheetsAdapter');

const meetings = await fetchMeetings('YOUR_SHEET_ID');

// Insert into database
for (const meeting of meetings) {
  await db.query(`
    INSERT INTO meetings (day_of_week, start_time, meeting_name, ...)
    VALUES ($1, $2, $3, ...)
  `, [meeting.dayOfWeek, meeting.startTime, meeting.meetingName, ...]);
}
```

2. **Update configuration:**

```bash
# Old
MEETING_SOURCE=google-sheets

# New
MEETING_SOURCE=database
DATABASE_URL=postgres://...
```

### From Static JSON to API

1. **Create API endpoint:**

```javascript
app.get('/api/meetings', (req, res) => {
  const meetings = require('./meetings.json').meetings;
  res.json({ meetings });
});
```

2. **Update configuration:**

```bash
# Old
MEETING_SOURCE=json-file

# New
MEETING_SOURCE=rest-api
API_BASE_URL=http://localhost:3000/api/meetings
```

---

## Testing Your Adapter

### Unit Test Example

```javascript
// test/adapters/yourAdapter.test.js
const { fetchMeetings, testConnection } = require('../../meetingSources/adapters/yourAdapter');

describe('Your Adapter', () => {
  it('should fetch meetings', async () => {
    const meetings = await fetchMeetings('test-source');
    
    expect(meetings).toBeInstanceOf(Array);
    expect(meetings[0]).toHaveProperty('dayOfWeek');
    expect(meetings[0]).toHaveProperty('startTime');
    expect(meetings[0]).toHaveProperty('meetingName');
  });
  
  it('should test connection', async () => {
    const result = await testConnection();
    expect(result).toBe(true);
  });
});
```

### Manual Testing

```bash
# Test locally
MEETING_SOURCE=your-adapter npm start

# Trigger job
curl -X POST http://localhost:8080/trigger

# Check logs
tail -f logs/app.log
```

---

## Best Practices

### 1. Error Handling

```javascript
async function fetchMeetings(sourceId) {
  try {
    const data = await yourSource.fetch(sourceId);
    return transformData(data);
  } catch (error) {
    console.error(`[Your Adapter] Error:`, error.message);
    // Log error details
    throw new Error(`Failed to fetch meetings: ${error.message}`);
  }
}
```

### 2. Logging

```javascript
console.log(`[Your Adapter] Fetching from: ${sourceId}`);
console.log(`[Your Adapter] Fetched ${meetings.length} meetings`);
console.error(`[Your Adapter] Error: ${error.message}`);
```

### 3. Validation

```javascript
function validateMeeting(meeting) {
  if (!meeting.dayOfWeek || !meeting.startTime || !meeting.meetingName) {
    console.warn(`[Your Adapter] Invalid meeting:`, meeting);
    return false;
  }
  return true;
}

const validMeetings = rawMeetings.filter(validateMeeting);
```

### 4. Caching (Optional)

```javascript
const cache = new Map();
const CACHE_TTL = 300000;  // 5 minutes

async function fetchMeetings(sourceId) {
  const cached = cache.get(sourceId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Your Adapter] Using cached data`);
    return cached.data;
  }
  
  const data = await yourSource.fetch(sourceId);
  cache.set(sourceId, { data, timestamp: Date.now() });
  return data;
}
```

---

## Troubleshooting

### Meeting Not Appearing

**Check:**
1. Required fields present (dayOfWeek, startTime, meetingName)
2. Time format is valid
3. Meeting passes validation
4. Check logs for errors

**Debug:**
```javascript
console.log('Raw meeting:', rawMeeting);
console.log('Formatted:', formatRawMeeting(rawMeeting));
```

### Adapter Not Loading

**Check:**
1. Adapter file exists in `meetingSources/adapters/`
2. Adapter registered in `meetingSourceAdapter.js`
3. `MEETING_SOURCE` environment variable is correct

**Test:**
```bash
node -e "require('./meetingSources/meetingSourceAdapter').getSourceInfo()"
```

### Connection Failures

**Check:**
1. Credentials are correct
2. Network connectivity
3. API endpoints are accessible
4. Database is running

**Test:**
```bash
node -e "require('./meetingSources/meetingSourceAdapter').testConnection().then(console.log)"
```

---

## Performance Optimization

### Parallel Fetching

If you have multiple sources:

```javascript
const sources = ['source1', 'source2', 'source3'];

const results = await Promise.all(
  sources.map(source => fetchMeetings(source))
);

const allMeetings = results.flat();
```

### Pagination

For large datasets:

```javascript
async function fetchMeetings(sourceId, page = 1, limit = 100) {
  const offset = (page - 1) * limit;
  
  const meetings = await yourSource.fetch({
    sourceId,
    limit,
    offset
  });
  
  // Fetch more pages if needed
  if (meetings.length === limit) {
    const nextPage = await fetchMeetings(sourceId, page + 1, limit);
    return meetings.concat(nextPage);
  }
  
  return meetings;
}
```

---

## Quick Reference

### Adapter Interface

```javascript
module.exports = {
  fetchMeetings: async (sourceId) => RawMeeting[],
  testConnection: async () => boolean,
  name: string
};
```

### Required Fields

- `dayOfWeek` (string)
- `startTime` (string)
- `meetingName` (string)

### Optional Fields

- `meetingId`, `password`, `joinUrl`, `contactInfo`, `notes`, `durationMinutes`

### Environment Variables

```bash
MEETING_SOURCE=google-sheets|rest-api|database|json-file|airtable
# Plus adapter-specific vars
```

---

## Support

For questions or custom adapter development:

- Check existing adapters in `meetingSources/adapters/`
- Review data format specification
- Test with JSON file adapter first
- Ask for help in project issues

---

**Next Steps:**
- Choose your data source
- Set up credentials
- Test locally
- Deploy and monitor
