import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const LOGS_DIR = path.join(__dirname, '..', '..', '..', 'logs');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

// Simple file logger
const accessLogPath = path.join(LOGS_DIR, 'access.log');
function logAccess(line) {
  try {
    fs.appendFileSync(accessLogPath, line + '\n');
  } catch {}
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
  const vocabulary = readJson(files.vocabulary, []);
  const concepts = readJson(files.concepts, []);
  const facts = readJson(files.facts, []);
  const memories = readJson(files.memories, []);
  const chatLog = readJson(files.chatLog, []);
  return { state, vocabulary, concepts, facts, memories, chatLog };
}

function saveCollections({ state, vocabulary, concepts, facts, memories, chatLog }) {
  saveState(state);
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
  res.json({ ok: true, uptime: process.uptime() });
});

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
  const { xpMultiplier, apiProvider, apiKey } = req.body || {};
  if (typeof xpMultiplier === 'number' && xpMultiplier > 0 && xpMultiplier <= 250) {
    state.settings.xpMultiplier = xpMultiplier;
  }
  if (typeof apiProvider === 'string' && ['local','openai','azure','gemini'].includes(apiProvider)) {
    state.settings.apiProvider = apiProvider;
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
  // wipe files
  for (const f of Object.values(files)) {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
  }
  // recreate default state
  saveState(defaultState);
  res.json({ ok: true });
});

app.get('/api/export', (req, res) => {
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
  res.json({ ok: true, id: entry.id });
});

// Serve frontend in sibling folder if built
const FRONTEND_DIR = path.join(__dirname, '..', 'public');
if (fs.existsSync(FRONTEND_DIR)) {
  app.use(express.static(FRONTEND_DIR));
}

// Models directory and listing endpoint (scaffolding)
const MODELS_DIR = process.env.MODELS_DIR || path.join(__dirname, '..', 'models');
if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });
app.get('/api/models', (req, res) => {
  const files = fs.readdirSync(MODELS_DIR).filter(f => !f.startsWith('.'));
  res.json({ dir: MODELS_DIR, models: files });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`MyPal backend listening on http://localhost:${PORT}`));
