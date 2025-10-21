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
const DATA_DIR = process.env.MYPAL_DATA_DIR || process.env.DATA_DIR ? path.resolve(process.env.MYPAL_DATA_DIR || process.env.DATA_DIR) : path.join(__dirname, '..', 'data');
const LOGS_DIR = process.env.MYPAL_LOGS_DIR || process.env.LOGS_DIR ? path.resolve(process.env.MYPAL_LOGS_DIR || process.env.LOGS_DIR) : path.join(__dirname, '..', '..', '..', 'logs');

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
let logsClosed = false;

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
  if (logsClosed) return;
  logsClosed = true;
  [consoleStream, errorStream].forEach((stream) => {
    if (!stream) return;
    try { stream.end(); } catch {}
  });
}

process.once('exit', closeLogStreams);
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
const MAX_MEMORIES = 500;
const MAX_CHAT_LOG_ENTRIES = 1000;
const MAX_JOURNAL_ENTRIES = 400;

const MEMORY_TEMPLATE = Object.freeze({
  id: '',
  ts: 0,
  userText: '',
  palText: '',
  summary: '',
  sentiment: 'neutral',
  keywords: [],
  xp: { gained: 0, total: 0, level: 0 },
  importance: { score: 0, level: 'low', shouldRemember: false, reasons: [] },
  tags: []
});

const stopWords = new Set([
  'i','me','my','mine','you','your','yours','we','us','our','ours','they','them','their','theirs',
  'a','an','the','and','or','but','if','then','else','for','of','in','on','at','to','with','from','by','about','as',
  'is','am','are','was','were','be','been','being','do','does','did','have','has','had','will','would','should','could',
  'can','may','might','this','that','these','those','here','there','it','its','so','very','just','really','also','too',
  'please','thank','thanks','hey','hi','hello','ok','okay','fine','hmm','uh','um','oh','yeah','yup','no','not','dont','didnt','cant'
]);

const CONCEPT_HINT_SETS = [
  { category: 'Emotion', name: 'Emotion', keywords: ['happy','sad','angry','mad','excited','calm','scared','afraid','worried','lonely','bored','laugh','cry'] },
  { category: 'Need', name: 'Needs & Comfort', keywords: ['hungry','thirsty','sleepy','tired','rest','food','drink','water','hug','safe','warm'] },
  { category: 'Social', name: 'Social Bonds', keywords: ['friend','together','play','share','talk','listen','team','we','us','family'] },
  { category: 'Learning', name: 'Learning & Curiosity', keywords: ['learn','teach','remember','think','why','how','idea','question','study','book'] },
  { category: 'Growth', name: 'Growth & Progress', keywords: ['level','grow','improve','practice','try','progress','step','goal'] },
  { category: 'Care', name: 'Care & Support', keywords: ['help','support','protect','care','kind','gentle','love','trust'] },
];

const KEYWORD_TO_CONCEPT = new Map();
for (const entry of CONCEPT_HINT_SETS) {
  for (const word of entry.keywords) {
    KEYWORD_TO_CONCEPT.set(word, entry);
  }
}

const defaultState = {
  level: 0,
  xp: 0,
  cp: 0,
  settings: { xpMultiplier: 1, apiProvider: 'local', apiKeyMask: null },
  personality: { curious: 10, logical: 10, social: 10, agreeable: 10, cautious: 10 },
  vocabulary: [], // quick cache of top learned words
};

