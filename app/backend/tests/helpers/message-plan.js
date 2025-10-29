import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const DEFAULT_MESSAGE_POOL = [
  'Hello Pal! How are you feeling today?',
  'What are you thinking about right now?',
  'Tell me something inspiring, please.',
  'Can you recall a favorite memory?',
  'What should we focus on improving next?',
  'Share a quick status update with me.',
  'Is there anything you need from me today?',
  'Let us plan something fun together!'
];

let cachedPlan = null;
let cachedCount = null;

function parseCount(inputValue) {
  if (!inputValue) return null;
  const trimmed = String(inputValue).trim();
  if (!trimmed) return null;

  // Allow comma separated list to define explicit messages
  if (trimmed.includes(',') && !Number.isInteger(Number.parseInt(trimmed, 10))) {
    const parts = trimmed
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (parts.length > 0) {
      return parts;
    }
  }

  // Allow JSON array of messages
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, index) => {
          if (item === null || item === undefined) {
            return `Automated test message #${index + 1}`;
          }
          return String(item);
        });
      }
    } catch {
      // Ignore JSON parse errors and fall back to numeric parsing
    }
  }

  const numeric = Number.parseInt(trimmed, 10);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }
  return null;
}

function buildMessageList(count) {
  const safeCount = Math.max(1, Math.min(count, 32));
  const messages = [];
  for (let i = 0; i < safeCount; i += 1) {
    if (i < DEFAULT_MESSAGE_POOL.length) {
      messages.push(DEFAULT_MESSAGE_POOL[i]);
    } else {
      messages.push(`Automated test message #${i + 1}`);
    }
  }
  return messages;
}

async function promptForCount({ label, defaultCount }) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return defaultCount;
  }

  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(
      `\n[MyPal Tests] How many ${label} messages should be sent during this run? (default ${defaultCount}): `
    );
    const parsed = parseCount(answer);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (typeof parsed === 'number') {
      return parsed;
    }
    return defaultCount;
  } finally {
    await rl.close();
  }
}

export async function resolveMessagePlan({ label = 'chat', defaultCount = 2 } = {}) {
  if (Array.isArray(cachedPlan)) {
    return cachedPlan.slice();
  }

  const envValue = process.env.MYPAL_TEST_MESSAGES;
  let parsedEnv = parseCount(envValue);
  if (parsedEnv === null) {
    parsedEnv = await promptForCount({ label, defaultCount });
  }

  let plan;
  if (Array.isArray(parsedEnv)) {
    plan = parsedEnv;
    cachedCount = plan.length;
  } else {
    const count = typeof parsedEnv === 'number' ? parsedEnv : defaultCount;
    cachedCount = count;
    plan = buildMessageList(count);
  }

  cachedPlan = plan.slice();
  return plan.slice();
}

export function getCachedMessageCount() {
  return cachedCount ?? null;
}
