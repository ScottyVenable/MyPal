import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import util from 'util';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..', 'data');
const LOGS_DIR = process.env.LOGS_DIR ? path.resolve(process.env.LOGS_DIR) : path.join(__dirname, '..', '..', '..', 'logs');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

// Simple file logger
const accessLogPath = path.join(LOGS_DIR, 'access.log');
const telemetryLogPath = path.join(LOGS_DIR, 'telemetry.log');
const TELEMETRY_FORCE = process.env.MYPAL_FORCE_TELEMETRY === '1';
const consoleLogPath = path.join(LOGS_DIR, 'console.log');
const errorLogPath = path.join(LOGS_DIR, 'error.log');

function createStream(file) {
  try {
    return fs.createWriteStream(file, { flags: 'a' });
  } catch (err) {
    console.error('Failed to open log stream', file, err);
    return null;
  }
}

const consoleStream = createStream(consoleLogPath);
const errorStream = createStream(errorLogPath);

const formatArgs = (args) => args.map((arg) => typeof arg === 'string' ? arg : util.inspect(arg, { depth: null })).join(' ');

function writeLine(stream, level, line) {
  if (!stream) return;
  try {
    stream.write(`${new Date().toISOString()} [${level}] ${line}\n`);
  } catch {}
}

const originalLog = console.log.bind(console);
const originalInfo = console.info ? console.info.bind(console) : originalLog;
const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

console.log = (...args) => {
  const line = formatArgs(args);
  writeLine(consoleStream, 'LOG', line);
  originalLog(...args);
};

console.info = (...args) => {
  const line = formatArgs(args);
  writeLine(consoleStream, 'INFO', line);
  originalInfo(...args);
};

console.warn = (...args) => {
  const line = formatArgs(args);
  writeLine(consoleStream, 'WARN', line);
  originalWarn(...args);
};

console.error = (...args) => {
  const line = formatArgs(args);
  writeLine(consoleStream, 'ERROR', line);
  writeLine(errorStream, 'ERROR', line);
  originalError(...args);
};

function closeLogStreams() {
  [consoleStream, errorStream].forEach((stream) => {
    if (!stream) return;
    try { stream.end(); } catch {}
  });
}

process.once('exit', closeLogStreams);
['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.once(signal, () => {
    closeLogStreams();
    process.exit(0);
  });
});
function logAccess(line) {
  try {
    fs.appendFileSync(accessLogPath, line + '\n');
  } catch {}
}
function logTelemetry(enabled, event) {
  if (!enabled && !TELEMETRY_FORCE) return;
  try { fs.appendFileSync(telemetryLogPath, JSON.stringify({ ts: Date.now(), ...event }) + '\n'); } catch {}
}

const MAX_VOCAB_SIZE = 500;

const defaultState = {
  level: 0,
  xp: 0,
  cp: 0,
  settings: { xpMultiplier: 1, apiProvider: 'local', apiKeyMask: null },
  personality: { curious: 10, logical: 10, social: 10, agreeable: 10, cautious: 10 },
  vocabulary: [], // quick cache of words
};