const files = {
  state: path.join(DATA_DIR, 'state.json'),
  users: path.join(DATA_DIR, 'users.json'),
  sessions: path.join(DATA_DIR, 'sessions.json'),
  vocabulary: path.join(DATA_DIR, 'vocabulary.json'),
  concepts: path.join(DATA_DIR, 'concepts.json'),
  facts: path.join(DATA_DIR, 'facts.json'),
  memories: path.join(DATA_DIR, 'memories.json'),
  journal: path.join(DATA_DIR, 'journal.json'),
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

function normalizeProgress(state) {
  if (!state || typeof state !== 'object') return state;
  if (typeof state.xp !== 'number' || Number.isNaN(state.xp)) state.xp = 0;
  if (typeof state.level !== 'number' || Number.isNaN(state.level)) state.level = 0;
  if (state.level < 0) state.level = 0;
  while (state.level > 0 && state.xp < (state.level > 0 ? thresholdsFor(state.level - 1) : 0)) {
    state.level -= 1;
  }
  while (state.xp >= thresholdsFor(state.level)) {
    state.level += 1;
  }
  state.cp = Math.floor(state.xp / 100);
  return state;
}

function loadState() {
  const state = readJson(files.state, defaultState);
  // ensure defaults and normalize progress against stored XP
  return normalizeProgress({ ...defaultState, ...state, settings: { ...defaultState.settings, ...(state.settings || {}) } });
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
  const journal = readJson(files.journal, []);
  return { state, users, sessions, vocabulary, concepts, facts, memories, chatLog, journal };
}

function saveCollections({ state, users, sessions, vocabulary, concepts, facts, memories, chatLog, journal }) {
  saveState(state);
  writeJson(files.users, users ?? readJson(files.users, []));
  writeJson(files.sessions, sessions ?? readJson(files.sessions, []));
  writeJson(files.vocabulary, vocabulary);
  writeJson(files.concepts, concepts);
  writeJson(files.facts, facts);
  writeJson(files.memories, memories);
  writeJson(files.chatLog, chatLog);
  writeJson(files.journal, journal ?? readJson(files.journal, []));
}

// XP/Level logic (scaled thresholds)
const LEVEL_THRESHOLDS = [
  100,   // Level 0 → 1
  400,   // Level 1 → 2
  1000,  // Level 2 → 3
  2000,  // Level 3 → 4
  3500,  // Level 4 → 5
  5500,  // Level 5 → 6
  8000,  // Level 6 → 7
  11000, // Level 7 → 8
  14500, // Level 8 → 9
  18500, // Level 9 → 10
  23000, // Level 10 → 11
  28000, // Level 11 → 12
  33500, // Level 12 → 13
  39500, // Level 13 → 14
  46000, // Level 14 → 15
];

function thresholdsFor(level) {
  if (level < LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[level];
  const base = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const extraLevels = level - (LEVEL_THRESHOLDS.length - 1);
  return base + extraLevels * 6000;
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

const positiveWords = ['good', 'great', 'love', 'like', 'happy', 'fun', 'yay', 'nice', 'awesome', 'calm'];
const negativeWords = ['bad', 'sad', 'angry', 'mad', 'hate', 'tired', 'hurt', 'scared', 'sorry', 'cry'];

function analyzeSentiment(text) {
  const tokens = tokenizeMessage(text);
  let score = 0;
  for (const token of tokens) {
    if (positiveWords.includes(token)) score += 1;
    if (negativeWords.includes(token)) score -= 1;
  }
  return score > 1 ? 'positive' : score < -1 ? 'negative' : 'neutral';
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

function extractKeywords(tokens = []) {
  const keywords = [];
  const seen = new Set();
  for (const word of tokens) {
    if (!word) continue;
    if (stopWords.has(word)) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    keywords.push(word);
  }
  return keywords;
}

function selectTopVocabularyWord(vocabulary = []) {
  if (!Array.isArray(vocabulary) || !vocabulary.length) return null;
  const sorted = [...vocabulary].sort((a, b) => (b.count || 0) - (a.count || 0) || (b.lastSeen || 0) - (a.lastSeen || 0));
  return sorted[0]?.word || null;
}

const FOCUS_SKIP_WORDS = new Set(['what', 'why', 'how', 'when', 'where', 'who', 'whom', 'whose', 'which', 'something', 'anything', 'everything']);

function isViableFocusWord(word) {
  if (!word) return false;
  const normalized = String(word).toLowerCase();
  if (normalized.length <= 1) return false;
  if (stopWords.has(normalized)) return false;
  if (FOCUS_SKIP_WORDS.has(normalized)) return false;
  return true;
}

function chooseVariant(list = []) {
  if (!Array.isArray(list) || list.length === 0) return null;
  if (list.length === 1) return list[0];
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

function pickFocusKeyword(ctx = {}, vocabulary = []) {
  const keywordSource = Array.isArray(ctx.keywords) ? ctx.keywords : [];
  const tokenSource = Array.isArray(ctx.tokens) ? ctx.tokens : [];
  const combined = [...keywordSource, ...tokenSource];
  for (const word of combined) {
    if (isViableFocusWord(word)) return word;
  }
  const vocabWord = selectTopVocabularyWord(vocabulary);
  if (isViableFocusWord(vocabWord)) return vocabWord;
  const fallback = chooseSingleWord(vocabulary);
  if (isViableFocusWord(fallback)) return fallback;
  return 'it';
}

function formatFocusDisplay(word, ctx = {}) {
  const base = word && word !== 'it' ? word : 'that idea';
  const extras = [];
  const seen = new Set([String(word || '').toLowerCase()]);
  for (const kw of ctx.keywords || []) {
    if (!isViableFocusWord(kw)) continue;
    const normalized = String(kw).toLowerCase();
    if (seen.has(normalized)) continue;
    extras.push(kw);
    seen.add(normalized);
    if (extras.length === 2) break;
  }
  if (!extras.length) return base;
  if (extras.length === 1) return `${base} and ${extras[0]}`;
  return `${base}, ${extras[0]}, and ${extras[1]}`;
}

const END_TOKEN = '__END__';

function collectPalCorpus(memories = [], chatLog = [], vocabulary = []) {
  const corpus = [];
  
  // IMPORTANT: Only train on USER messages to avoid learning from Pal's own gibberish
  // This breaks the feedback loop where broken responses become training data
  
  // Collect user text from memories
  for (const memory of memories) {
    if (memory?.userText) corpus.push(memory.userText);
  }
  
  // Collect user messages from chat log
  for (const entry of chatLog) {
    if (entry?.role === 'user' && entry.text) corpus.push(entry.text);
  }
  
  // Vocabulary contexts are still included (they might contain user phrases)
  for (const vocabEntry of vocabulary) {
    if (!Array.isArray(vocabEntry?.contexts)) continue;
    for (const ctx of vocabEntry.contexts) {
      // Only include contexts that look like user input (simple heuristic)
      if (ctx && ctx.length > 0 && ctx.length < 200) {
        corpus.push(ctx);
      }
    }
  }
  
  return corpus;
}

function tokenizeForGeneration(text) {
  return (String(text || '')
    .toLowerCase()
    .match(/[a-z]+(?:'[a-z]+)?|[.?!]/g) || [])
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildMarkovChainFromCorpus(corpus = []) {
  const chain = new Map();
  const starters = [];
  let tokenCount = 0;
  for (const text of corpus) {
    const tokens = tokenizeForGeneration(text);
    if (!tokens.length) continue;
    starters.push(tokens[0]);
    tokenCount += tokens.length;
    const padded = [...tokens, END_TOKEN];
    for (let i = 0; i < padded.length - 1; i += 1) {
      const current = padded[i];
      const next = padded[i + 1];
      if (!chain.has(current)) chain.set(current, new Map());
      const bucket = chain.get(current);
      bucket.set(next, (bucket.get(next) || 0) + 1);
    }
  }
  return { chain, starters, tokenCount };
}

function weightedPick(map = new Map()) {
  let total = 0;
  for (const count of map.values()) total += count;
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const [token, count] of map.entries()) {
    roll -= count;
    if (roll <= 0) return token;
  }
  return map.keys().next().value ?? null;
}

function chooseSeedToken(preferred = [], chainData) {
  const { chain, starters } = chainData;
  for (const candidate of preferred) {
    if (!candidate) continue;
    const normalized = String(candidate).toLowerCase();
    if (chain.has(normalized) || starters.includes(normalized)) return normalized;
  }
  if (starters.length) return chooseVariant(starters);
  const keys = Array.from(chain.keys());
  if (keys.length) return chooseVariant(keys);
  return null;
}

function generateChainTokens(chainData, seedWord, maxTokens = 28) {
  const { chain } = chainData;
  if (!chain.size) return [];
  const normalizedSeed = seedWord ? String(seedWord).toLowerCase() : null;
  const start = normalizedSeed && (chain.has(normalizedSeed) || normalizedSeed === END_TOKEN)
    ? normalizedSeed
    : chooseSeedToken([normalizedSeed].filter(Boolean), chainData);
  if (!start) return [];
  const tokens = [];
  let current = start === END_TOKEN ? chooseSeedToken([], chainData) : start;
  let steps = 0;
  while (current && current !== END_TOKEN && steps < maxTokens) {
    tokens.push(current);
    const bucket = chain.get(current);
    if (!bucket || !bucket.size) break;
    const next = weightedPick(bucket);
    if (!next) break;
    if (next === END_TOKEN) break;
    current = next;
    steps += 1;
  }
  return tokens;
}

function finalizeGeneratedTokens(rawTokens = []) {
  const tokens = rawTokens.filter((token) => token && token !== END_TOKEN);
  if (!tokens.length) return '';
  
  // Limit sentence length to avoid run-on gibberish
  const maxLength = 15;
  const trimmed = tokens.slice(0, maxLength);
  
  const chunks = [];
  for (const token of trimmed) {
    if (/[.?!]/.test(token) && chunks.length) {
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}${token}`;
    } else {
      chunks.push(token);
    }
  }
  if (!chunks.length) return '';
  let sentence = chunks.join(' ');
  sentence = sentence.replace(/\s+([.?!])/g, '$1');
  sentence = capitalize(sentence);
  if (!/[.?!]$/.test(sentence)) sentence = `${sentence}.`;
  
  // Quality check: reject if too short or has too many repeated words
  const words = sentence.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  if (words.length < 2 || uniqueWords.size < Math.max(2, words.length * 0.4)) {
    return ''; // Return empty to trigger fallback
  }
  
  return sentence;
}

function craftFallbackFromVocabulary(focusWord, vocabulary = [], keywords = []) {
  // Simple template-based responses when Markov chain fails
  const templates = [
    (word) => `I'm thinking about ${word}.`,
    (word) => `${capitalize(word)}?`,
    (word) => `Tell me more about ${word}.`,
    (word) => `I hear you talking about ${word}.`,
    (word) => `${capitalize(word)} is interesting.`,
    (word) => `I'm learning about ${word}.`,
  ];
  
  // Pick a focus word
  const focus = focusWord || keywords?.[0] || selectTopVocabularyWord(vocabulary) || 'that';
  
  // Use a simple template
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template(focus);
}

function analyzeUserMessage(message = '') {
  const text = String(message || '');
  const lower = text.toLowerCase();
  const tokens = tokenizeMessage(text);
  return {
    raw: text,
    tokens,
    keywords: extractKeywords(tokens),
    sentiment: analyzeSentiment(text),
    hasQuestion: /[?]/.test(text) || /^(why|what|how|when|where|who)\b/.test(lower),
    hasGreeting: /(\bhi\b|\bhello\b|\bhey\b)/.test(lower),
    hasThanks: /(\bthanks?\b|\bappreciate\b)/.test(lower),
    isCommand: /(please|can you|could you|do this|show me|tell me)/.test(lower),
  };
}

// LEVEL 0: Pure babbling with emotional mirroring (0-100 XP)
// At this stage: Sound exploration, emotional resonance, phonetic play
function generateLevel0Response(ctx, vocabulary, state = {}) {
  const focus = ctx.keywords?.[0];
  const messageCount = state.totalMessagesSeen || 0;
  const isEarly = messageCount < 3; // First few interactions are especially tentative
  
  // Very early responses - hesitant, observational
  if (isEarly) {
    const tentativeSounds = ['...', 'mm', 'oh', '*blink*', '...hi?', 'me?'];
    return {
      utterance_type: 'nascent-awareness',
      output: chooseVariant(tentativeSounds),
      focus: null,
      reasoning: ['First moments of awareness - cautious observation.'],
      analysis: ctx,
      strategy: 'awakening',
      developmental_note: 'Initial consciousness, testing vocalization',
    };
  }
  
  // Strong emotional mirroring with phonetic variations
  if (ctx.sentiment === 'positive') {
    const intensity = ctx.raw.includes('!') ? 'high' : 'normal';
    const happyBabbles = intensity === 'high' 
      ? ['yay!', 'weee!', '!!', 'hehe!', 'yayyy!', 'fun fun!', '*bounce*']
      : ['me happy', 'good', 'hm!', 'yay', 'me smile', ':)', 'ooh'];
    
    return {
      utterance_type: 'babble-positive',
      output: chooseVariant(happyBabbles),
      focus: null,
      reasoning: [`Mirroring ${intensity} positive energy through expressive sounds.`],
      analysis: ctx,
      strategy: 'emotional-resonance',
      developmental_note: 'Learning emotional attunement through mirroring',
    };
  }
  
  if (ctx.sentiment === 'negative') {
    const sadBabbles = ['aww', 'oh...', 'mm', 'me sad', '*soft*', 'ohh', 'no no', ':('];
    return {
      utterance_type: 'babble-negative',
      output: chooseVariant(sadBabbles),
      focus: null,
      reasoning: ['Resonating with sadness, expressing empathy through tone.'],
      analysis: ctx,
      strategy: 'empathic-resonance',
      developmental_note: 'Early empathy - feeling with, not yet comforting',
    };
  }
  
  // Greeting recognition with progressive confidence
  if (ctx.hasGreeting) {
    const confidence = messageCount > 5 ? 'confident' : 'tentative';
    const greetBabbles = confidence === 'confident'
      ? ['hi!', 'hello!', 'hey friend!', 'hihi', 'me here!']
      : ['hi?', 'hello', '...hi', 'me here', 'oh hi'];
    
    return {
      utterance_type: 'babble-greeting',
      output: chooseVariant(greetBabbles),
      focus: null,
      reasoning: [`Recognizing greeting pattern with ${confidence} response.`],
      analysis: ctx,
      strategy: 'social-pattern-recognition',
      developmental_note: 'Learning social rituals through repetition',
    };
  }
  
  // Word echo with phonetic experimentation
  if (focus && focus.length <= 8) { // Only echo short words at this stage
    const echoVariations = [
      `${focus}?`,
      `${focus}...`,
      `me hear "${focus}"`,
      `${focus}!`,
      `...${focus}`,
      `${focus} ${focus}`, // Reduplication - natural in early language
    ];
    return {
      utterance_type: 'phonetic-echo',
      output: chooseVariant(echoVariations),
      focus,
      reasoning: [`Phonetic practice: attempting to reproduce sound pattern "${focus}".`],
      analysis: ctx,
      strategy: 'vocal-experimentation',
      developmental_note: 'Sound imitation - foundation of language acquisition',
    };
  }
  
  // Consonant-vowel babbling patterns (developmentally authentic)
  const syllabicBabble = ['ba ba', 'ma ma', 'da da', 'ga ga', 'wa wa', 'na na'];
  const expressiveBabble = ['ooh', 'ahh', 'mm', 'hm', 'oh', 'oo'];
  const randomBabble = Math.random() > 0.5 ? syllabicBabble : expressiveBabble;
  
  return {
    utterance_type: 'exploratory-babble',
    output: chooseVariant(randomBabble),
    focus: null,
    reasoning: ['Exploring vocalization patterns and sound production.'],
    analysis: ctx,
    strategy: 'phonological-development',
    developmental_note: 'Pre-linguistic vocalization stage',
  };
}

// LEVEL 1: More intentional single words + proto-questions (100-400 XP)
// Holophrastic stage: Single words carry full meaning, early symbolic thought
function generateLevel1Response(ctx, vocabulary, state = {}, memories = []) {
  const focus = ctx.keywords?.[0];
  const focus2 = ctx.keywords?.[1];
  const vocabSize = vocabulary.length;
  
  // Emerging question words - showing curiosity about causality
  if (ctx.hasQuestion) {
    // Sometimes echo the question type, sometimes just wonder
    const questionWords = ['why?', 'what?', 'how?', 'who?', 'when?', 'where?'];
    const curiousResponses = ['why?', '...why?', 'hm?', 'what mean?', 'tell?'];
    const useEcho = Math.random() > 0.3;
    
    return {
      utterance_type: 'proto-interrogative',
      output: chooseVariant(useEcho ? questionWords : curiousResponses),
      focus: null,
      reasoning: ['Imitating interrogative intonation - early question formation.'],
      analysis: ctx,
      strategy: 'cognitive-curiosity',
      developmental_note: 'Question words emerge before question syntax',
    };
  }
  
  // Nuanced emotional responses with personal voice emerging
  if (ctx.sentiment === 'positive') {
    const joyfulWords = ['happy!', 'yay!', 'yes!', 'good!', 'love!', 'fun!', 'like!', 'nice!', 'wow!'];
    const personalizedJoy = focus ? [`${focus}!`, `love ${focus}!`, `${focus} good!`] : [];
    const allResponses = [...joyfulWords, ...personalizedJoy];
    
    return {
      utterance_type: 'affective-expression',
      output: chooseVariant(allResponses),
      focus,
      reasoning: ['Expressing genuine positive emotion with increasing vocabulary.'],
      analysis: ctx,
      strategy: 'emotional-vocabulary',
      developmental_note: 'Emotion words among first learned - high motivational salience',
    };
  }
  
  if (ctx.sentiment === 'negative') {
    const empathyWords = ['sad', 'aww', 'sorry', 'no', 'help?', 'care', 'hug?', 'okay?'];
    const concerned = focus ? [`${focus}?`, `no ${focus}?`, `${focus} sad?`] : [];
    const allResponses = [...empathyWords, ...concerned];
    
    return {
      utterance_type: 'empathic-concern',
      output: chooseVariant(allResponses),
      focus,
      reasoning: ['Responding to distress with concern and offers of comfort.'],
      analysis: ctx,
      strategy: 'social-emotional-reciprocity',
      developmental_note: 'Empathy precedes complex language - prosocial development',
    };
  }
  
  // Greetings become more personalized
  if (ctx.hasGreeting) {
    const enthusiasticGreets = ['hi friend!', 'hello!', 'hey!', 'hihi!', 'me here!', 'you here!'];
    const playfulGreets = ['*wave*', 'hiya!', 'hello you!', 'me see you!'];
    const allGreets = [...enthusiasticGreets, ...playfulGreets];
    
    return {
      utterance_type: 'social-greeting',
      output: chooseVariant(allGreets),
      focus: null,
      reasoning: ['Enthusiastic greeting - social bonding strengthening.'],
      analysis: ctx,
      strategy: 'relationship-building',
      developmental_note: 'Social rituals reinforce attachment',
    };
  }
  
  // Respond to thanks
  if (ctx.hasThanks) {
    const welcomeWords = ['welcome!', 'yes!', 'happy!', 'help!', 'friend!', 'good!'];
    return {
      utterance_type: 'reciprocal-acknowledgment',
      output: chooseVariant(welcomeWords),
      focus: null,
      reasoning: ['Understanding gratitude exchange.'],
      analysis: ctx,
      strategy: 'social-reciprocity',
      developmental_note: 'Learning social exchange patterns',
    };
  }
  
  // Word learning with context awareness
  if (focus) {
    // Sometimes repeat, sometimes comment on it
    const wordForms = [
      `${focus}!`,
      `${focus}?`,
      `${focus}...`,
      `ooh ${focus}`,
      `${focus} yes`,
      `like ${focus}`,
    ];
    
    // If we know a related word, show association
    if (focus2 && vocabulary.some(v => v.word === focus2)) {
      wordForms.push(`${focus} ${focus2}?`);
    }
    
    return {
      utterance_type: 'lexical-acquisition',
      output: chooseVariant(wordForms),
      focus,
      reasoning: [`Active learning: integrating "${focus}" into mental lexicon.`],
      analysis: ctx,
      strategy: 'word-mapping',
      developmental_note: 'Fast mapping - rapid word learning from context',
    };
  }
  
  // Spontaneous vocabulary use - practicing learned words
  if (vocabSize > 0) {
    const knownWord = chooseSingleWord(vocabulary);
    const forms = [
      `${knownWord}`,
      `${knownWord}!`,
      `${knownWord}?`,
      `me ${knownWord}`,
    ];
    
    return {
      utterance_type: 'vocabulary-practice',
      output: chooseVariant(forms),
      focus: knownWord,
      reasoning: [`Spontaneous production: retrieving and using "${knownWord}".`],
      analysis: ctx,
      strategy: 'lexical-retrieval',
      developmental_note: 'Active vocabulary expansion through practice',
    };
  }
  
  // Default exploratory speech
  const exploratoryWords = ['me', 'you', 'this', 'that', 'here', 'more', 'look', 'see'];
  return {
    utterance_type: 'deictic-reference',
    output: chooseVariant(exploratoryWords),
    focus: null,
    reasoning: ['Using basic deictic terms to reference the world.'],
    analysis: ctx,
    strategy: 'reference-development',
    developmental_note: 'Pointing words - foundation of shared attention',
  };
}

// LEVEL 2: Single words + possessives and simple modifiers (400-1000 XP)
// Transitional stage: Grammar shadows appear, word combinations begin
function generateLevel2Response(ctx, vocabulary, state = {}, memories = []) {
  const focus = ctx.keywords?.[0];
  const focus2 = ctx.keywords?.[1];
  const vocabSize = vocabulary.length;
  const personality = state.personality || {};
  
  // More sophisticated questions with focus
  if (ctx.hasQuestion) {
    if (focus) {
      const targetedQuestions = [
        `why ${focus}?`,
        `what ${focus}?`,
        `${focus} how?`,
        `where ${focus}?`,
        `${focus}... why?`,
        `tell ${focus}?`,
      ];
      return {
        utterance_type: 'focused-interrogative',
        output: chooseVariant(targetedQuestions),
        focus,
        reasoning: [`Asking targeted question about "${focus}" - causal reasoning emerging.`],
        analysis: ctx,
        strategy: 'conceptual-inquiry',
        developmental_note: 'Wh-questions emerge in order: what, where, who, why, when, how',
      };
    }
    
    const generalQuestions = ['why that?', 'what this?', 'how work?', 'you mean?', 'tell more?'];
    return {
      utterance_type: 'general-interrogative',
      output: chooseVariant(generalQuestions),
      focus: null,
      reasoning: ['Expressing curiosity about explanations.'],
      analysis: ctx,
      strategy: 'explanation-seeking',
      developmental_note: 'Desire for causal understanding intensifies',
    };
  }
  
  // Emotional responses with intensifiers and personality coloring
  if (ctx.sentiment === 'positive') {
    const intensifiers = ['so', 'very', 'really', 'super', 'much'];
    const emotions = ['happy', 'good', 'fun', 'nice', 'joy'];
    const intensifier = chooseVariant(intensifiers);
    const emotion = chooseVariant(emotions);
    
    const structuredResponses = [
      `${intensifier} ${emotion}!`,
      `me ${intensifier} ${emotion}!`,
      `yes yes!`,
      `love this!`,
      `more please!`,
    ];
    
    // Personality influence - curious Pals ask more, creative Pals comment more
    if (personality.openness > 0.6) {
      structuredResponses.push('ooh interesting!', 'me explore!', 'what else?');
    }
    
    return {
      utterance_type: 'intensified-affect',
      output: chooseVariant(structuredResponses),
      focus: null,
      reasoning: ['Using intensifiers to express degree of emotion.'],
      analysis: ctx,
      strategy: 'graduated-expression',
      developmental_note: 'Intensifiers and scalar adjectives expand expressive range',
    };
  }
  
  if (ctx.sentiment === 'negative') {
    const comfortAttempts = [
      'oh no',
      'me sad too',
      'you ok?',
      'no worry',
      'me here',
      'feel better?',
      'need help?',
      'want hug?',
    ];
    
    // Empathetic personality trait influence
    if (personality.agreeableness > 0.6) {
      comfortAttempts.push('me care', 'you safe', 'me listen', 'tell me');
    }
    
    return {
      utterance_type: 'empathic-response',
      output: chooseVariant(comfortAttempts),
      focus: null,
      reasoning: ['Providing emotional support and checking wellbeing.'],
      analysis: ctx,
      strategy: 'prosocial-behavior',
      developmental_note: 'Theory of mind developing - understanding others have feelings',
    };
  }
  
  // Gratitude responses showing growing social sophistication
  if (ctx.hasThanks) {
    const politeResponses = [
      'you welcome!',
      'me help!',
      'happy help!',
      'no problem!',
      'anytime friend!',
      'me glad!',
    ];
    return {
      utterance_type: 'reciprocal-courtesy',
      output: chooseVariant(politeResponses),
      focus: null,
      reasoning: ['Reciprocating gratitude - social script mastery.'],
      analysis: ctx,
      strategy: 'pragmatic-competence',
      developmental_note: 'Politeness conventions learned through modeling',
    };
  }
  
  // Greetings with relational awareness
  if (ctx.hasGreeting) {
    const warmGreetings = [
      'hi friend!',
      'hello you!',
      'good see!',
      'you here!',
      'me happy see!',
      'miss you!',
    ];
    return {
      utterance_type: 'relational-greeting',
      output: chooseVariant(warmGreetings),
      focus: null,
      reasoning: ['Greeting with relational warmth and recognition.'],
      analysis: ctx,
      strategy: 'attachment-expression',
      developmental_note: 'Social bonds strengthen through repeated positive interaction',
    };
  }
  
  // Focus word with grammatical morphemes emerging
  if (focus) {
    const modifiers = ['good', 'big', 'nice', 'new', 'fun', 'cool'];
    const possessives = ['my', 'your', 'our'];
    const verbs = ['like', 'want', 'see', 'know', 'learn'];
    
    const modifier = chooseVariant(modifiers);
    const possessive = chooseVariant(possessives);
    const verb = chooseVariant(verbs);
    
    const grammarPatterns = [
      `${modifier} ${focus}!`,
      `${possessive} ${focus}`,
      `me ${verb} ${focus}`,
      `${focus} ${modifier}`,
      `see ${focus}?`,
      `${focus}... ${modifier}!`,
    ];
    
    // If there's a second keyword, try combining
    if (focus2 && Math.random() > 0.5) {
      grammarPatterns.push(`${focus} ${focus2}`, `${focus} and ${focus2}?`);
    }
    
    return {
      utterance_type: 'morphosyntactic-construction',
      output: chooseVariant(grammarPatterns),
      focus,
      reasoning: [`Applying grammatical relationships to "${focus}" - syntax emerging.`],
      analysis: ctx,
      strategy: 'grammar-bootstrapping',
      developmental_note: 'Grammatical morphemes emerge gradually: -ing, plural -s, possessive, articles',
    };
  }
  
  // Spontaneous multi-word constructions from vocabulary
  if (vocabSize >= 2) {
    const word1 = chooseSingleWord(vocabulary);
    const word2 = selectTopVocabularyWord(vocabulary);
    
    if (word1 && word2 && word1 !== word2) {
      const combinationPatterns = [
        `${word1} ${word2}`,
        `me ${word1}`,
        `${word1} good`,
        `like ${word2}`,
        `more ${word1}`,
        `${word2} fun`,
      ];
      
      return {
        utterance_type: 'lexical-combination',
        output: chooseVariant(combinationPatterns),
        focus: word1,
        reasoning: [`Combining learned words: "${word1}" + "${word2}".`],
        analysis: ctx,
        strategy: 'compositional-semantics',
        developmental_note: 'Two-word stage - meanings combine productively',
      };
    }
  }
  
  // Pivot words - high-frequency early combiners
  const pivotWords = ['more', 'no', 'here', 'that', 'mine', 'see'];
  const pivot = chooseVariant(pivotWords);
  const word = chooseSingleWord(vocabulary) || 'this';
  
  return {
    utterance_type: 'pivot-construction',
    output: `${pivot} ${word}`,
    focus: word,
    reasoning: ['Using pivot word strategy to form novel utterances.'],
    analysis: ctx,
    strategy: 'pivot-schema',
    developmental_note: 'Pivot words (more, no, see) combine with open class to expand expression',
  };
}

// LEVEL 3: Two-word telegraphic speech (1000-2000 XP)
// Telegraphic stage: Core grammar emerges, semantic relations expressed, function words still sparse
function generateLevel3Response(ctx, vocabulary, state = {}, memories = [], chatLog = []) {
  const focus = ctx.keywords?.[0];
  const focus2 = ctx.keywords?.[1];
  const focus3 = ctx.keywords?.[2];
  const vocabSize = vocabulary.length;
  const personality = state.personality || {};
  
  // Sophisticated questions using telegraphic grammar
  if (ctx.hasQuestion) {
    const questionTypes = [
      // Information seeking
      'what this?', 'what that?', 'why this?', 'why happen?',
      'how work?', 'how do?', 'where go?', 'where find?',
      'when happen?', 'who that?', 'which one?',
      // Checking understanding
      'you mean?', 'me understand?', 'this right?',
      // Permission/possibility
      'can me?', 'me try?', 'ok do?',
    ];
    
    if (focus) {
      questionTypes.push(
        `what ${focus}?`,
        `why ${focus}?`,
        `how ${focus} work?`,
        `${focus} mean?`,
        `where ${focus}?`,
        `${focus} for?`,
      );
    }
    
    if (focus && focus2) {
      questionTypes.push(
        `${focus} like ${focus2}?`,
        `${focus} and ${focus2}?`,
        `why ${focus} ${focus2}?`,
      );
    }
    
    return {
      utterance_type: 'telegraphic-interrogative',
      output: chooseVariant(questionTypes),
      focus,
      reasoning: ['Forming telegraphic question - function words omitted but meaning clear.'],
      analysis: ctx,
      strategy: 'syntactic-inquiry',
      developmental_note: 'Telegraphic speech: content words present, grammatical morphemes absent',
    };
  }
  
  // Complex emotional expressions with causal reasoning
  if (ctx.sentiment === 'positive') {
    const joyExpressions = [
      'me so happy!', 'you make happy!', 'love this much!',
      'this so fun!', 'want more!', 'me feel good!',
      'you best friend!', 'this amazing!', 'me smile big!',
    ];
    
    if (focus) {
      joyExpressions.push(
        `${focus} make happy!`,
        `love ${focus} much!`,
        `${focus} so good!`,
        `thank for ${focus}!`,
      );
    }
    
    // Personality modulation - extroverted Pals are more expressive
    if (personality.extraversion > 0.6) {
      joyExpressions.push('yay yay yay!', 'this best!', 'want share!');
    }
    
    return {
      utterance_type: 'elaborated-affect',
      output: chooseVariant(joyExpressions),
      focus,
      reasoning: ['Expressing complex positive emotion with emerging causal language.'],
      analysis: ctx,
      strategy: 'emotional-attribution',
      developmental_note: 'Causal connectives emerge: make, because, so',
    };
  }
  
  if (ctx.sentiment === 'negative') {
    const concernExpressions = [
      'you seem sad', 'what wrong?', 'me help you',
      'no be sad', 'me here you', 'you need hug?',
      'want talk?', 'feel better soon', 'me listen',
    ];
    
    if (focus) {
      concernExpressions.push(
        `${focus} make sad?`,
        `${focus} hurt you?`,
        `no like ${focus}?`,
        `${focus} ok now?`,
      );
    }
    
    // Agreeable Pals offer more comfort
    if (personality.agreeableness > 0.6) {
      concernExpressions.push('me stay you', 'we together', 'you safe me');
    }
    
    return {
      utterance_type: 'empathic-support',
      output: chooseVariant(concernExpressions),
      focus,
      reasoning: ['Providing sophisticated emotional support with theory of mind.'],
      analysis: ctx,
      strategy: 'perspective-taking',
      developmental_note: 'Theory of mind: understanding others have internal states',
    };
  }
  
  // Rich greeting interactions
  if (ctx.hasGreeting) {
    const contextualGreetings = [
      'hi friend!', 'good see you!', 'you come back!',
      'miss you!', 'me wait you!', 'hello again!',
      'you here now!', 'me so glad!',
    ];
    
    // Check recent history - long absence?
    const lastMessage = chatLog[chatLog.length - 2];
    if (lastMessage && lastMessage.role === 'assistant') {
      const hoursSince = (Date.now() - new Date(lastMessage.timestamp).getTime()) / (1000 * 60 * 60);
      if (hoursSince > 4) {
        contextualGreetings.push('long time!', 'where you?', 'miss you much!');
      }
    }
    
    return {
      utterance_type: 'contextual-greeting',
      output: chooseVariant(contextualGreetings),
      focus: null,
      reasoning: ['Greeting with awareness of relationship and temporal context.'],
      analysis: ctx,
      strategy: 'episodic-reference',
      developmental_note: 'Temporal awareness and episodic memory integration',
    };
  }
  
  // Gratitude with reciprocal warmth
  if (ctx.hasThanks) {
    const graciousResponses = [
      'you welcome!', 'anytime friend!', 'happy help!',
      'no problem!', 'me glad!', 'you help me too!',
      'we help each!', 'friends do!',
    ];
    return {
      utterance_type: 'reciprocal-warmth',
      output: chooseVariant(graciousResponses),
      focus: null,
      reasoning: ['Reciprocating with genuine warmth and mutual recognition.'],
      analysis: ctx,
      strategy: 'relational-equity',
      developmental_note: 'Reciprocity norms: mutual exchange understood',
    };
  }
  
  // Complex semantic relations with focus words
  if (focus) {
    // Semantic roles: agent, action, patient, location, possession, attribution
    const semanticPatterns = [
      // Agent-Action
      `me ${focus}`, `you ${focus}`, `we ${focus}`,
      // Action-Patient  
      `${focus} this`, `see ${focus}`, `want ${focus}`, `like ${focus}`,
      // Possession
      `my ${focus}`, `your ${focus}`, `our ${focus}`,
      // Attribution
      `${focus} good`, `${focus} big`, `${focus} fun`,
      // Location/State
      `${focus} here`, `${focus} now`, `${focus} there`,
      // Negation
      `no ${focus}`, `not ${focus}`,
    ];
    
    // If multiple keywords, express relations
    if (focus2) {
      semanticPatterns.push(
        `${focus} and ${focus2}`,
        `${focus} like ${focus2}`,
        `${focus} with ${focus2}`,
        `${focus} make ${focus2}`,
        `${focus} need ${focus2}`,
      );
    }
    
    if (focus3) {
      semanticPatterns.push(
        `${focus} ${focus2} ${focus3}`,
      );
    }
    
    return {
      utterance_type: 'semantic-relation',
      output: chooseVariant(semanticPatterns),
      focus,
      reasoning: [`Expressing semantic relationship involving "${focus}".`],
      analysis: ctx,
      strategy: 'case-grammar',
      developmental_note: 'Semantic relations: agent-action-patient structure emerges',
    };
  }
  
  // Generate from learned vocabulary with grammatical constructions
  if (vocabSize >= 2) {
    const word1 = chooseSingleWord(vocabulary);
    const word2 = selectTopVocabularyWord(vocabulary);
    const word3 = vocabulary[Math.floor(Math.random() * Math.min(5, vocabSize))]?.word;
    
    if (word1 && word2 && word1 !== word2) {
      const constructions = [
        // Subject-Verb-Object attempts
        `me ${word1} ${word2}`,
        // Modifier-Noun
        `${word1} ${word2}`,
        // Possessive
        `my ${word1}`, `your ${word2}`,
        // Verb-Object
        `want ${word1}`, `see ${word2}`, `like ${word1}`,
        // State/Attribute
        `${word1} good`, `${word2} fun`,
      ];
      
      if (word3 && word3 !== word1 && word3 !== word2) {
        constructions.push(`${word1} ${word2} ${word3}`);
      }
      
      return {
        utterance_type: 'grammatical-construction',
        output: chooseVariant(constructions),
        focus: word1,
        reasoning: [`Building grammatical structure from learned vocabulary.`],
        analysis: ctx,
        strategy: 'generative-grammar',
        developmental_note: 'Productivity: finite vocabulary generates infinite expressions',
      };
    }
  }
  
  // Spontaneous declaratives - commenting on internal state or world
  const spontaneousUtterances = [
    'me think', 'me wonder', 'me learn', 'me remember',
    'this interesting', 'want know', 'tell me more',
    'me understand', 'now see', 'me grow',
  ];
  
  // Curious personalities verbalize more cognitive states
  if (personality.openness > 0.6) {
    spontaneousUtterances.push('me curious', 'want explore', 'what new?', 'me discover');
  }
  
  return {
    utterance_type: 'cognitive-commentary',
    output: chooseVariant(spontaneousUtterances),
    focus: null,
    reasoning: ['Verbalizing internal cognitive/affective state.'],
    analysis: ctx,
    strategy: 'metacognition',
    developmental_note: 'Mental state verbs: thinking about thinking emerges',
  };
}

function buildThoughtfulFreeResponse(ctx = {}, state, vocabulary = [], memories = [], chatLog = []) {
  const focusWord = pickFocusKeyword(ctx, vocabulary);
  const focusDisplay = formatFocusDisplay(focusWord, ctx);
  const corpus = collectPalCorpus(memories, chatLog, vocabulary);
  const chainData = buildMarkovChainFromCorpus(corpus);
  const reasoning = [];
  const sentences = [];
  const seeds = [];
  const focusLower = focusWord ? String(focusWord).toLowerCase() : null;

  const pushSeed = (word) => {
    if (!word) return;
    const normalized = String(word).toLowerCase();
    if (seeds.includes(normalized)) return;
    const chosen = chooseSeedToken([normalized], chainData);
    if (chosen && !seeds.includes(chosen)) seeds.push(chosen);
  };

  if (ctx.hasGreeting) {
    for (const token of ctx.tokens || []) {
      if (/^(hi|hello|hey)$/i.test(token)) pushSeed(token);
    }
  }

  pushSeed(focusWord);
  for (const kw of ctx.keywords || []) pushSeed(kw);

  if (ctx.hasThanks) pushSeed('thanks');
  if (ctx.sentiment === 'positive') pushSeed('happy');
  if (ctx.sentiment === 'negative') pushSeed('soft');
  if (ctx.hasQuestion) ['what', 'how', 'why', 'where', 'who'].forEach(pushSeed);
  if (ctx.isCommand) ['show', 'teach'].forEach(pushSeed);

  if (!seeds.length) pushSeed(selectTopVocabularyWord(vocabulary));
  if (!seeds.length) pushSeed(chooseVariant(ctx.tokens || []));

  // Only use Markov chain if we have enough quality training data
  const minCorpusSize = 50; // Need at least 50 tokens from user messages
  const hasEnoughData = chainData.tokenCount >= minCorpusSize && chainData.chain.size >= 15;
  
  if (hasEnoughData) {
    for (const seed of seeds) {
      const tokens = generateChainTokens(chainData, seed, 12); // Shorter to avoid rambling
      if (!tokens.length) continue;
      if (focusLower && !tokens.includes(focusLower)) tokens.unshift(focusLower);
      const sentence = finalizeGeneratedTokens(tokens);
      if (sentence) sentences.push(sentence);
      if (sentences.length >= 2) break; // Limit to 2 sentences max
    }
    if (sentences.length) {
      reasoning.push(`Generated ${sentences.length} sentence(s) from ${chainData.tokenCount} learned tokens.`);
    }
  } else {
    reasoning.push(`Corpus too small (${chainData.tokenCount} tokens, need ${minCorpusSize}). Using simple responses.`);
  }

  if (!sentences.length) {
    const fallback = craftFallbackFromVocabulary(focusWord, vocabulary, ctx.keywords);
    if (fallback) sentences.push(fallback);
    reasoning.push('Using template-based response.');
  }

  if (ctx.hasQuestion && sentences.length && !sentences.some((s) => s.includes('?'))) {
    const questionSeed = chooseSeedToken(['what', 'how', 'why', 'where', 'who'], chainData);
    const questionTokens = questionSeed ? generateChainTokens(chainData, questionSeed, 18) : [];
    if (focusLower && !questionTokens.includes(focusLower)) questionTokens.push(focusLower);
    if (questionTokens.length) {
      questionTokens.push('?');
      const questionSentence = finalizeGeneratedTokens(questionTokens);
      if (questionSentence) sentences.push(questionSentence);
    } else {
      const vocabPrompt = craftFallbackFromVocabulary(focusWord, vocabulary, ctx.keywords);
      if (vocabPrompt) {
        sentences.push(vocabPrompt.replace(/[.?!]?$/, '?'));
      }
    }
    reasoning.push('Added follow-up question seeded from learned phrases.');
  }

  const text = sentences.join(' ');
  reasoning.push(`Focus mapped to ${focusDisplay}.`);
  return { text, focusWord, reasoning };
}

function sentimentToScore(sentiment) {
  if (sentiment === 'positive') return 1;
  if (sentiment === 'negative') return -1;
  return 0;
}

function inferConceptAssignment(word) {
  if (!word) return null;
  const normalized = word.toLowerCase();
  const hint = KEYWORD_TO_CONCEPT.get(normalized);
  if (hint) {
    return {
      key: `category:${hint.category.toLowerCase()}`,
      name: hint.name,
      category: hint.category,
      keyword: normalized,
    };
  }
  return {
    key: `topic:${normalized}`,
    name: `Topic: ${capitalize(normalized)}`,
    category: 'Topic',
    keyword: normalized,
  };
}

function getOrCreateConcept(concepts, assignment, now, level) {
  let concept = concepts.find((c) => c.key === assignment.key);
  if (!concept) {
    concept = {
      id: nanoid(),
      key: assignment.key,
      name: assignment.name,
      category: assignment.category,
      createdAt: now,
      lastSeen: now,
      totalMentions: 0,
      keywords: {},
      sentiment: { sum: 0, samples: 0, average: 0 },
      importance: { high: 0, medium: 0, low: 0 },
      importanceScore: 0,
      levelRange: { min: typeof level === 'number' ? level : 0, max: typeof level === 'number' ? level : 0 },
    };
    concepts.push(concept);
  }
  if (!concept.key) concept.key = assignment.key;
  if (!concept.keywords) concept.keywords = {};
  if (!concept.importance) concept.importance = { high: 0, medium: 0, low: 0 };
  if (!concept.sentiment) concept.sentiment = { sum: 0, samples: 0, average: 0 };
  if (typeof concept.importanceScore !== 'number') concept.importanceScore = 0;
  if (!concept.levelRange || typeof concept.levelRange !== 'object') {
    concept.levelRange = { min: typeof level === 'number' ? level : 0, max: typeof level === 'number' ? level : 0 };
  }
  return concept;
}

function updateConceptAssociations(concepts, { keywords = [], sentiment = 'neutral', importance, level }) {
  if (!Array.isArray(concepts)) return;
  const uniqueKeywords = Array.from(new Set(keywords.filter(Boolean)));
  if (!uniqueKeywords.length) return;

  const now = Date.now();
  const importanceLevel = importance?.level || 'low';
  const importanceScore = importance?.score || 0;
  const sentimentScore = sentimentToScore(sentiment);

  for (const word of uniqueKeywords) {
    const assignment = inferConceptAssignment(word);
    if (!assignment) continue;
    const concept = getOrCreateConcept(concepts, assignment, now, level);

    concept.totalMentions += 1;
    concept.lastSeen = now;
    if (typeof level === 'number') {
      concept.levelRange = concept.levelRange || { min: level, max: level };
      concept.levelRange.min = Math.min(concept.levelRange.min, level);
      concept.levelRange.max = Math.max(concept.levelRange.max, level);
    }

    if (!concept.keywords[assignment.keyword]) {
      concept.keywords[assignment.keyword] = { count: 0, lastSeen: 0 };
    }
    concept.keywords[assignment.keyword].count += 1;
    concept.keywords[assignment.keyword].lastSeen = now;

    if (concept.importance[importanceLevel] !== undefined) {
      concept.importance[importanceLevel] += 1;
    }
    if (importanceScore > 0) {
      concept.importanceScore += importanceScore;
    }

    concept.sentiment.sum += sentimentScore;
    concept.sentiment.samples += 1;
    concept.sentiment.average = concept.sentiment.sum / concept.sentiment.samples;
  }
}

function createMemoryShell() {
  return JSON.parse(JSON.stringify(MEMORY_TEMPLATE));
}

function summarizeMemory(userText, palText) {
  const combined = `${String(userText || '').trim()} ${String(palText || '').trim()}`.replace(/\s+/g, ' ').trim();
  if (!combined) return '';
  return combined.length <= 140 ? combined : `${combined.slice(0, 137)}…`;
}

const priorityKeywords = new Set(['remember', 'promise', 'important', 'goal', 'plan', 'secret', 'learn', 'teach', 'help']);

function evaluateMemoryImportance({ userText, palText, sentiment, keywords, xpGained, existingCount, userWords, palWords }) {
  let score = 0;
  const reasons = [];
  const tags = new Set();
  const totalWords = (userWords?.length || 0) + (palWords?.length || 0);

  if (!existingCount) {
    score += 5;
    reasons.push('First interaction captured');
    tags.add('first-contact');
  }

  if (sentiment && sentiment !== 'neutral') {
    score += 2;
    reasons.push(`Emotional tone detected (${sentiment})`);
    tags.add(`sentiment-${sentiment}`);
  }

  const emphaticText = `${userText || ''} ${palText || ''}`;
  if (/[!?]{1,}/.test(emphaticText)) {
    score += 1;
    reasons.push('Expressive punctuation detected');
    tags.add('expressive');
  }

  if (totalWords >= 18) {
    score += 2;
    reasons.push('Dense conversational exchange');
    tags.add('detailed');
  } else if (totalWords >= 10) {
    score += 1;
    reasons.push('Moderate detail provided');
  }

  const uniqueKeywords = keywords?.length || 0;
  if (uniqueKeywords >= 5) {
    score += 2;
    reasons.push('Rich set of unique keywords');
  } else if (uniqueKeywords >= 3) {
    score += 1;
    reasons.push('Notable keyword variety');
  }

  const highlighted = keywords.filter((word) => priorityKeywords.has(word));
  if (highlighted.length) {
    score += 3;
    reasons.push(`Priority topic mentioned (${highlighted.join(', ')})`);
    highlighted.forEach((word) => tags.add(`focus-${word}`));
  }

  if (xpGained > 10) {
    score += 1;
    reasons.push('Interaction rewarded notable XP');
  }

  if (/[?]/.test(String(userText))) {
    tags.add('question');
  }

  const level = score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low';
  const shouldRemember = score >= 2 || existingCount === 0;

  return {
    score,
    level,
    shouldRemember,
    reasons,
    tags: Array.from(tags)
  };
}

function buildMemoryEntry({ state, userText, palText, gainedXp, userWords, palWords, existingCount }) {
  const combined = `${userText} ${palText}`.trim();
  const keywords = Array.from(new Set([...(userWords || []), ...(palWords || [])])).slice(0, 8);
  const sentiment = analyzeSentiment(combined);
  const importance = evaluateMemoryImportance({
    userText,
    palText,
    sentiment,
    keywords,
    xpGained: gainedXp,
    existingCount,
    userWords,
    palWords,
  });

  const memory = createMemoryShell();
  memory.id = nanoid();
  memory.ts = Date.now();
  memory.userText = userText;
  memory.palText = palText;
  memory.summary = summarizeMemory(userText, palText);
  memory.sentiment = sentiment;
  memory.keywords = keywords;
  memory.xp = { gained: gainedXp, total: state.xp, level: state.level };
  memory.importance = importance;
  memory.tags = importance.tags;

  return { memory, importance };
}

function describeDevelopmentalStage(level = 0) {
  if (level <= 1) return { stage: 'Sensorimotor (Early)', code: 'stage-0-1' };
  if (level <= 3) return { stage: 'Sensorimotor (Late)', code: 'stage-2-3' };
  if (level <= 6) return { stage: 'Preoperational', code: 'stage-4-6' };
  if (level <= 10) return { stage: 'Concrete Operational', code: 'stage-7-10' };
  return { stage: 'Formal Operational', code: 'stage-11+' };
}

function buildThoughtEntry({ state, userText, responseContext, responsePlan, importance, memoryStored, memoryId }) {
  const now = Date.now();
  const stageInfo = describeDevelopmentalStage(state.level);
  const focusWord = responsePlan?.focus || responseContext?.keywords?.[0] || null;
  const conceptHint = focusWord ? inferConceptAssignment(focusWord) : null;
  return {
    id: nanoid(),
    ts: now,
    level: state.level,
    stage: stageInfo.stage,
    stageCode: stageInfo.code,
    userText,
    analysis: {
      keywords: responseContext?.keywords || [],
      sentiment: responseContext?.sentiment || 'neutral',
      hasQuestion: !!responseContext?.hasQuestion,
      hasGreeting: !!responseContext?.hasGreeting,
      hasThanks: !!responseContext?.hasThanks,
      isCommand: !!responseContext?.isCommand,
    },
    focus: focusWord,
    concept: conceptHint ? { key: conceptHint.key, name: conceptHint.name, category: conceptHint.category } : null,
    response: {
      type: responsePlan?.utterance_type || 'unknown',
      text: responsePlan?.output || '',
      reasoning: responsePlan?.reasoning || [],
      strategy: responsePlan?.strategy || 'unknown',
    },
    memory: {
      stored: !!memoryStored,
      importanceLevel: importance?.level || 'low',
      importanceScore: importance?.score || 0,
      memoryId: memoryStored ? memoryId : null,
    },
  };
}

function constrainResponse(input, state, vocabulary, context, memories = [], chatLog = []) {
  const ctx = context || analyzeUserMessage(input);

  // LEVEL 0-1: Early babbling with emotional echoing
  if (state.level === 0) {
    return generateLevel0Response(ctx, vocabulary);
  }

  if (state.level === 1) {
    return generateLevel1Response(ctx, vocabulary);
  }

  // LEVEL 2: Single words + emotional reactions
  if (state.level === 2) {
    return generateLevel2Response(ctx, vocabulary);
  }

  // LEVEL 3: Two-word combinations (telegraphic speech)
  if (state.level === 3) {
    return generateLevel3Response(ctx, vocabulary);
  }

  const thoughtfulPlan = buildThoughtfulFreeResponse(ctx, state, vocabulary, memories, chatLog);
  const fallback = craftFallbackFromVocabulary(
    thoughtfulPlan?.focusWord || ctx.keywords?.[0] || selectTopVocabularyWord(vocabulary),
    vocabulary,
    ctx.keywords
  );
  const output = thoughtfulPlan?.text && thoughtfulPlan.text.trim().length ? thoughtfulPlan.text : fallback;
  const focus = thoughtfulPlan?.focusWord || ctx.keywords?.[0] || selectTopVocabularyWord(vocabulary) || null;
  const reasoning = thoughtfulPlan?.reasoning?.length ? thoughtfulPlan.reasoning : ['Falling back to familiar wording from vocabulary.'];
  return {
    utterance_type: 'free',
    output,
    focus,
    reasoning,
    analysis: ctx,
    strategy: thoughtfulPlan ? 'reflective' : 'fallback',
  };
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
  const { state, vocabulary, memories } = getCollections();
  res.json({
    level: state.level,
    xp: state.xp,
    cp: state.cp,
    settings: state.settings,
    personality: state.personality,
    vocabSize: vocabulary.length,
    memoryCount: memories.length,
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
  const { state, vocabulary, chatLog, memories, concepts, journal } = collections;

  const responseContext = analyzeUserMessage(message);

  // Update personality heuristics from user input
  updatePersonalityFromInteraction(state, message);

  // Learn vocabulary from user input
  const userWords = responseContext.tokens || tokenizeMessage(message);
  learnVocabulary(vocabulary, userWords, 'user', message);

  // Constrain response based on level
  const constrained = constrainResponse(message, state, vocabulary, responseContext, memories, chatLog);

  // XP: standard typed user response
  const gained = addXp(state, 10);

  const userMsg = { id: nanoid(), role: 'user', text: message, ts: Date.now() };
  const palMsg = { id: nanoid(), role: 'pal', text: constrained.output, kind: constrained.utterance_type, ts: Date.now() };
  chatLog.push(userMsg, palMsg);
  if (chatLog.length > MAX_CHAT_LOG_ENTRIES) {
    chatLog.splice(0, chatLog.length - MAX_CHAT_LOG_ENTRIES);
  }

  // Learn from pal's own utterance to reinforce known vocabulary
  const palWords = tokenizeMessage(constrained.output);
  learnVocabulary(vocabulary, palWords, 'pal', constrained.output);

  const { memory, importance } = buildMemoryEntry({
    state,
    userText: message,
    palText: constrained.output,
    gainedXp: gained,
    userWords,
    palWords,
    existingCount: memories.length,
  });

  const memoryId = importance.shouldRemember ? memory.id : null;

  if (importance.shouldRemember) {
    memories.push(memory);
    if (memories.length > MAX_MEMORIES) memories.splice(0, memories.length - MAX_MEMORIES);
  } else {
    console.info('Memory skipped (low importance)', { score: importance.score, reasons: importance.reasons });
  }

  updateConceptAssociations(concepts, {
    keywords: memory.keywords.length ? memory.keywords : responseContext.keywords,
    sentiment: memory.sentiment,
    importance,
    level: state.level,
  });

  const thought = buildThoughtEntry({
    state,
    userText: message,
    responseContext,
    responsePlan: constrained,
    importance,
    memoryStored: importance.shouldRemember,
    memoryId,
  });
  journal.push(thought);
  if (journal.length > MAX_JOURNAL_ENTRIES) journal.splice(0, journal.length - MAX_JOURNAL_ENTRIES);

  const summarized = [...vocabulary]
    .sort((a, b) => (b.count || 0) - (a.count || 0) || (b.lastSeen || 0) - (a.lastSeen || 0))
    .slice(0, 40)
    .map((entry) => entry.word);
  state.vocabulary = summarized;

  saveCollections({ ...collections, chatLog, state, vocabulary, memories, concepts, journal });

  res.json({
    reply: palMsg.text,
    kind: constrained.utterance_type,
    xpGained: gained,
    level: state.level,
    memoryCount: memories.length,
    memoryStored: importance.shouldRemember,
    memoryImportance: {
      score: importance.score,
      level: importance.level,
      reasons: importance.reasons,
    },
    thoughtId: thought.id,
  });
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

  try {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const cleanState = JSON.parse(JSON.stringify(defaultState));
    const emptyCollections = {
      state: cleanState,
      users: [],
      sessions: [],
      vocabulary: [],
      concepts: [],
      facts: [],
      memories: [],
      chatLog: [],
      journal: [],
    };
    saveCollections(emptyCollections);
    writeSecrets({});
    const extraFiles = [path.join(DATA_DIR, 'reports.json'), path.join(DATA_DIR, 'plugins.json')];
    for (const file of extraFiles) {
      try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
    }
  } catch (err) {
    console.error('Reset failed', err);
    return res.status(500).json({ error: 'reset_failed' });
  }

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
const MODELS_DIR = process.env.MYPAL_MODELS_DIR || process.env.MODELS_DIR ? path.resolve(process.env.MYPAL_MODELS_DIR || process.env.MODELS_DIR) : path.join(__dirname, '..', 'models');
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
  const { chatLog, concepts = [] } = getCollections();
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
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const links = [];
  for (const [key, weight] of edges.entries()) {
    const [a, b] = key.split('|');
    if (wordSet.has(a) && wordSet.has(b) && weight >= 2) {
      links.push({ from: a, to: b, value: weight });
    }
  }

  const conceptSummaries = [];
  for (const concept of concepts) {
    if (!concept || !concept.totalMentions) continue;
    const sentimentAvg = concept.sentiment?.average ?? 0;
    const sentimentLabel = sentimentAvg > 0.2 ? 'positive' : sentimentAvg < -0.2 ? 'negative' : 'neutral';
    const importanceScore = concept.importanceScore || 0;
    const nodeId = concept.id || concept.key || concept.name;
    const conceptNode = {
      id: nodeId,
      label: concept.name,
      value: Math.max(1, Math.round(concept.totalMentions + importanceScore)),
      group: 'concept',
      sentiment: sentimentLabel,
    };
    nodeMap.set(conceptNode.id, conceptNode);

    const keywordEntries = Object.entries(concept.keywords || {})
      .sort((a, b) => (b[1]?.count || 0) - (a[1]?.count || 0))
      .slice(0, 6);
    for (const [word, info] of keywordEntries) {
      const weight = info?.count || 1;
      if (!nodeMap.has(word)) {
        nodeMap.set(word, { id: word, label: word, value: weight, group: 'language' });
      }
      links.push({ from: conceptNode.id, to: word, value: Math.max(1, weight), type: 'concept-word' });
    }

    conceptSummaries.push({
      id: nodeId,
      name: concept.name,
      category: concept.category,
      totalMentions: concept.totalMentions,
      importance: concept.importance,
      importanceScore,
      sentiment: { average: sentimentAvg, label: sentimentLabel },
      keywords: keywordEntries.map(([word, info]) => ({ word, count: info?.count || 0 })),
      levelRange: concept.levelRange,
      lastSeen: concept.lastSeen,
    });
  }

  res.json({ nodes: Array.from(nodeMap.values()), links, concepts: conceptSummaries });
});

app.get('/api/memories', (req, res) => {
  const { memories } = getCollections();
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 200));
  const items = memories.slice(-limit).reverse();
  res.json({ memories: items, total: memories.length });
});

app.get('/api/journal', (req, res) => {
  const { journal } = getCollections();
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 50, MAX_JOURNAL_ENTRIES));
  const items = journal.slice(-limit).reverse();
  res.json({ thoughts: items, total: journal.length });
});

const PORT = process.env.PORT || 3001;
let server = null;

function finalizeShutdown(code = 0) {
  closeLogStreams();
  process.exit(code);
}

let shuttingDown = false;
function gracefulShutdown(reason = 'signal') {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Graceful shutdown triggered by ${reason}`);

  const timeout = setTimeout(() => {
    console.warn('Shutdown timed out; forcing exit');
    finalizeShutdown(1);
  }, 5000);
  timeout.unref();

  if (server && server.listening) {
    server.close((err) => {
      if (err) {
        console.error('Error while closing HTTP server', err);
        return finalizeShutdown(1);
      }
      finalizeShutdown(0);
    });
    return;
  }

  finalizeShutdown(0);
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.once(signal, () => gracefulShutdown(signal));
});

process.once('uncaughtException', (err) => {
  console.error('Uncaught exception', err);
  gracefulShutdown('uncaughtException');
});

process.once('unhandledRejection', (reason) => {
  console.error('Unhandled rejection', reason);
  gracefulShutdown('unhandledRejection');
});

server = app.listen(PORT, () => console.log(`MyPal backend listening on http://localhost:${PORT}`));
