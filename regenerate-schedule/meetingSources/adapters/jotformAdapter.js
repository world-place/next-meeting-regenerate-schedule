/**
 * Jotform Meeting Source Adapter
 *
 * Fetches submissions from one or more Jotform forms and normalizes them
 * into the project's raw meeting format via a configurable transformer.
 *
 * Required env vars:
 * - JOTFORM_API_KEY
 *
 * Optional env vars:
 * - JOTFORM_BASE_URL (defaults to https://api.jotform.com)
 * - JOTFORM_FORM_IDS (comma separated list; can also be passed as sourceId)
 * - JOTFORM_PAGE_SIZE (pagination limit, default 200)
 * - JOTFORM_RATE_LIMIT_PER_DAY (only logged for operators)
 * - JOTFORM_TRANSFORMER_PATH (path to custom transformer module)
 */

require('isomorphic-fetch');
const path = require('path');

const DEFAULT_BASE_URL = 'https://api.jotform.com';
const DEFAULT_PAGE_SIZE = Number(process.env.JOTFORM_PAGE_SIZE) || 200;

let transformerFn;

/**
 * Fetch meetings from one or more Jotform forms.
 *
 * @param {string|string[]} sourceId - Optional override for JOTFORM_FORM_IDS.
 * @returns {Promise<RawMeeting[]>}
 */
async function fetchMeetings(sourceId) {
  const apiKey = process.env.JOTFORM_API_KEY;

  if (!apiKey) {
    throw new Error('JOTFORM_API_KEY is required to use the Jotform adapter');
  }

  const formIds = resolveFormIds(sourceId);

  if (!formIds.length) {
    throw new Error('No Jotform form IDs provided. Set JOTFORM_FORM_IDS or pass a comma-separated sourceId.');
  }

  if (process.env.JOTFORM_RATE_LIMIT_PER_DAY) {
    console.log(`[Jotform] Operator rate limit (per day): ${process.env.JOTFORM_RATE_LIMIT_PER_DAY}`);
  }

  const transformer = getTransformer();
  const meetings = [];

  for (const formId of formIds) {
    const submissions = await fetchAllSubmissions(formId, apiKey);
    console.log(`[Jotform] Form ${formId} returned ${submissions.length} submissions`);

    submissions.forEach((submission) => {
      try {
        const normalized = transformer(submission, {
          formId,
          formTitle: submission?.form_title,
          submissionId: submission?.id,
        });

        if (Array.isArray(normalized)) {
          normalized.filter(Boolean).forEach((meeting) => meetings.push(meeting));
        } else if (normalized) {
          meetings.push(normalized);
        }
      } catch (error) {
        console.error(`[Jotform] Failed to transform submission ${submission?.id || 'unknown'}: ${error.message}`);
      }
    });
  }

  console.log(`[Jotform] Total meetings after normalization: ${meetings.length}`);

  return meetings;
}

function resolveFormIds(sourceId) {
  if (Array.isArray(sourceId)) {
    return sourceId.map((id) => `${id}`.trim()).filter(Boolean);
  }

  if (typeof sourceId === 'string' && sourceId.trim()) {
    return sourceId.split(',').map((id) => id.trim()).filter(Boolean);
  }

  if (process.env.JOTFORM_FORM_IDS) {
    return process.env.JOTFORM_FORM_IDS.split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  return [];
}

async function fetchAllSubmissions(formId, apiKey) {
  const baseUrl = process.env.JOTFORM_BASE_URL || DEFAULT_BASE_URL;
  const submissions = [];
  let offset = 0;

  while (true) {
    const page = await fetchSubmissionPage({
      baseUrl,
      apiKey,
      formId,
      offset,
      limit: DEFAULT_PAGE_SIZE,
    });

    submissions.push(...page.content);

    if (page.content.length < DEFAULT_PAGE_SIZE) {
      break;
    }

    if (page.resultSet) {
      const { count = page.content.length, offset: resultOffset = offset, total } = page.resultSet;
      if (typeof total === 'number' && resultOffset + count >= total) {
        break;
      }
    }

    offset += DEFAULT_PAGE_SIZE;
  }

  return submissions;
}

async function fetchSubmissionPage({ baseUrl, apiKey, formId, offset, limit }) {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/form/${formId}/submissions`);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('offset', offset.toString());
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('orderby', 'created_at');

  const response = await fetch(url.toString());

  if (!response.ok) {
    const message = await safeReadResponse(response);
    throw new Error(`Jotform API ${response.status} ${response.statusText}: ${message}`);
  }

  const payload = await response.json();

  return {
    content: payload?.content || [],
    resultSet: payload?.resultSet || payload?.resultset,
  };
}

async function safeReadResponse(response) {
  try {
    const text = await response.text();
    return text.slice(0, 200);
  } catch {
    return '';
  }
}

function getTransformer() {
  if (transformerFn) return transformerFn;

  const customPath = process.env.JOTFORM_TRANSFORMER_PATH;
  if (customPath) {
    const resolved = path.isAbsolute(customPath)
      ? customPath
      : path.join(process.cwd(), customPath);
    console.log(`[Jotform] Using custom transformer from ${resolved}`);
    transformerFn = require(resolved);
  } else {
    transformerFn = require('./jotform/defaultTransformer');
  }

  if (transformerFn && typeof transformerFn.transformSubmission === 'function') {
    transformerFn = transformerFn.transformSubmission;
  }

  if (typeof transformerFn !== 'function') {
    throw new Error('Jotform transformer must export a function or { transformSubmission }');
  }

  return transformerFn;
}

async function testConnection() {
  try {
    const apiKey = process.env.JOTFORM_API_KEY;
    if (!apiKey) {
      console.error('[Jotform] Missing JOTFORM_API_KEY');
      return false;
    }

    const formIds = resolveFormIds();
    if (formIds.length === 0) {
      console.log('[Jotform] No form IDs configured yet; attempting to list forms');
      await listForms(apiKey);
      return true;
    }

    await fetchAllSubmissions(formIds[0], apiKey);
    console.log(`[Jotform] Connection successful for form ${formIds[0]}`);
    return true;
  } catch (error) {
    console.error('[Jotform] Connection test failed:', error.message);
    return false;
  }
}

async function listForms(apiKey) {
  const baseUrl = process.env.JOTFORM_BASE_URL || DEFAULT_BASE_URL;
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/user/forms`);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('limit', '1');

  const response = await fetch(url.toString());
  if (!response.ok) {
    const message = await safeReadResponse(response);
    throw new Error(`Jotform API ${response.status} ${response.statusText}: ${message}`);
  }

  return response.json();
}

module.exports = {
  fetchMeetings,
  testConnection,
  name: 'Jotform',
};