const files = {
  state: path.join(DATA_DIR, 'state.json'),
  users: path.join(DATA_DIR, 'users.json'),
  sessions: path.join(DATA_DIR, 'sessions.json'),
  vocabulary: path.join(DATA_DIR, 'vocabulary.json'),
  concepts: path.join(DATA_DIR, 'concepts.json'),
  facts: path.join(DATA_DIR, 'facts.json'),
  memories: path.join(DATA_DIR, 'memories.json'),
  chatLog: path.join(DATA_DIR, 'chatlog.json'),
};

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const text = fs.readFileSync(file, 'utf8');
    return JSON.parse(text || 'null') ?? fallback;
  } catch (e) {
    console.error('readJson error', file, e);
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// Secrets storage (separate from state)
const secretsFile = path.join(DATA_DIR, 'secrets.json');
function readSecrets() {
  return readJson(secretsFile, {});
}
function writeSecrets(data) {
  writeJson(secretsFile, data);
}

function loadState() {
  const state = readJson(files.state, defaultState);
  // ensure defaults
  return { ...defaultState, ...state, settings: { ...defaultState.settings, ...(state.settings || {}) } };
}

function saveState(state) {
  writeJson(files.state, state);
}

function getCollections() {
  const state = loadState();
  const users = readJson(files.users, []);
  const sessions = readJson(files.sessions, []);
  const vocabulary = readJson(files.vocabulary, []);
  const concepts = readJson(files.concepts, []);
  const facts = readJson(files.facts, []);
  const memories = readJson(files.memories, []);
  const chatLog = readJson(files.chatLog, []);
  return { state, users, sessions, vocabulary, concepts, facts, memories, chatLog };
}

function saveCollections({ state, users, sessions, vocabulary, concepts, facts, memories, chatLog }) {
  saveState(state);
  writeJson(files.users, users ?? readJson(files.users, []));
  writeJson(files.sessions, sessions ?? readJson(files.sessions, []));
  writeJson(files.vocabulary, vocabulary);
  writeJson(files.concepts, concepts);
  writeJson(files.facts, facts);
  writeJson(files.memories, memories);
  writeJson(files.chatLog, chatLog);
}

// XP/Level logic (simple thresholds)
function thresholdsFor(level) {
  // return cumulative XP required to reach next level
  if (level === 0) return 100;
  if (level === 1) return 400;
  if (level === 2) return 1000;
  return 9999999;
}

function addXp(state, rawXp) {
  const mult = state.settings?.xpMultiplier ?? 1;
  const gained = Math.floor(rawXp * mult);
  state.xp += gained;
  state.cp = Math.floor(state.xp / 100);
  // Level up loop
  while (state.xp >= thresholdsFor(state.level)) {
    state.level += 1;
  }
  return gained;
}

// Persona-constrained generation (Stage 0-1)
const earlyPhrases = [
  'me good',
  'me ok',
  'me happy',
  'me sleepy',
  'me hungry',
  'me eat yummys',
  'me want hug',
  'me listen',
  'me learn',
  'me try',
  'you good?',
  'you sad?',
  'you smile?',
  'we play?',
  'friend nice',
  'small talk',
  'soft words',
  'tiny steps',
  'me copy',
  'me think'
];

function generatePrimitivePhrase() {
  return earlyPhrases[Math.floor(Math.random() * earlyPhrases.length)];
}

function tokenizeMessage(text) {
  return (String(text || '').toLowerCase().match(/[a-z]{2,}/g) || []).slice(0, 40);
}

function learnVocabulary(vocabulary, words, source, context) {
  if (!words.length) return vocabulary;
  const now = Date.now();
  for (const word of words) {
    let entry = vocabulary.find((item) => item.word === word);
    if (!entry) {
      entry = {
        id: nanoid(),
        word,
        count: 0,
        knownBy: { user: 0, pal: 0 },
        lastSeen: now,
        contexts: [],
      };
      vocabulary.push(entry);
    }
    entry.count += 1;
    if (!entry.knownBy) entry.knownBy = { user: 0, pal: 0 };
    entry.knownBy[source] = (entry.knownBy[source] || 0) + 1;
    entry.lastSeen = now;
    if (context) {
      entry.contexts = entry.contexts || [];
      entry.contexts.unshift(context.slice(0, 120));
      if (entry.contexts.length > 5) entry.contexts.length = 5;
    }
  }
  if (vocabulary.length > MAX_VOCAB_SIZE) {
    vocabulary.sort((a, b) => (b.count || 0) - (a.count || 0));
    vocabulary.length = MAX_VOCAB_SIZE;
  }
  return vocabulary;
}

function chooseSingleWord(vocabulary = []) {
  if (!vocabulary.length) return generatePrimitivePhrase();
  const totalWeight = vocabulary.reduce((sum, entry) => sum + (entry.count || 1), 0) || vocabulary.length;
  let roll = Math.random() * totalWeight;
  for (const entry of vocabulary) {
    roll -= entry.count || 1;
    if (roll <= 0) return entry.word;
  }
  return vocabulary[0].word;
}

function capitalize(word = '') {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function composeLearnedPhrase(vocabulary = [], fallback = '') {
  if (!vocabulary.length) return fallback || generatePrimitivePhrase();
  const sorted = [...vocabulary]
    .filter((entry) => entry.word && entry.word.length >= 2)
    .sort((a, b) => (b.count || 0) - (a.count || 0) || (b.lastSeen || 0) - (a.lastSeen || 0));
  const primary = sorted[0]?.word;
  const secondary = sorted[1]?.word;
  if (primary && secondary) {
    return `${capitalize(primary)} ${secondary} together.`;
  }
  if (primary) {
    return `I remember ${primary}.`;
  }
  return fallback || generatePrimitivePhrase();
}

function constrainResponse(input, state, vocabulary) {
  // Stage 0-1: babble
  if (state.level <= 1) {
    return { utterance_type: 'primitive_phrase', output: generatePrimitivePhrase() };
  }
  // Stage 2-3: single word from known vocabulary
  if (state.level <= 3) {
    return { utterance_type: 'single_word', output: chooseSingleWord(vocabulary) };
  }
  // Stage 4+: unconstrained basic echo for now
  return { utterance_type: 'free', output: composeLearnedPhrase(vocabulary, input.split(/\s+/).slice(0, 12).join(' ')) };
}

function updatePersonalityFromInteraction(state, userText) {
  const t = userText.toLowerCase();
  if (/[?]/.test(userText)) state.personality.curious += 1;
  if (/(because|why|if|then)/.test(t)) state.personality.logical += 1;
  if (/(hi|hello|thanks|thank you|bye)/.test(t)) state.personality.social += 1;
  if (/(good job|great|nice|love|like)/.test(t)) state.personality.agreeable += 1;
  if (/(no|wrong|bad|hate|don\'t)/.test(t)) state.personality.cautious += 1;
  // clamp 0-100
  for (const k of Object.keys(state.personality)) {
    state.personality[k] = Math.max(0, Math.min(100, state.personality[k]));
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    logAccess(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
});

app.get('/api/health', (req, res) => {
  const { state } = getCollections();
  logTelemetry(!!state.settings?.telemetry, { type: 'health', uptime: process.uptime() });
  res.json({ ok: true, uptime: process.uptime() });
});

// --- Auth helpers and middleware
function nowSec() { return Math.floor(Date.now() / 1000); }
function tidySessions(sessions) {
  const t = nowSec();
  return sessions.filter(s => (s.exp || 0) > t);
}
function makeToken() { return nanoid(32); }
function withAuth(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) { req.user = null; return next(); }
  const { sessions, users } = getCollections();
  const active = tidySessions(sessions);
  const s = active.find(x => x.token === token);
  if (!s) { req.user = null; return next(); }
  const user = users.find(u => u.username === s.username) || null;
  req.user = user ? { username: user.username, role: user.role || 'user' } : null;
  // persist session cleanup occasionally
  if (active.length !== sessions.length) {
    saveCollections({ ...getCollections(), sessions: active });
  }
  return next();
}
app.use(withAuth);

app.get('/api/stats', (req, res) => {
  const { state, vocabulary } = getCollections();
  res.json({
    level: state.level,
    xp: state.xp,
    cp: state.cp,
    settings: state.settings,
    personality: state.personality,
    vocabSize: vocabulary.length,
  });
});

app.post('/api/settings', (req, res) => {
  const { state } = getCollections();
  const { xpMultiplier, apiProvider, apiKey, telemetry, authRequired } = req.body || {};
  if (typeof xpMultiplier === 'number' && xpMultiplier > 0 && xpMultiplier <= 250) {
    state.settings.xpMultiplier = xpMultiplier;
  }
  if (typeof apiProvider === 'string' && ['local','openai','azure','gemini'].includes(apiProvider)) {
    state.settings.apiProvider = apiProvider;
  }
  if (typeof telemetry === 'boolean') {
    state.settings.telemetry = telemetry;
  }
  if (typeof authRequired === 'boolean') {
    state.settings.authRequired = authRequired;
  }
  if (typeof apiKey === 'string' && apiKey.length > 0) {
    const secrets = readSecrets();
    secrets.apiKey = apiKey;
    writeSecrets(secrets);
    // Mask stored in state for UI only
    state.settings.apiKeyMask = `${'*'.repeat(Math.max(0, apiKey.length - 4))}${apiKey.slice(-4)}`;
  }
  saveState(state);
  res.json({ settings: state.settings });
});

// --- Auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const collections = getCollections();
  const { users, sessions } = collections;
  if (users.find(u => u.username === username)) return res.status(409).json({ error: 'user exists' });
  const hash = bcrypt.hashSync(String(password), 10);
  const user = { username, passwordHash: hash, role: users.length ? 'user' : 'admin', createdAt: Date.now() };
  users.push(user);
  const token = makeToken();
  const exp = nowSec() + 60 * 60 * 24 * 14; // 14 days
  sessions.push({ token, username, exp });
  saveCollections({ ...collections, users, sessions });
  res.json({ token, user: { username: user.username, role: user.role } });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const collections = getCollections();
  const { users, sessions } = collections;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const ok = bcrypt.compareSync(String(password || ''), user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  const token = makeToken();
  const exp = nowSec() + 60 * 60 * 24 * 14;
  sessions.push({ token, username, exp });
  saveCollections({ ...collections, sessions: tidySessions(sessions) });
  res.json({ token, user: { username: user.username, role: user.role || 'user' } });
});

app.post('/api/auth/logout', (req, res) => {
  const { sessions } = getCollections();
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const next = tidySessions(sessions).filter(s => s.token !== token);
  saveCollections({ ...getCollections(), sessions: next });
  res.json({ ok: true });
});

app.post('/api/chat', (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message required' });

  const collections = getCollections();
  const { state, vocabulary, chatLog } = collections;

  // Update personality heuristics from user input
  updatePersonalityFromInteraction(state, message);

  // Learn vocabulary from user input
  const userWords = tokenizeMessage(message);
  learnVocabulary(vocabulary, userWords, 'user', message);

  // Constrain response based on level
  const constrained = constrainResponse(message, state, vocabulary);

  // XP: standard typed user response
  const gained = addXp(state, 10);

  const userMsg = { id: nanoid(), role: 'user', text: message, ts: Date.now() };
  const palMsg = { id: nanoid(), role: 'pal', text: constrained.output, kind: constrained.utterance_type, ts: Date.now() };
  chatLog.push(userMsg, palMsg);

  // Learn from pal's own utterance to reinforce known vocabulary
  const palWords = tokenizeMessage(constrained.output);
  learnVocabulary(vocabulary, palWords, 'pal', constrained.output);

  const summarized = [...vocabulary]
    .sort((a, b) => (b.count || 0) - (a.count || 0) || (b.lastSeen || 0) - (a.lastSeen || 0))
    .slice(0, 40)
    .map((entry) => entry.word);
  state.vocabulary = summarized;

  saveCollections({ ...collections, chatLog, state, vocabulary });

  res.json({ reply: palMsg.text, kind: constrained.utterance_type, xpGained: gained, level: state.level });
});

app.post('/api/reinforce', (req, res) => {
  const collections = getCollections();
  const { state } = collections;
  const gained = addXp(state, 25);
  saveCollections(collections);
  res.json({ xpGained: gained, level: state.level });
});

app.post('/api/reset', (req, res) => {
  const { state } = getCollections();
  if (state.settings?.authRequired && !req.user) return res.status(401).json({ error: 'auth required' });
  // wipe files
  for (const f of Object.values(files)) {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
  }
  // recreate default state
  saveState(defaultState);
  res.json({ ok: true });
});

app.get('/api/export', (req, res) => {
  const { state } = getCollections();
  if (state.settings?.authRequired && !req.user) return res.status(401).json({ error: 'auth required' });
  const data = getCollections();
  res.setHeader('Content-Disposition', 'attachment; filename="pal_memory.json"');
  res.json(data);
});

// Issue/content report endpoint (stores locally)
app.post('/api/report', (req, res) => {
  const { type = 'general', message = '' } = req.body || {};
  const file = path.join(DATA_DIR, 'reports.json');
  const reports = readJson(file, []);
  const entry = { id: nanoid(), ts: Date.now(), type, message: String(message).slice(0, 5000) };
  reports.push(entry);
  writeJson(file, reports);
  const { state } = getCollections();
  logTelemetry(!!state.settings?.telemetry, { type: 'report', id: entry.id, reportType: type });
  res.json({ ok: true, id: entry.id });
});

// Telemetry endpoint (local append only)
app.post('/api/telemetry', (req, res) => {
  const { state } = getCollections();
  if (!state.settings?.telemetry) return res.status(202).json({ ok: false, reason: 'disabled' });
  const payload = req.body || {};
  logTelemetry(true, { type: 'client', payload });
  res.json({ ok: true });
});

// Serve frontend in sibling folder if built
const FRONTEND_DIR = path.join(__dirname, '..', 'public');
if (fs.existsSync(FRONTEND_DIR)) {
  app.use(express.static(FRONTEND_DIR));
}

// Models directory and listing endpoint (scaffolding)
const MODELS_DIR = process.env.MODELS_DIR ? path.resolve(process.env.MODELS_DIR) : path.join(__dirname, '..', 'models');
if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });
app.get('/api/models', (req, res) => {
  const files = fs.readdirSync(MODELS_DIR).filter(f => !f.startsWith('.'));
  res.json({ dir: MODELS_DIR, models: files });
});

// Plugin scaffolding: list + enable/disable
const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');
if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true });
const pluginsStateFile = path.join(DATA_DIR, 'plugins.json');
function readPluginsState() { return readJson(pluginsStateFile, { enabled: {} }); }
function writePluginsState(s) { writeJson(pluginsStateFile, s); }
function discoverPlugins() {
  const entries = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
  const state = readPluginsState();
  const list = [];
  for (const dir of entries) {
    const name = dir.name;
    const manifestPath = path.join(PLUGINS_DIR, name, 'plugin.json');
    let manifest = { name, version: '0.0.0' };
    if (fs.existsSync(manifestPath)) {
      try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch {}
    }
    list.push({ name, version: manifest.version || '0.0.0', enabled: !!state.enabled[name] });
  }
  return list;
}
app.get('/api/plugins', (req, res) => {
  res.json({ plugins: discoverPlugins() });
});
app.post('/api/plugins/:name/toggle', (req, res) => {
  const name = req.params.name;
  const state = readPluginsState();
  state.enabled[name] = !state.enabled[name];
  writePluginsState(state);
  res.json({ name, enabled: !!state.enabled[name] });
});

