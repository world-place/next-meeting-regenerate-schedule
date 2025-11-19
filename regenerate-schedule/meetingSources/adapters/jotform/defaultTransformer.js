const DEFAULT_FIELD_ALIASES = {
  dayOfWeek: ['dayofweek', 'day_of_week', 'meetingday', 'meeting_day', 'day'],
  startTime: ['starttime', 'start_time', 'meetingtime', 'meeting_time', 'time'],
  meetingName: ['meetingname', 'meeting_name', 'title', 'meetingtitle', 'meeting_title', 'groupname'],
  meetingId: ['meetingid', 'meeting_id', 'zoomid', 'zoom_id', 'connectionid'],
  password: ['password', 'passcode', 'meetingpassword', 'meeting_password'],
  joinUrl: ['joinurl', 'join_url', 'meetinglink', 'meeting_link', 'zoomlink', 'zoom_link', 'url'],
  contactInfo: ['contact', 'contactinfo', 'contact_info', 'contactemail', 'contact_email'],
  notes: ['notes', 'description', 'details', 'extra', 'comments'],
  durationMinutes: ['duration', 'durationminutes', 'duration_minutes', 'meetinglength', 'meeting_length'],
};

const fieldAliases = buildFieldAliases();

function transformSubmission(submission = {}, context = {}) {
  const answers = submission.answers || {};
  const get = (fieldName) => {
    const identifiers = fieldAliases[fieldName] || [];
    const answer = findAnswerByIdentifiers(answers, identifiers);
    return extractAnswerValue(answer);
  };

  const dayOfWeek = safeTrim(get('dayOfWeek'));
  const startTime = safeTrim(get('startTime'));
  const meetingName =
    safeTrim(get('meetingName')) ||
    safeTrim(submission?.title) ||
    safeTrim(context.formTitle) ||
    'Untitled Meeting';

  if (!dayOfWeek || !startTime) {
    console.warn(
      `[Jotform] Submission ${submission?.id || 'unknown'} is missing required dayOfWeek/startTime values. Skipping.`
    );
    return null;
  }

  const rawMeeting = {
    dayOfWeek,
    startTime,
    meetingName,
    meetingId: safeTrim(get('meetingId')),
    password: safeTrim(get('password')),
    joinUrl: safeTrim(get('joinUrl')),
    contactInfo: safeTrim(get('contactInfo')) || safeTrim(submission?.sender_email),
    notes: safeTrim(get('notes')) || '',
    durationMinutes: parseDuration(get('durationMinutes')),
  };

  return rawMeeting;
}

function buildFieldAliases() {
  const overrides = loadFieldMapOverride();
  const merged = {};

  Object.entries(DEFAULT_FIELD_ALIASES).forEach(([key, aliases]) => {
    merged[key] = Array.from(new Set(aliases));
  });

  Object.entries(overrides).forEach(([key, value]) => {
    if (!merged[key]) {
      merged[key] = [];
    }

    const extraIdentifiers = Array.isArray(value) ? value : [value];
    extraIdentifiers
      .map((identifier) => `${identifier}`.trim())
      .filter(Boolean)
      .forEach((identifier) => {
        merged[key].push(identifier);
      });
  });

  // Normalize identifiers once up-front
  Object.keys(merged).forEach((key) => {
    merged[key] = merged[key]
      .map((identifier) => normalizeIdentifier(identifier))
      .filter(Boolean);
  });

  return merged;
}

function loadFieldMapOverride() {
  const raw = process.env.JOTFORM_FIELD_MAP;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (error) {
    console.warn('[Jotform] Failed to parse JOTFORM_FIELD_MAP JSON:', error.message);
  }

  return {};
}

function findAnswerByIdentifiers(answers, identifiers = []) {
  if (!answers || !identifiers.length) return undefined;

  const normalizedAnswers = Object.values(answers).map((answer) => ({
    original: answer,
    name: normalizeIdentifier(answer?.name),
    text: normalizeIdentifier(answer?.text),
    qid: normalizeIdentifier(answer?.qid),
  }));

  return normalizedAnswers.find(
    (answer) =>
      (answer.name && identifiers.includes(answer.name)) ||
      (answer.text && identifiers.includes(answer.text)) ||
      (answer.qid && identifiers.includes(answer.qid))
  )?.original;
}

function extractAnswerValue(answer) {
  if (!answer) return undefined;

  if (typeof answer.prettyFormat === 'string') {
    return answer.prettyFormat;
  }

  const value = answer.answer;

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return `${value}`;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item === null || item === undefined) return '';
        if (typeof item === 'string' || typeof item === 'number') return `${item}`;
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value === 'object') {
    if (typeof value.full === 'string') {
      return value.full;
    }

    return Object.values(value)
      .map((part) => (part === null || part === undefined ? '' : `${part}`))
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  return undefined;
}

function normalizeIdentifier(identifier) {
  if (identifier === undefined || identifier === null) return undefined;

  return `${identifier}`.toLowerCase().replace(/[^a-z0-9]/gi, '');
}

function safeTrim(value) {
  if (value === undefined || value === null) return undefined;
  const str = `${value}`.trim();
  return str.length ? str : undefined;
}

function parseDuration(value) {
  const parsed = parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 60;
}

module.exports = {
  transformSubmission,
};
