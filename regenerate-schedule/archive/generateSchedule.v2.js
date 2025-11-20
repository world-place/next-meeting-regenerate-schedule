// Imports

require("isomorphic-fetch");
const fs = require('fs');

const { fetchMeetings } = require("./meetingSources/meetingSourceAdapter.js");
const { formatRawMeeting } = require("./formatMeeting.js");

// Main

async function generateSchedule( sourceId ) {
	console.log(`\n📋 Generating schedule from source: ${sourceId}`);
	
	// Fetch raw meetings from data source (Google Sheets, API, etc.)
	const rawMeetings = await fetchMeetings(sourceId);
	console.log(`Fetched ${rawMeetings.length} raw meetings`);
	
	// Format each meeting to standard structure
	const allMeetings = rawMeetings
		.map(formatRawMeeting)
		.filter(isDefined);
	
	console.log(`After formatting: ${allMeetings.length} valid entries`);
	
	const meetingList = allMeetings.sort(sortMeetingFn);
	
	console.log(`✅ Generated schedule (${meetingList.length} total meetings)`);
	
	writeDebugFiles(meetingList);
	return {
		metadata: {
			scheduleType: "fullWeek",
			generatedAt: new Date().toISOString(),
		},
		meetings: meetingList
	};
}

// Helpers

function sortMeetingFn({nextOccurrence: a}, {nextOccurrence: b}) {
	if(a < b) return -1;
	if(a > b) return 1;
	return 0;
}

function isDefined(item) {
	return item !== undefined && item !== null;
}

function writeDebugFiles(fullJsonSchedule) {
	if(process.env.WRITE_DEBUG_FILES) {
		console.log(`[dev] Writing files to local disk`);
		fs.writeFileSync("meetingsNext7Days.json", JSON.stringify(fullJsonSchedule, null, 2));
		console.log(`✅ Debug file written`);
	}
}

// Exports

exports.generateSchedule = generateSchedule;