// Brain graph: derive simple co-occurrence network from chat log
app.get('/api/brain', (req, res) => {
  const { chatLog } = getCollections();
  const maxMsgs = 300; // cap for performance
  const logs = chatLog.slice(-maxMsgs);
  const freq = new Map();
  const edges = new Map(); // key: a|b sorted
  const wordRegex = /[a-zA-Z]{2,}/g;

  function tokenize(t) {
    const m = String(t || '').toLowerCase().match(wordRegex);
    if (!m) return [];
    // de-duplicate within message to reduce heavy cliques
    return Array.from(new Set(m.slice(0, 25)));
  }

  for (const m of logs) {
    const words = tokenize(m.text);
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < words.length; j++) {
        const a = words[i], b = words[j];
        const [x, y] = a < b ? [a, b] : [b, a];
        const key = x + '|' + y;
        edges.set(key, (edges.get(key) || 0) + 1);
      }
    }
  }

  // Select top words
  const topWords = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([w]) => w);
  const wordSet = new Set(topWords);

  const nodes = topWords.map((w) => ({ id: w, label: w, value: freq.get(w) || 1, group: 'language' }));
  const links = [];
  for (const [key, weight] of edges.entries()) {
    const [a, b] = key.split('|');
    if (wordSet.has(a) && wordSet.has(b) && weight >= 2) {
      links.push({ from: a, to: b, value: weight });
    }
  }
  res.json({ nodes, links });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`MyPal backend listening on http://localhost:${PORT}`));
