import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

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
function logAccess(line) {
  try {
    fs.appendFileSync(accessLogPath, line + '\n');
  } catch {}
}
function logTelemetry(enabled, event) {
  if (!enabled) return;
  try { fs.appendFileSync(telemetryLogPath, JSON.stringify({ ts: Date.now(), ...event }) + '\n'); } catch {}
}

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
function generateBabble() {
  const phonemes = ['ba', 'da', 'ga', 'ma', 'pa', 'ka', 'la'];
  const pick = phonemes[Math.floor(Math.random() * phonemes.length)];
  // limit to 1 token-ish
  return Math.random() < 0.7 ? pick : pick[0] + '-'+ pick[0];
}

function chooseSingleWord(vocabulary = []) {
  if (!vocabulary.length) return generateBabble();
  return vocabulary[Math.floor(Math.random() * vocabulary.length)].word;
}

function constrainResponse(input, state, vocabulary) {
  // Stage 0-1: babble
  if (state.level <= 1) {
    return { utterance_type: 'babble', output: generateBabble() };
  }
  // Stage 2-3: single word from known vocabulary
  if (state.level <= 3) {
    return { utterance_type: 'single_word', output: chooseSingleWord(vocabulary) };
  }
  // Stage 4+: unconstrained basic echo for now
  return { utterance_type: 'free', output: input.split(/\s+/).slice(0, 12).join(' ') };
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

  // Constrain response based on level
  const constrained = constrainResponse(message, state, vocabulary);

  // XP: standard typed user response
  const gained = addXp(state, 10);

  const userMsg = { id: nanoid(), role: 'user', text: message, ts: Date.now() };
  const palMsg = { id: nanoid(), role: 'pal', text: constrained.output, kind: constrained.utterance_type, ts: Date.now() };
  chatLog.push(userMsg, palMsg);

  saveCollections({ ...collections, chatLog, state });

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
