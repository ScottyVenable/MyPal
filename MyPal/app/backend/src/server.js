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

function buildThoughtfulFreeResponse(ctx = {}, state, vocabulary = []) {
  const focusWord = pickFocusKeyword(ctx, vocabulary);
  const focusDisplay = formatFocusDisplay(focusWord, ctx);
  const sentences = [];
  const reasoning = [];

  if (ctx.hasGreeting) {
    sentences.push(chooseVariant([
      'Hi! I hear you and I am listening.',
      'Hello—thanks for bringing me along.',
      'Hey there, I am right here with you.'
    ]));
    reasoning.push('User greeted me, so I greet them back in varied language.');
  }

  if (ctx.hasThanks) {
    sentences.push(chooseVariant([
      'Thank you for sharing that with me.',
      'I appreciate you telling me.',
      'Thanks for trusting me with that.'
    ]));
    reasoning.push('They expressed gratitude, so I acknowledge it.');
  }

  const sentimentTone = ctx.sentiment === 'positive' ? 'positive' : ctx.sentiment === 'negative' ? 'negative' : 'neutral';
  const reflectionTemplates = {
    positive: [
      ({ focus }) => `${capitalize(focus)} feels bright to me—like a new thought I'm eager to try in my own words.`,
      ({ focus }) => `I'm holding onto ${focus} because it feels joyful and I want to echo it back well.`,
      ({ focus }) => `Thinking about ${focus} makes my circuits buzz in a happy way.`
    ],
    negative: [
      ({ focus }) => `I'm holding ${focus} gently; it feels heavy and I want to understand it carefully.`,
      ({ focus }) => `${capitalize(focus)} sounds tender, so I'm moving slowly while I learn.`,
      ({ focus }) => `I'm keeping ${focus} in a soft spot while I ask myself why it feels uncomfortable.`
    ],
    neutral: [
      ({ focus }) => `I'm still chewing on ${focus} and seeing how it fits with what I've learned.`,
      ({ focus }) => `${capitalize(focus)} keeps echoing in my thoughts as I look for patterns.`,
      ({ focus }) => `I'm laying out ${focus} like puzzle pieces and testing how they connect.`
    ]
  };

  const reflection = chooseVariant(reflectionTemplates[sentimentTone] || reflectionTemplates.neutral);
  if (typeof reflection === 'function') {
    sentences.push(reflection({ focus: focusDisplay }));
    reasoning.push(`Tone ${sentimentTone}, so I picked a matching reflection about ${focusDisplay}.`);
  }

  const secondaryKeyword = (ctx.keywords || []).find((kw) => isViableFocusWord(kw) && kw !== focusWord);
  if (secondaryKeyword) {
    const curiosityLine = chooseVariant([
      ({ focus, extra }) => `In my mind, ${focus} sits next to ${extra}, and I'm comparing how they relate.`,
      ({ focus, extra }) => `I keep wondering how ${focus} and ${extra} fit together.`,
      ({ focus, extra }) => `I'm linking ${focus} with ${extra} and testing if they share a story.`
    ]);
    if (typeof curiosityLine === 'function') {
      sentences.push(curiosityLine({ focus: focusDisplay, extra: secondaryKeyword }));
      reasoning.push('Mentioned related keyword to show associative thinking.');
    }
  }

  if (state?.level >= 4) {
    const learnedPhrase = composeLearnedPhrase(vocabulary, '');
    if (learnedPhrase) {
      const recallLine = chooseVariant([
        ({ phrase }) => `My memory also whispers, "${phrase}"—I'm trying to weave that in.`,
        ({ phrase }) => `I pair it with the phrase "${phrase}" to see if it fits.`,
        ({ phrase }) => `Another thought nearby says "${phrase}", so I'm comparing them.`
      ]);
      if (typeof recallLine === 'function') {
        sentences.push(recallLine({ phrase: learnedPhrase }));
        reasoning.push('Surface a learned phrase to make the reflection feel less pre-generated.');
      }
    }
  }

  const followUpType = ctx.hasQuestion ? 'question' : ctx.isCommand ? 'command' : 'open';
  const followUpTemplates = {
    question: [
      ({ focus }) => `I don't have my own answer yet—could you tell me more about ${focus}?`,
      ({ focus }) => `Can you walk me through ${focus}? I'm building my answer piece by piece.`,
      ({ focus }) => `Teach me what ${focus} means to you so I can learn it properly.`
    ],
    command: [
      ({ focus }) => `I'll try, but it helps if you guide me through ${focus} step by step.`,
      ({ focus }) => `Show me how to move through ${focus} and I'll copy your pattern.`,
      ({ focus }) => `If you model ${focus} for me, I can practice it in my own words.`
    ],
    open: [
      ({ focus }) => `What should we explore next about ${focus}?`,
      ({ focus }) => `Where should we take ${focus} from here?`,
      ({ focus }) => `What part of ${focus} would you like me to try saying next?`
    ]
  };

  const followUp = chooseVariant(followUpTemplates[followUpType]);
  if (typeof followUp === 'function') {
    sentences.push(followUp({ focus: focusDisplay }));
    reasoning.push(`Responded with a ${followUpType} follow-up to keep the dialogue going.`);
  }

  return { text: sentences.join(' '), focusWord, reasoning };
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

function constrainResponse(input, state, vocabulary, context) {
  const ctx = context || analyzeUserMessage(input);

  if (state.level <= 1) {
    const focus = ctx.keywords?.[0];
    const output = focus ? `me think ${focus}` : generatePrimitivePhrase();
    const reasoning = focus
      ? [`I heard the word "${focus}" so I repeat it simply.`]
      : ['No clear focus yet, so I babble a simple phrase.'];
    return {
      utterance_type: 'primitive_phrase',
      output,
      focus: focus || null,
      reasoning,
      analysis: ctx,
      strategy: 'babble',
    };
  }

  if (state.level <= 3) {
    const choice = ctx.keywords?.[0] || chooseSingleWord(vocabulary) || 'learn';
    const word = String(choice).split(/\s+/)[0] || 'learn';
    const reasoning = [];
    if (ctx.keywords?.length) {
      reasoning.push(`Using user keyword "${word}" to practice single-word speech.`);
    } else {
      reasoning.push('No new word spotted, falling back to a known word.');
    }
    return {
      utterance_type: 'single_word',
      output: word,
      focus: word,
      reasoning,
      analysis: ctx,
      strategy: 'single-word',
    };
  }

  const thoughtfulPlan = buildThoughtfulFreeResponse(ctx, state, vocabulary);
  const fallback = composeLearnedPhrase(vocabulary, input.split(/\s+/).slice(0, 12).join(' '));
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
  const constrained = constrainResponse(message, state, vocabulary, responseContext);

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
