/**
 * logger.js — Structured, ANSI-colored logging module for MyPal backend.
 *
 * Features:
 *  - Four log levels: DEBUG < INFO < WARN < ERROR
 *  - Color-coded terminal output when stdout is a TTY
 *  - Simultaneous file output to logs/app.log and logs/error.log
 *  - Optional per-call data payload (inspected inline)
 *
 * Configuration:
 *  MYPAL_LOG_LEVEL=DEBUG|INFO|WARN|ERROR   (default: INFO)
 *  NO_COLOR=1                              (disable ANSI colors)
 *
 * Usage:
 *  import logger from './logger.js';
 *  logger.info ('SERVER', 'Listening on port 3001');
 *  logger.warn ('PORT',   'Port 3001 in use, trying 3002');
 *  logger.error('FATAL',  'Could not bind to any port', { tried: [3001] });
 *  logger.debug('AI',     'Prompt tokens', { count: 512 });
 */

import fs   from 'fs';
import path from 'path';
import util from 'util';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Log levels ─────────────────────────────────────────────────────────────────
const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

const LEVEL_PAD = {      // 5 chars wide for alignment
  0: 'DEBUG',
  1: 'INFO ',
  2: 'WARN ',
  3: 'ERROR',
};

const LEVEL_STR    = (process.env.MYPAL_LOG_LEVEL || 'INFO').trim().toUpperCase();
const CURRENT_LVLNUM = LEVELS[LEVEL_STR] ?? LEVELS.INFO;

// ── ANSI colors ────────────────────────────────────────────────────────────────
const USE_COLOR = !process.env.NO_COLOR && !!process.stdout.isTTY;

const C = USE_COLOR
  ? {
      reset : '\x1b[0m',
      dim   : '\x1b[2m',
      DEBUG : '\x1b[90m',  // gray
      INFO  : '\x1b[36m',  // cyan
      WARN  : '\x1b[33m',  // yellow
      ERROR : '\x1b[31m',  // red + bold
      cat   : '\x1b[35m',  // magenta for category
      msg   : '\x1b[0m',   // default for message
    }
  : {
      reset: '', dim: '', DEBUG: '', INFO: '', WARN: '', ERROR: '', cat: '', msg: '',
    };

// ── File streams ───────────────────────────────────────────────────────────────
const LOGS_DIR = process.env.MYPAL_LOGS_DIR
  ? path.resolve(process.env.MYPAL_LOGS_DIR)
  : path.join(__dirname, '..', '..', '..', 'logs');

let appStream   = null;
let errStream   = null;

function openStreams() {
  try {
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
    appStream = fs.createWriteStream(path.join(LOGS_DIR, 'app.log'),   { flags: 'a' });
    errStream = fs.createWriteStream(path.join(LOGS_DIR, 'error.log'), { flags: 'a' });
  } catch (e) {
    // File logging unavailable — terminal-only mode
  }
}

openStreams();

process.once('exit', () => {
  for (const s of [appStream, errStream]) {
    try { s?.end(); } catch {}
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function timestamp() {
  const d = new Date();
  return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function isoTs() {
  return new Date().toISOString();
}

function serializeData(data) {
  if (data === undefined || data === null) return '';
  if (typeof data === 'string') return ' ' + data;
  return ' ' + util.inspect(data, { depth: 4, breakLength: Infinity, compact: true, colors: false });
}

function padCategory(cat) {
  return String(cat || '').toUpperCase().slice(0, 14).padEnd(14);
}

// ── Core emit ──────────────────────────────────────────────────────────────────
function emit(levelNum, category, message, data) {
  if (levelNum < CURRENT_LVLNUM) return;

  const label   = LEVEL_PAD[levelNum];     // e.g. 'INFO '
  const key     = label.trim();            // e.g. 'INFO'
  const cat     = padCategory(category);
  const suffix  = serializeData(data);
  const ts      = timestamp();

  // ── Console line (colored) ──────────────────────────────────────────────────
  const consoleLine = USE_COLOR
    ? `${C.dim}[${ts}]${C.reset} ${C[key]}[${label}]${C.reset} ${C.cat}[${cat}]${C.reset} ${message}${suffix}`
    : `[${ts}] [${label}] [${cat}] ${message}${suffix}`;

  // ── File line (plain, ISO timestamp) ───────────────────────────────────────
  const fileLine = `${isoTs()} [${label}] [${cat}] ${message}${suffix}\n`;

  if (levelNum >= LEVELS.ERROR) {
    process.stderr.write(consoleLine + '\n');
    try { errStream?.write(fileLine); } catch {}
  } else if (levelNum >= LEVELS.WARN) {
    process.stderr.write(consoleLine + '\n');
  } else {
    process.stdout.write(consoleLine + '\n');
  }

  try { appStream?.write(fileLine); } catch {}
}

// ── Public API ─────────────────────────────────────────────────────────────────
const logger = {
  debug : (cat, msg, data) => emit(LEVELS.DEBUG, cat, msg, data),
  info  : (cat, msg, data) => emit(LEVELS.INFO,  cat, msg, data),
  warn  : (cat, msg, data) => emit(LEVELS.WARN,  cat, msg, data),
  error : (cat, msg, data) => emit(LEVELS.ERROR, cat, msg, data),

  /** Current numeric level threshold */
  currentLevel : CURRENT_LVLNUM,
  /** Level constants for external comparisons */
  LEVELS,
};

export default logger;
