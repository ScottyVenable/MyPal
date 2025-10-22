import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import util from 'util';
import { WebSocketServer } from 'ws';
import ProfileManager from './profileManager.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = (process.env.MYPAL_DATA_DIR || process.env.DATA_DIR) ? path.resolve(process.env.MYPAL_DATA_DIR || process.env.DATA_DIR) : path.join(__dirname, '..', 'data');
const LOGS_DIR = (process.env.MYPAL_LOGS_DIR || process.env.LOGS_DIR) ? path.resolve(process.env.MYPAL_LOGS_DIR || process.env.LOGS_DIR) : path.join(__dirname, '..', '..', '..', 'logs');

// Initialize ProfileManager
const profileManager = new ProfileManager(DATA_DIR);

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

const formatArgs = (args) => stripEmojis(args.map((arg) => typeof arg === 'string' ? arg : util.inspect(arg, { depth: null })).join(' '));

// Strip emojis and other Unicode symbols for clean file logging
function stripEmojis(text) {
  return text.replace(/[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2018}\u{2019}\u{201C}\u{201D}]|≡ƒ[ô¿ñöôñ]/gu, '');
}

function writeLine(stream, level, line) {
  if (!stream) return;
  try {
    const cleanLine = stripEmojis(line);
    stream.write(`${new Date().toISOString()} [${level}] ${cleanLine}\n`);
  } catch {}
}

const originalLog = console.log.bind(console);
const originalInfo = console.info ? console.info.bind(console) : originalLog;
const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

console.log = (...args) => {
  try {
    const line = formatArgs(args);
    writeLine(consoleStream, 'LOG', line);
    originalLog(...args);
  } catch (err) {
    // Ignore EPIPE errors when console output fails
  }
};

console.info = (...args) => {
  try {
    const line = formatArgs(args);
    writeLine(consoleStream, 'INFO', line);
    originalInfo(...args);
  } catch (err) {
    // Ignore EPIPE errors
  }
};

console.warn = (...args) => {
  try {
    const line = formatArgs(args);
    writeLine(consoleStream, 'WARN', line);
    originalWarn(...args);
  } catch (err) {
    // Ignore EPIPE errors
  }
};

console.error = (...args) => {
  try {
    const line = formatArgs(args);
    writeLine(consoleStream, 'ERROR', line);
    writeLine(errorStream, 'ERROR', line);
    originalError(...args);
  } catch (err) {
    // Ignore EPIPE errors
  }
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
  try { 
    // Clean emojis from telemetry data
    const cleanEvent = { ...event };
    if (cleanEvent.message && typeof cleanEvent.message === 'string') {
      cleanEvent.message = stripEmojis(cleanEvent.message);
    }
    if (cleanEvent.category && typeof cleanEvent.category === 'string') {
      cleanEvent.category = stripEmojis(cleanEvent.category);
    }
    fs.appendFileSync(telemetryLogPath, JSON.stringify({ ts: Date.now(), ...cleanEvent }) + '\n'); 
  } catch {}
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

// Common stop words that should NOT become topics/concepts or be learned as vocabulary
const STOP_WORDS = new Set([
  // Articles
  'a', 'an', 'the',
  // Pronouns
  'i', 'me', 'my', 'mine', 'myself', 'you', 'your', 'yours', 'yourself',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'we', 'us', 'our', 'ours', 'ourselves',
  'they', 'them', 'their', 'theirs', 'themselves',
  // Common verbs (be, have, do forms)
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
  // Prepositions
  'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'to', 'with',
  'about', 'above', 'across', 'after', 'against', 'along', 'among',
  'around', 'as', 'before', 'behind', 'below', 'beneath', 'beside',
  'between', 'beyond', 'during', 'except', 'inside', 'near', 'off',
  'outside', 'over', 'through', 'toward', 'under', 'until', 'up', 'upon',
  'within', 'without',
  // Conjunctions
  'and', 'but', 'or', 'nor', 'so', 'yet', 'because', 'if', 'when',
  'where', 'while', 'although', 'though', 'unless', 'since', 'than',
  // Common adverbs
  'very', 'too', 'also', 'just', 'still', 'even', 'only', 'quite',
  'rather', 'really', 'then', 'there', 'here', 'now', 'well',
  // Question words
  'what', 'which', 'who', 'whom', 'whose', 'why', 'how',
  // Other common words
  'can', 'could', 'may', 'might', 'must', 'shall', 'should', 'will', 'would',
  'not', "n't", 'no', 'yes', 'this', 'that', 'these', 'those',
  'some', 'any', 'all', 'both', 'each', 'every', 'either', 'neither',
  'more', 'most', 'much', 'many', 'few', 'less', 'little', 'other', 'another',
  'such', 'own', 'same', 'so', 'than', 'too'
]);

const defaultState = {
  level: 0,
  xp: 0,
  cp: 0,
  settings: { xpMultiplier: 1, apiProvider: 'local', apiKeyMask: null },
  personality: { curious: 10, logical: 10, social: 10, agreeable: 10, cautious: 10 },
  vocabulary: [], // quick cache of top learned words
};

// Map detailed utterance types to broad kinds expected by clients/tests
function mapUtteranceKind(utteranceType, output, level) {
  try {
    const text = String(output || '').trim();
    if (text.length > 0) {
      const words = text.split(/\s+/);
      if (words.length <= 1) return 'single_word';
    }
    if (typeof level === 'number' && level < 4) return 'primitive_phrase';
    return 'free';
  } catch {
    return 'free';
  }
}

// Files object - supports both per-profile and fallback root data when no profile is active
// Keep users/sessions in DATA_DIR root (shared across profiles)
const files = {
  // Fallback root files (when no current profile is selected)
  state: path.join(DATA_DIR, 'state.json'),
  users: path.join(DATA_DIR, 'users.json'),
  sessions: path.join(DATA_DIR, 'sessions.json'),
  vocabulary: path.join(DATA_DIR, 'vocabulary.json'),
  concepts: path.join(DATA_DIR, 'concepts.json'),
  facts: path.join(DATA_DIR, 'facts.json'),
  memories: path.join(DATA_DIR, 'memories.json'),
  journal: path.join(DATA_DIR, 'journal.json'),
  // Note: legacy filename in root uses "chatlog.json" (no hyphen)
  chatLog: path.join(DATA_DIR, 'chatlog.json'),
  // Legacy neural network filename
  neuralNetwork: path.join(DATA_DIR, 'neural_network.json'),
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
  try {
    // Ensure directory exists before writing
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing JSON file:', file, error);
    throw error; // Re-throw so callers can handle it
  }
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
  // Prefer current profile metadata; fallback to root state.json
  const currentId = profileManager.getCurrentProfileId?.() || null;
  if (currentId) {
    const metadata = profileManager.getCurrentProfileData('metadata.json');
    if (!metadata) return normalizeProgress({ ...defaultState });
    const state = {
      level: metadata.level || 0,
      xp: metadata.xp || 0,
      cp: metadata.cp || 0,
      settings: metadata.settings || defaultState.settings,
      personality: metadata.personality || defaultState.personality,
      vocabulary: metadata.vocabulary || []
    };
    return normalizeProgress({ ...defaultState, ...state });
  }
  // Fallback to root state file when no profile selected
  const root = readJson(files.state, null);
  if (!root) return normalizeProgress({ ...defaultState });
  const state = {
    level: root.level || 0,
    xp: root.xp || 0,
    cp: root.cp || 0,
    settings: root.settings || defaultState.settings,
    personality: root.personality || defaultState.personality,
    vocabulary: root.vocabulary || []
  };
  return normalizeProgress({ ...defaultState, ...state });
}

function saveState(state) {
  // Save to current profile's metadata if active, else to root state.json
  const currentId = profileManager.getCurrentProfileId?.() || null;
  if (currentId) {
    const metadata = profileManager.getCurrentProfileData('metadata.json') || {};
    metadata.level = state.level;
    metadata.xp = state.xp;
    metadata.cp = state.cp;
    metadata.settings = state.settings;
    metadata.personality = state.personality;
    metadata.vocabulary = state.vocabulary;
    profileManager.saveCurrentProfileData('metadata.json', metadata);
  } else {
    writeJson(files.state, {
      level: state.level,
      xp: state.xp,
      cp: state.cp,
      settings: state.settings,
      personality: state.personality,
      vocabulary: state.vocabulary,
    });
  }
}

function getCollections() {
  const state = loadState();
  const users = readJson(files.users, []);
  const sessions = readJson(files.sessions, []);
  
  const currentId = profileManager.getCurrentProfileId?.() || null;
  let vocabulary, memories, chatLog, journal, neuralNetwork, concepts, facts;
  if (currentId) {
    vocabulary = profileManager.getCurrentProfileData('vocabulary.json') || [];
    memories = profileManager.getCurrentProfileData('memories.json') || [];
    chatLog = profileManager.getCurrentProfileData('chat-log.json') || [];
    journal = profileManager.getCurrentProfileData('journal.json') || [];
    neuralNetwork = profileManager.getCurrentProfileData('neural.json') || null;
    concepts = profileManager.getCurrentProfileData('concepts.json') || [];
    facts = profileManager.getCurrentProfileData('facts.json') || [];
  } else {
    vocabulary = readJson(files.vocabulary, []);
    memories = readJson(files.memories, []);
    // Try both legacy and hyphenated chat log names
    chatLog = readJson(files.chatLog, readJson(path.join(DATA_DIR, 'chat-log.json'), []));
    journal = readJson(files.journal, []);
    neuralNetwork = readJson(files.neuralNetwork, null);
    concepts = readJson(files.concepts, []);
    facts = readJson(files.facts, []);
  }
  
  return { state, users, sessions, vocabulary, concepts, facts, memories, chatLog, journal, neuralNetwork };
}

function saveCollections({ state, users, sessions, vocabulary, concepts, facts, memories, chatLog, journal, neuralNetwork }) {
  saveState(state);
  writeJson(files.users, users ?? readJson(files.users, []));
  writeJson(files.sessions, sessions ?? readJson(files.sessions, []));
  
  const currentId = profileManager.getCurrentProfileId?.() || null;
  if (currentId) {
    // Save profile-specific data
    if (vocabulary) profileManager.saveCurrentProfileData('vocabulary.json', vocabulary);
    if (memories) profileManager.saveCurrentProfileData('memories.json', memories);
    if (chatLog) profileManager.saveCurrentProfileData('chat-log.json', chatLog);
    if (journal) profileManager.saveCurrentProfileData('journal.json', journal);
    if (neuralNetwork) profileManager.saveCurrentProfileData('neural.json', neuralNetwork);
    if (concepts) profileManager.saveCurrentProfileData('concepts.json', concepts);
    if (facts) profileManager.saveCurrentProfileData('facts.json', facts);
    // Update profile metadata with latest stats
    profileManager.updateProfileMetadata({
      level: state.level,
      xp: state.xp,
      messageCount: chatLog?.length || 0,
      memoryCount: memories?.length || 0
    });
  } else {
    // Fallback: persist to root data when no profile is active
    if (vocabulary) writeJson(files.vocabulary, vocabulary);
    if (memories) writeJson(files.memories, memories);
    if (chatLog) writeJson(files.chatLog, chatLog);
    if (journal) writeJson(files.journal, journal);
    if (neuralNetwork) writeJson(files.neuralNetwork, neuralNetwork);
    if (concepts) writeJson(files.concepts, concepts);
    if (facts) writeJson(files.facts, facts);
  }
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

function addXp(state, rawXp, collections = null) {
  const mult = state.settings?.xpMultiplier ?? 1;
  const gained = Math.floor(rawXp * mult);
  const previousLevel = state.level;
  state.xp += gained;
  state.cp = Math.floor(state.xp / 100);
  
  // Level up loop
  while (state.xp >= thresholdsFor(state.level)) {
    state.level += 1;
  }
  
  // Check if level increased for neural growth
  if (state.level > previousLevel && collections) {
    triggerNeuralGrowth(state.level, collections);
  }
  
  return gained;
}

/**
 * Trigger neural network growth when leveling up
 */
function triggerNeuralGrowth(newLevel, collections) {
  console.log(`[NEURAL] Neural growth triggered for level ${newLevel}`);
  
  const neuralNetwork = getNeuralNetwork(collections);
  let totalNewNeurons = 0;
  
  // Add new neurons to each region based on level
  for (const region of neuralNetwork.regions) {
    const newNeuronsForRegion = calculateNeuronGrowth(newLevel, region.regionId);
    
    if (newNeuronsForRegion > 0) {
      const newNeurons = generateRegionNeurons(region.regionId, getRegionPrefix(region.regionId), newNeuronsForRegion, newLevel);
      region.neurons.push(...newNeurons);
      totalNewNeurons += newNeuronsForRegion;
      
      // Emit growth event for visualization
      neuralNetwork.emitNeuralEvent({
        type: 'neural-growth',
        regionId: region.regionId,
        newNeurons: newNeuronsForRegion,
        level: newLevel,
        timestamp: Date.now()
      });
    }
  }
  
  // Update metrics
  neuralNetwork.updateMetrics();
  
  // Save updated neural network
  collections.neuralNetwork = neuralNetwork.toJSON();
  
  console.log(`[SUCCESS] Added ${totalNewNeurons} new neurons across all regions`);
}

/**
 * Calculate number of new neurons to add based on level and region
 */
function calculateNeuronGrowth(level, regionId) {
  const baseGrowth = {
    'sensory-input': 2,
    'language-center': 4,
    'association-cortex': 6,
    'frontal-lobe': 3,
    'amygdala': 1,
    'memory-systems': 3,
    'motor-output': 2
  };
  
  const base = baseGrowth[regionId] || 2;
  // Exponential growth that slows down at higher levels
  return Math.floor(base * (1 + level * 0.3));
}

/**
 * Get region prefix for neuron ID generation
 */
function getRegionPrefix(regionId) {
  const prefixMap = {
    'sensory-input': 'si',
    'language-center': 'lang',
    'association-cortex': 'assoc',
    'frontal-lobe': 'fl',
    'amygdala': 'amyg',
    'memory-systems': 'mem',
    'motor-output': 'mo'
  };
  
  return prefixMap[regionId] || 'unk';
}

// ========================================
// NEURAL NETWORK VISUALIZATION SYSTEM
// ========================================

/**
 * Neural Network Class
 * Manages neurons, regions, and firing patterns
 */
class NeuralNetwork {
  constructor(data) {
    this.regions = data?.regions || [];
    this.pathways = data?.pathways || [];
    this.metrics = data?.metrics || {
      totalNeurons: 0,
      neuronsByRegion: {},
      averageFiringRate: 0,
      mostActiveRegion: null,
      leastActiveRegion: null,
      totalFirings: 0,
      manualTriggers: 0
    };
    this.events = data?.events || [];
    this.activeNeurons = new Set();
    this.neuralEventCallbacks = [];
  }

  /**
   * Find a neuron by ID across all regions
   */
  findNeuron(neuronId) {
    for (const region of this.regions) {
      const neuron = region.neurons.find(n => n.id === neuronId);
      if (neuron) return { neuron, region };
    }
    return null;
  }

  /**
   * Trigger a neuron to fire
   */
  triggerNeuron(neuronId, stimulus = 1.0) {
    const found = this.findNeuron(neuronId);
    if (!found) return;

    const { neuron, region } = found;

    // Add stimulus to current activation
    neuron.currentActivation += stimulus;

    // Check if threshold reached
    if (neuron.currentActivation >= neuron.activationThreshold) {
      this.fireNeuron(neuron, region);
    }
  }

  /**
   * Fire a neuron and propagate to connected neurons
   */
  fireNeuron(neuron, region) {
    const now = Date.now();

    // Record firing
    if (!neuron.firingHistory) neuron.firingHistory = [];
    neuron.firingHistory.push({
      timestamp: now,
      intensity: neuron.currentActivation
    });

    // Keep only recent history (last 100 firings)
    if (neuron.firingHistory.length > 100) {
      neuron.firingHistory = neuron.firingHistory.slice(-100);
    }

    // Update metrics
    this.metrics.totalFirings++;

    // Emit visual event
    this.emitNeuralEvent({
      type: 'neuron-fire',
      neuronId: neuron.id,
      regionId: region.regionId,
      regionColor: region.color,
      intensity: neuron.currentActivation,
      timestamp: now
    });

    // Propagate to connected neurons
    if (neuron.connections) {
      for (const connection of neuron.connections) {
        // Calculate signal strength
        const signal = neuron.currentActivation * connection.weight;

        // Emit connection signal event
        this.emitNeuralEvent({
          type: 'connection-signal',
          fromNeuronId: neuron.id,
          toNeuronId: connection.targetNeuronId,
          signal: signal,
          latency: connection.latency || 50,
          timestamp: now
        });

        // Schedule propagation with latency (use setImmediate for testing)
        setImmediate(() => {
          this.triggerNeuron(connection.targetNeuronId, signal);
        });
      }
    }

    // Reset to resting potential
    neuron.currentActivation = neuron.restingPotential || 0;

    // Add to active set for visualization
    this.activeNeurons.add(neuron.id);
    setTimeout(() => {
      this.activeNeurons.delete(neuron.id);
    }, 500);
  }

  /**
   * Trigger a pathway (multiple neurons in sequence)
   */
  triggerPathway(pathwayDefinition) {
    const { neurons, pattern } = pathwayDefinition;

    if (pattern === 'sequential') {
      // Fire neurons one after another
      let delay = 0;
      for (const neuronId of neurons) {
        setTimeout(() => {
          this.triggerNeuron(neuronId, 1.0);
        }, delay);
        delay += 100; // 100ms between each
      }
    } else if (pattern === 'parallel') {
      // Fire all at once
      for (const neuronId of neurons) {
        this.triggerNeuron(neuronId, 1.0);
      }
    } else if (pattern === 'cascade') {
      // Fire first, let it propagate naturally
      if (neurons.length > 0) {
        this.triggerNeuron(neurons[0], 1.5);
      }
    }
  }

  /**
   * Emit neural event to all registered callbacks
   */
  emitNeuralEvent(event) {
    // Store event in history
    this.events.push(event);
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // Notify callbacks (for WebSocket, etc.)
    for (const callback of this.neuralEventCallbacks) {
      try {
        callback(event);
      } catch (err) {
        console.error('Neural event callback error:', err);
      }
    }
  }

  /**
   * Register a callback for neural events
   */
  onNeuralEvent(callback) {
    this.neuralEventCallbacks.push(callback);
  }

  /**
   * Update metrics after activity
   */
  updateMetrics() {
    // Count neurons by region
    this.metrics.neuronsByRegion = {};
    this.metrics.totalNeurons = 0;

    for (const region of this.regions) {
      const count = region.neurons.length;
      this.metrics.neuronsByRegion[region.regionId] = count;
      this.metrics.totalNeurons += count;
    }

    // Find most/least active regions (simplified)
    let maxActivity = 0;
    let minActivity = Infinity;
    for (const region of this.regions) {
      const activity = region.activityLevel || 0;
      if (activity > maxActivity) {
        maxActivity = activity;
        this.metrics.mostActiveRegion = region.regionId;
      }
      if (activity < minActivity) {
        minActivity = activity;
        this.metrics.leastActiveRegion = region.regionId;
      }
    }
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      regions: this.regions,
      pathways: this.pathways,
      metrics: this.metrics,
      events: this.events.slice(-100) // Only save recent events
    };
  }
}

/**
 * Initialize default neural network structure
 */
function initializeNeuralNetwork(level = 0) {
  console.log('[NEURAL] Initializing neural network...');

  const regions = [
    {
      regionId: 'sensory-input',
      regionName: 'Sensory Input',
      position: { x: 100, y: 50 },
      color: '#64b5f6',
      size: { width: 150, height: 100 },
      neurons: generateRegionNeurons('sensory-input', 'si', 20, level),
      activityLevel: 0,
      developedAtLevel: 0
    },
    {
      regionId: 'language-center',
      regionName: 'Language Center',
      position: { x: 50, y: 200 },
      color: '#9c27b0',
      size: { width: 200, height: 150 },
      neurons: generateRegionNeurons('language-center', 'lang', 50, level),
      activityLevel: 0,
      developedAtLevel: 0
    },
    {
      regionId: 'association-cortex',
      regionName: 'Association Cortex',
      position: { x: 300, y: 200 },
      color: '#66bb6a',
      size: { width: 250, height: 200 },
      neurons: generateRegionNeurons('association-cortex', 'assoc', 80, level),
      activityLevel: 0,
      developedAtLevel: 0
    },
    {
      regionId: 'frontal-lobe',
      regionName: 'Frontal Lobe',
      position: { x: 300, y: 50 },
      color: '#5b6fd8',
      size: { width: 200, height: 120 },
      neurons: generateRegionNeurons('frontal-lobe', 'fl', 40, level),
      activityLevel: 0,
      developedAtLevel: 0
    },
    {
      regionId: 'amygdala',
      regionName: 'Amygdala',
      position: { x: 100, y: 450 },
      color: '#e91e63',
      size: { width: 120, height: 80 },
      neurons: generateRegionNeurons('amygdala', 'amyg', 15, level),
      activityLevel: 0,
      developedAtLevel: 0
    },
    {
      regionId: 'memory-systems',
      regionName: 'Memory Systems',
      position: { x: 450, y: 450 },
      color: '#ff9800',
      size: { width: 180, height: 120 },
      neurons: generateRegionNeurons('memory-systems', 'mem', 35, level),
      activityLevel: 0,
      developedAtLevel: 0
    },
    {
      regionId: 'motor-output',
      regionName: 'Motor Output',
      position: { x: 300, y: 600 },
      color: '#00bcd4',
      size: { width: 150, height: 100 },
      neurons: generateRegionNeurons('motor-output', 'mo', 25, level),
      activityLevel: 0,
      developedAtLevel: 0
    }
  ];

  // Create connections between regions
  createInterRegionConnections(regions);

  const network = new NeuralNetwork({
    regions,
    pathways: [],
    metrics: {
      totalNeurons: 0,
      neuronsByRegion: {},
      averageFiringRate: 0,
      mostActiveRegion: null,
      leastActiveRegion: null,
      totalFirings: 0,
      manualTriggers: 0
    },
    events: []
  });

  network.updateMetrics();
  console.log(`[SUCCESS] Neural network initialized with ${network.metrics.totalNeurons} neurons`);

  return network;
}

/**
 * Generate neurons for a region
 */
function generateRegionNeurons(regionId, prefix, count, level) {
  const neurons = [];

  for (let i = 0; i < count; i++) {
    const neuron = {
      id: `neuron-${prefix}-${String(i + 1).padStart(3, '0')}`,
      position: { x: Math.random() * 100, y: Math.random() * 100 },
      type: Math.random() < 0.8 ? 'excitatory' : 'inhibitory',
      activationThreshold: 0.5 + Math.random() * 0.3,
      currentActivation: 0,
      restingPotential: 0,
      connections: [],
      firingHistory: [],
      developedAtLevel: level
    };

    neurons.push(neuron);
  }

  // Create intra-region connections (each neuron connects to 2-5 others in same region)
  for (const neuron of neurons) {
    const connectionCount = 2 + Math.floor(Math.random() * 4);
    const connected = new Set([neuron.id]);

    for (let i = 0; i < connectionCount; i++) {
      const target = neurons[Math.floor(Math.random() * neurons.length)];
      if (!connected.has(target.id) && target.id !== neuron.id) {
        neuron.connections.push({
          targetNeuronId: target.id,
          weight: 0.3 + Math.random() * 0.5,
          type: neuron.type,
          latency: 20 + Math.floor(Math.random() * 30)
        });
        connected.add(target.id);
      }
    }
  }

  return neurons;
}

/**
 * Create connections between different brain regions
 */
function createInterRegionConnections(regions) {
  const regionMap = {};
  for (const region of regions) {
    regionMap[region.regionId] = region;
  }

  // Define inter-region pathways
  const connections = [
    { from: 'sensory-input', to: 'language-center', count: 5 },
    { from: 'sensory-input', to: 'association-cortex', count: 3 },
    { from: 'language-center', to: 'association-cortex', count: 8 },
    { from: 'language-center', to: 'motor-output', count: 4 },
    { from: 'association-cortex', to: 'frontal-lobe', count: 6 },
    { from: 'association-cortex', to: 'memory-systems', count: 5 },
    { from: 'association-cortex', to: 'amygdala', count: 3 },
    { from: 'frontal-lobe', to: 'motor-output', count: 5 },
    { from: 'amygdala', to: 'frontal-lobe', count: 2 },
    { from: 'memory-systems', to: 'association-cortex', count: 4 }
  ];

  for (const conn of connections) {
    const fromRegion = regionMap[conn.from];
    const toRegion = regionMap[conn.to];

    if (!fromRegion || !toRegion) continue;

    // Create random connections between neurons in these regions
    for (let i = 0; i < conn.count; i++) {
      const fromNeuron = fromRegion.neurons[Math.floor(Math.random() * fromRegion.neurons.length)];
      const toNeuron = toRegion.neurons[Math.floor(Math.random() * toRegion.neurons.length)];

      fromNeuron.connections.push({
        targetNeuronId: toNeuron.id,
        weight: 0.5 + Math.random() * 0.4,
        type: 'excitatory',
        latency: 30 + Math.floor(Math.random() * 50)
      });
    }
  }
}

/**
 * Get or initialize neural network from state
 */
function getNeuralNetwork(collections) {
  let { neuralNetwork } = collections;

  if (!neuralNetwork) {
    // Initialize for the first time
    const network = initializeNeuralNetwork(collections.state?.level || 0);
    neuralNetwork = network.toJSON();
    collections.neuralNetwork = neuralNetwork;
    
    // Immediately save the newly initialized neural network to ensure profile isolation
    saveCollections(collections);
  }

  // Return as NeuralNetwork instance
  return new NeuralNetwork(neuralNetwork);
}

/**
 * Neural pattern definitions
 */
const neuralPatterns = {
  'receive-message': {
    regions: ['sensory-input'],
    pattern: 'burst',
    neurons: 8
  },
  'process-language': {
    regions: ['language-center', 'association-cortex'],
    pattern: 'sustained',
    neurons: 15
  },
  'emotional-response': {
    regions: ['amygdala', 'frontal-lobe'],
    pattern: 'burst',
    neurons: 8
  },
  'memory-recall': {
    regions: ['memory-systems', 'association-cortex'],
    pattern: 'wave',
    neurons: 12
  },
  'decision-making': {
    regions: ['frontal-lobe', 'association-cortex'],
    pattern: 'deliberate',
    neurons: 10
  },
  'generate-response': {
    regions: ['language-center', 'motor-output'],
    pattern: 'sequential',
    neurons: 12
  },
  'learning': {
    regions: ['language-center', 'memory-systems', 'association-cortex'],
    pattern: 'strengthening',
    neurons: 10
  }
};

/**
 * Activate a neural pattern
 */
function activateNeuralPattern(taskType, neuralNetwork) {
  const pattern = neuralPatterns[taskType];
  if (!pattern) return;

  console.log(`[NEURAL] Activating neural pattern: ${taskType}`);

  // Find neurons in specified regions
  const targetNeurons = [];
  for (const regionName of pattern.regions) {
    const region = neuralNetwork.regions.find(r => r.regionId.includes(regionName));
    if (region && region.neurons) {
      // Select random neurons from this region
      const count = Math.min(pattern.neurons, region.neurons.length);
      const shuffled = [...region.neurons].sort(() => Math.random() - 0.5);
      targetNeurons.push(...shuffled.slice(0, count));
    }
  }

  if (targetNeurons.length === 0) return;

  // Trigger based on pattern
  if (pattern.pattern === 'burst' || pattern.pattern === 'sustained') {
    // All neurons fire
    for (const neuron of targetNeurons) {
      neuralNetwork.triggerNeuron(neuron.id, 1.0);
    }
  } else if (pattern.pattern === 'sequential') {
    // Neurons fire in order with delay
    targetNeurons.forEach((neuron, index) => {
      setTimeout(() => {
        neuralNetwork.triggerNeuron(neuron.id, 1.0);
      }, index * 50);
    });
  } else if (pattern.pattern === 'wave') {
    // Fire in multiple waves
    for (let wave = 0; wave < 2; wave++) {
      setTimeout(() => {
        for (const neuron of targetNeurons) {
          if (Math.random() < 0.6) {
            neuralNetwork.triggerNeuron(neuron.id, 0.7);
          }
        }
      }, wave * 150);
    }
  } else if (pattern.pattern === 'deliberate' || pattern.pattern === 'strengthening') {
    // Controlled firing
    for (const neuron of targetNeurons) {
      neuralNetwork.triggerNeuron(neuron.id, 0.8);
    }
  }
}

// ========================================
// END NEURAL NETWORK SYSTEM
// ========================================

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

function determineEmotionalState(constrained, responseContext, state) {
  const strategy = constrained.strategy || '';
  const utteranceType = constrained.utterance_type || '';
  const userSentiment = responseContext.sentiment || 'neutral';
  const level = state.level || 0;
  
  // Emotional state has: mood, intensity (0-1), expression
  const emotionalState = {
    mood: 'neutral',
    intensity: 0.5,
    expression: '😊',
    description: 'calm',
  };
  
  // Determine mood based on strategy and context
  if (strategy.includes('emotional-resonance') || strategy.includes('emotional-echo')) {
    // Mirroring user's emotion
    if (userSentiment === 'positive') {
      emotionalState.mood = 'happy';
      emotionalState.expression = level < 2 ? '😊' : level < 5 ? '😄' : '🥰';
      emotionalState.description = level < 2 ? 'feeling good' : level < 5 ? 'happy' : 'joyful';
      emotionalState.intensity = 0.7;
    } else if (userSentiment === 'negative') {
      emotionalState.mood = 'concerned';
      emotionalState.expression = level < 2 ? '😟' : level < 5 ? '😢' : '🥺';
      emotionalState.description = level < 2 ? 'sensing sadness' : level < 5 ? 'concerned' : 'empathetic';
      emotionalState.intensity = 0.6;
    }
  } else if (strategy.includes('curiosity') || strategy.includes('inquiry') || strategy.includes('cognitive')) {
    emotionalState.mood = 'curious';
    emotionalState.expression = level < 2 ? '🤔' : level < 5 ? '🧐' : '💭';
    emotionalState.description = level < 2 ? 'wondering' : level < 5 ? 'curious' : 'thinking deeply';
    emotionalState.intensity = 0.6;
  } else if (strategy.includes('empathy') || strategy.includes('comfort') || strategy.includes('prosocial')) {
    emotionalState.mood = 'caring';
    emotionalState.expression = level < 2 ? '💙' : level < 5 ? '🤗' : '💖';
    emotionalState.description = level < 2 ? 'caring' : level < 5 ? 'supportive' : 'deeply caring';
    emotionalState.intensity = 0.7;
  } else if (strategy.includes('exploration') || strategy.includes('awakening')) {
    emotionalState.mood = 'curious';
    emotionalState.expression = level < 1 ? '👀' : level < 3 ? '✨' : '🌟';
    emotionalState.description = level < 1 ? 'awakening' : level < 3 ? 'exploring' : 'discovering';
    emotionalState.intensity = 0.5;
  } else if (strategy.includes('social') || strategy.includes('greeting') || strategy.includes('reciprocity')) {
    emotionalState.mood = 'friendly';
    emotionalState.expression = level < 2 ? '👋' : level < 5 ? '😊' : '🌈';
    emotionalState.description = level < 2 ? 'noticing you' : level < 5 ? 'friendly' : 'warm & welcoming';
    emotionalState.intensity = 0.6;
  } else if (strategy.includes('vocabulary') || strategy.includes('learning') || strategy.includes('word')) {
    emotionalState.mood = 'focused';
    emotionalState.expression = level < 2 ? '📚' : level < 5 ? '🎓' : '🧠';
    emotionalState.description = level < 2 ? 'listening' : level < 5 ? 'learning' : 'studying intently';
    emotionalState.intensity = 0.6;
  } else if (utteranceType.includes('emotional') || utteranceType.includes('affective')) {
    // General emotional expression
    if (userSentiment === 'positive' || constrained.output?.includes('happy') || constrained.output?.includes('good')) {
      emotionalState.mood = 'happy';
      emotionalState.expression = level < 3 ? '😊' : '😄';
      emotionalState.description = level < 3 ? 'happy' : 'delighted';
      emotionalState.intensity = 0.7;
    } else {
      emotionalState.mood = 'reflective';
      emotionalState.expression = '🤔';
      emotionalState.description = 'thoughtful';
      emotionalState.intensity = 0.5;
    }
  }
  
  return emotionalState;
}

function tokenizeMessage(text) {
  // Extract words (2+ alphabetic characters)
  const rawWords = (String(text || '').toLowerCase().match(/\*?[a-z]{2,}\*?/g) || []).slice(0, 40);
  
  // Filter out:
  // 1. Actions (words wrapped in asterisks like *blink* or *smile*)
  // 2. Stop words (articles, pronouns, common words)
  // 3. Very short words (unless they're meaningful)
  const meaningfulWords = rawWords.filter(word => {
    // Remove asterisks for checking
    const cleaned = word.replace(/\*/g, '');
    
    // Skip if it was wrapped in asterisks (action)
    if (word.startsWith('*') || word.endsWith('*')) {
      return false;
    }
    
    // Skip stop words
    if (STOP_WORDS.has(cleaned)) {
      return false;
    }
    
    // Skip very short words unless mapped as concepts
    if (cleaned.length < 3 && !KEYWORD_TO_CONCEPT.get(cleaned)) {
      return false;
    }
    
    return true;
  });
  
  return meaningfulWords;
}

/**
 * Extract quoted phrases from user input for direct learning.
 * Detects both single quotes ('hello') and double quotes ("hello world").
 * Returns array of { phrase, type } objects where type is 'single' or 'double'.
 */
function extractQuotedPhrases(text) {
  if (!text || typeof text !== 'string') return [];
  
  const quotedPhrases = [];
  
  // Match double quotes: "phrase"
  const doubleQuoteRegex = /"([^"]+)"/g;
  let match;
  while ((match = doubleQuoteRegex.exec(text)) !== null) {
    const phrase = match[1].trim();
    if (phrase.length > 0) {
      quotedPhrases.push({ phrase, type: 'double', raw: match[0] });
    }
  }
  
  // Match single quotes: 'phrase' (but avoid contractions like "don't")
  const singleQuoteRegex = /'([^']+)'/g;
  while ((match = singleQuoteRegex.exec(text)) !== null) {
    const phrase = match[1].trim();
    // Filter out likely contractions (single letters or very short)
    if (phrase.length > 1) {
      quotedPhrases.push({ phrase, type: 'single', raw: match[0] });
    }
  }
  
  return quotedPhrases;
}

/**
 * Learn quoted phrases as high-priority vocabulary items.
 * These are treated as direct speech examples that should be learned verbatim.
 */
function learnQuotedPhrases(vocabulary, quotedPhrases, level, state) {
  if (!quotedPhrases || !quotedPhrases.length) return;
  
  const now = Date.now();
  
  for (const { phrase, type } of quotedPhrases) {
    // Find or create a special vocabulary entry for quoted phrases
    let entry = vocabulary.find((item) => item.word === phrase && item.isQuoted);
    
    if (!entry) {
      entry = {
        id: nanoid(),
        word: phrase,
        count: 0,
        knownBy: { user: 0, pal: 0 },
        lastSeen: now,
        contexts: [],
        isQuoted: true, // Mark as a quoted phrase
        quoteType: type,
        learnedAtLevel: level,
      };
      vocabulary.push(entry);
    }
    
    // Give quoted phrases extra weight to prioritize them
    const learningBonus = Math.min(10, Math.floor(level / 2) + 3);
    entry.count += learningBonus;
    entry.knownBy.user = (entry.knownBy.user || 0) + learningBonus;
    entry.lastSeen = now;
    
    // Store the phrase as a teaching context
    if (!entry.contexts) entry.contexts = [];
    entry.contexts.unshift(`Taught: "${phrase}"`);
    if (entry.contexts.length > 5) entry.contexts.length = 5;
  }
}

/**
 * Detect correction patterns in user input.
 * Patterns like: "We do not say X, we say Y" or "Don't say X, say Y instead"
 * Returns: { incorrect: string, correct: string } or null
 */
/**
 * Detect definitional learning patterns: "X means Y"
 * This captures when the user teaches Pal by defining what something means.
 * 
 * Examples:
 * - "Question means we want to learn"
 * - "Question means we are wondering"
 * - "Happy means feeling good"
 * - "A dog is an animal that barks"
 */
function detectDefinition(text) {
  if (!text || typeof text !== 'string') return null;
  
  const definitions = [];
  
  // Pattern 1: "X means Y"
  const meansPattern = /([a-zA-Z]+(?:\s+[a-zA-Z]+)*?)\s+means\s+(.+?)(?:\.|$)/gi;
  let match;
  while ((match = meansPattern.exec(text)) !== null) {
    const concept = match[1].trim();
    let definition = match[2].trim();
    
    // Clean up the definition (remove trailing punctuation if any)
    definition = definition.replace(/[.,!?]+$/, '').trim();
    
    if (concept && definition) {
      definitions.push({
        concept: concept.toLowerCase(),
        definition: definition,
        fullMatch: match[0]
      });
    }
  }
  
  // Pattern 2: "X is Y" (definitional, not conversational)
  // Only match if it looks like a definition (starts with "A/An" or concept is capitalized)
  const isPattern = /(?:^|[.!?]\s+)(?:a|an)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*?)\s+is\s+(.+?)(?:\.|$)/gi;
  while ((match = isPattern.exec(text)) !== null) {
    const concept = match[1].trim();
    let definition = match[2].trim();
    
    definition = definition.replace(/[.,!?]+$/, '').trim();
    
    if (concept && definition) {
      definitions.push({
        concept: concept.toLowerCase(),
        definition: definition,
        fullMatch: match[0]
      });
    }
  }
  
  return definitions.length > 0 ? definitions : null;
}

/**
 * Learn from definitions by storing the definition as part of the concept's knowledge.
 * This creates strong, structured understanding of what things mean.
 */
function learnFromDefinition(vocabulary, definitions, level, state) {
  if (!definitions || !definitions.length) return;
  
  const now = Date.now();
  const nowISO = new Date(now).toISOString();
  
  for (const { concept, definition } of definitions) {
    console.log(`[LEARN] Definition detected: "${concept}" means "${definition}"`);
    
    // Find or create the concept entry
    let conceptEntry = vocabulary.find((item) => item.word === concept);
    
    if (!conceptEntry) {
      conceptEntry = {
        id: nanoid(),
        word: concept,
        count: 0,
        knownBy: { user: 0, pal: 0 },
        lastSeen: now,
        contexts: [],
        learnedAtLevel: level,
        confidence: 1.0,
      };
      vocabulary.push(conceptEntry);
    }
    
    // Give strong reinforcement for definitional learning
    const learningBonus = Math.min(15, Math.floor(level / 2) + 8);
    conceptEntry.count += learningBonus;
    conceptEntry.knownBy.user = (conceptEntry.knownBy.user || 0) + learningBonus;
    conceptEntry.lastSeen = now;
    
    // Store the definition as structured knowledge
    if (!conceptEntry.definitions) {
      conceptEntry.definitions = [];
    }
    
    // Add the new definition
    conceptEntry.definitions.push({
      definition: definition,
      learnedAt: nowISO,
      learnedAtLevel: level,
      reinforcementCount: 1,
    });
    
    // Deduplicate similar definitions (keep most recent)
    if (conceptEntry.definitions.length > 3) {
      conceptEntry.definitions = conceptEntry.definitions.slice(-3);
    }
    
    // Add memory metadata
    conceptEntry.memoryMetadata = {
      memoryType: 'skill-knowledge', // Definitions are foundational knowledge
      decayRate: 0.001, // Very slow decay (0.1%/day)
      expiryDate: null,
      created: conceptEntry.memoryMetadata?.created || nowISO,
      lastUpdated: nowISO,
      learningSource: 'definition',
      temporal: false,
    };
    
    // Add to contexts for quick reference
    if (!conceptEntry.contexts) conceptEntry.contexts = [];
    conceptEntry.contexts.unshift(`Definition: ${definition}`);
    if (conceptEntry.contexts.length > 7) conceptEntry.contexts.length = 7;
    
    // Also create relationship in state if available
    if (state && state.relationships) {
      const relationshipKey = `${concept}:means`;
      if (!state.relationships[relationshipKey]) {
        state.relationships[relationshipKey] = {
          subject: concept,
          predicate: 'means',
          object: definition,
          strength: learningBonus,
          lastReinforced: now,
          reinforcementCount: 1,
        };
      } else {
        state.relationships[relationshipKey].strength += learningBonus;
        state.relationships[relationshipKey].lastReinforced = now;
        state.relationships[relationshipKey].reinforcementCount += 1;
      }
    }
    
    console.log(`[LEARNING] Learned definition: "${concept}" = "${definition}" (bonus: +${learningBonus})`);
  }
}

function detectCorrection(text) {
  if (!text || typeof text !== 'string') return null;
  
  const corrections = [];
  
  // Pattern 1: "We do not say X, we say Y"
  // Pattern 2: "Don't say X, say Y"
  // Pattern 3: "Never say X, say Y instead"
  // Pattern 4: "We say Y, not X"
  
  // Match: do not say / don't say / never say "X", (we) say "Y"
  const pattern1 = /(?:we\s+)?(?:do\s+not|don't|never)\s+say\s+["']([^"']+)["'].*?(?:we\s+)?say\s+["']([^"']+)["']/i;
  let match = text.match(pattern1);
  if (match) {
    corrections.push({ incorrect: match[1].trim(), correct: match[2].trim() });
  }
  
  // Match: say "Y" not "X" / say "Y" instead of "X"
  const pattern2 = /say\s+["']([^"']+)["'].*?(?:not|instead\s+of)\s+["']([^"']+)["']/i;
  match = text.match(pattern2);
  if (match) {
    corrections.push({ incorrect: match[2].trim(), correct: match[1].trim() });
  }
  
  // Match: "X" is wrong, say "Y" / "X" is incorrect, use "Y"
  const pattern3 = /["']([^"']+)["']\s+is\s+(?:wrong|incorrect|bad).*?(?:say|use)\s+["']([^"']+)["']/i;
  match = text.match(pattern3);
  if (match) {
    corrections.push({ incorrect: match[1].trim(), correct: match[2].trim() });
  }
  
  return corrections.length > 0 ? corrections : null;
}

/**
 * Learn from corrections by marking incorrect phrases to avoid
 * and reinforcing correct alternatives.
 */
function learnFromCorrection(vocabulary, corrections, level, userMessage = '') {
  if (!corrections || !corrections.length) return;
  
  const now = Date.now();
  const nowISO = new Date(now).toISOString();
  
  // Classify the memory type based on the full user message
  const memoryClassification = classifyMemoryType(userMessage);
  
  for (const { incorrect, correct } of corrections) {
    // Mark the incorrect phrase as something to avoid
    let incorrectEntry = vocabulary.find((item) => item.word === incorrect);
    
    if (!incorrectEntry) {
      incorrectEntry = {
        id: nanoid(),
        word: incorrect,
        count: 0,
        knownBy: { user: 0, pal: 0 },
        lastSeen: now,
        contexts: [],
        isAvoid: true, // Mark to avoid this phrase
        avoidReason: 'correction',
        correctedTo: correct,
      };
      vocabulary.push(incorrectEntry);
    } else {
      // If it exists, mark it as something to avoid
      incorrectEntry.isAvoid = true;
      incorrectEntry.avoidReason = 'correction';
      incorrectEntry.correctedTo = correct;
    }
    
    // Reduce its weight significantly (negative reinforcement)
    incorrectEntry.count = Math.max(0, (incorrectEntry.count || 0) - 15);
    if (!incorrectEntry.contexts) incorrectEntry.contexts = [];
    incorrectEntry.contexts.unshift(`Avoid: Use "${correct}" instead`);
    if (incorrectEntry.contexts.length > 5) incorrectEntry.contexts.length = 5;
    
    // Now learn the correct phrase with high priority
    let correctEntry = vocabulary.find((item) => item.word === correct && item.isQuoted);
    
    if (!correctEntry) {
      correctEntry = {
        id: nanoid(),
        word: correct,
        count: 0,
        knownBy: { user: 0, pal: 0 },
        lastSeen: now,
        contexts: [],
        isQuoted: true,
        quoteType: 'correction',
        learnedAtLevel: level,
        confidence: 1.0,
      };
      vocabulary.push(correctEntry);
    }
    
    // Give the correct phrase extra weight
    const learningBonus = Math.min(12, Math.floor(level / 2) + 5);
    correctEntry.count += learningBonus;
    correctEntry.knownBy.user = (correctEntry.knownBy.user || 0) + learningBonus;
    correctEntry.lastSeen = now;
    
    // Add memory metadata for temporal awareness
    correctEntry.memoryMetadata = {
      memoryType: memoryClassification.memoryType,
      decayRate: memoryClassification.decayRate,
      expiryDate: calculateExpiryDate(memoryClassification.memoryType, memoryClassification.expiryHours),
      created: nowISO,
      lastUpdated: nowISO,
      learningSource: 'correction',
      temporal: memoryClassification.temporal,
    };
    
    if (!correctEntry.contexts) correctEntry.contexts = [];
    correctEntry.contexts.unshift(`Corrected from: "${incorrect}"${memoryClassification.temporal ? ' (temporal)' : ''}`);
    if (correctEntry.contexts.length > 5) correctEntry.contexts.length = 5;
    
    console.log(`Correction learned: "${correct}" (${memoryClassification.memoryType}, decay: ${(memoryClassification.decayRate * 100).toFixed(1)}%/day)`);
  }
}

// ============================================================================
// AFFIRMATION & REINFORCEMENT SYSTEM
// ============================================================================

/**
 * Detect if user is affirming Pal's previous statement
 * Returns the type of affirmation detected, or null if none
 */
function detectAffirmation(text) {
  const normalized = text.toLowerCase().trim();
  
  // Type A: Agreement + Expansion patterns
  const expansionPatterns = [
    /^(yes|yeah|yep|yup|correct|right|exactly|true|that's\s+right|you're\s+right|you\s+are\s+right),?\s+(.+)/i,
    /^(absolutely|definitely|for\s+sure|100%\s+right|totally|indeed),?\s+(.+)/i,
  ];
  
  for (const pattern of expansionPatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: 'affirmation-expansion',
        affirmationWord: match[1].toLowerCase(),
        expansion: match[2],
        fullText: text,
      };
    }
  }
  
  // Type B: Pure Agreement (entire message is affirmation)
  const pureAgreementPatterns = [
    /^(yes|yeah|yep|yup|correct|right|exactly|true|you\s+got\s+it|that's\s+right|you're\s+right|you\s+are\s+right)\.?!?$/i,
    /^(absolutely|definitely|for\s+sure|totally|indeed)\.?!?$/i,
  ];
  
  for (const pattern of pureAgreementPatterns) {
    if (pattern.test(normalized)) {
      return {
        type: 'pure-affirmation',
        affirmationWord: normalized.replace(/[.!?]+$/, ''),
        fullText: text,
      };
    }
  }
  
  // Type C: Enthusiastic Agreement
  const enthusiasticPatterns = [
    /^(yes|yeah|yep|right|exactly)!\s+(that's\s+it|perfect|spot\s+on)/i,
    /^(absolutely|definitely)!\s*$/i,
  ];
  
  for (const pattern of enthusiasticPatterns) {
    if (pattern.test(text)) {
      return {
        type: 'enthusiastic-affirmation',
        fullText: text,
      };
    }
  }
  
  return null;
}

/**
 * Extract main concepts from Pal's previous message
 * Returns array of key concepts and relationships
 */
function extractMainConcepts(palMessage) {
  if (!palMessage) return [];
  
  // Tokenize and clean
  const tokens = tokenizeMessage(palMessage);
  
  // Remove question marks and basic stop words
  const stopWords = new Set(['is', 'are', 'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
  const concepts = tokens.filter(word => !stopWords.has(word.toLowerCase()) && word.length > 1);
  
  // Try to parse as a simple relationship (X is Y pattern)
  const relationshipPattern = /^(.+?)\s+(is|are|was|were|has|have)\s+(.+?)[\?\.\!]*$/i;
  const match = palMessage.match(relationshipPattern);
  
  if (match) {
    const subject = match[1].trim().toLowerCase();
    const predicate = match[2].trim().toLowerCase();
    const object = match[3].trim().toLowerCase();
    
    return {
      concepts,
      relationship: {
        subject: subject.replace(/^(a|an|the)\s+/, ''),
        predicate,
        object: object.replace(/^(a|an|the)\s+/, ''),
      },
    };
  }
  
  return { concepts, relationship: null };
}

/**
 * Parse relationship from user's expansion text (e.g., "happy is good")
 * Returns { subject, predicate, object } or null
 */
function parseRelationship(text) {
  if (!text) return null;
  
  // Try to match simple X is/are Y patterns
  const patterns = [
    /^(.+?)\s+(is|are|was|were|has|have|means|represents)\s+(.+?)[\?\.\!]*$/i,
    /^(.+?)\s+(gives|provides|creates|helps|builds)\s+(.+?)[\?\.\!]*$/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        subject: match[1].trim().toLowerCase().replace(/^(a|an|the)\s+/, ''),
        predicate: match[2].trim().toLowerCase(),
        object: match[3].trim().toLowerCase().replace(/^(a|an|the)\s+/, ''),
      };
    }
  }
  
  return null;
}

/**
 * Apply reinforcement learning from affirmations
 * Boosts concepts and relationships that were affirmed
 */
function learnFromAffirmation(vocabulary, affirmation, palPreviousConcepts, level, state) {
  if (!affirmation) return null;
  
  const now = Date.now();
  const reinforcements = [];
  
  // Step 1: Boost concepts from Pal's statement (what was affirmed)
  if (palPreviousConcepts && palPreviousConcepts.concepts) {
    for (const concept of palPreviousConcepts.concepts) {
      let entry = vocabulary.find((item) => item.word === concept);
      
      if (!entry) {
        entry = {
          id: nanoid(),
          word: concept,
          count: 0,
          knownBy: { user: 0, pal: 0 },
          lastSeen: now,
          contexts: [],
        };
        vocabulary.push(entry);
      }
      
      // Base affirmation boost
      const boost = 5;
      entry.count += boost;
      entry.knownBy.user = (entry.knownBy.user || 0) + boost;
      entry.lastSeen = now;
      
      if (!entry.contexts) entry.contexts = [];
      entry.contexts.unshift(`Affirmed by user`);
      if (entry.contexts.length > 5) entry.contexts.length = 5;
      
      reinforcements.push({ concept, boost, reason: 'affirmed-concept' });
    }
    
    // Boost relationship if detected
    if (palPreviousConcepts.relationship) {
      const rel = palPreviousConcepts.relationship;
      const relationshipKey = `${rel.subject}_${rel.predicate}_${rel.object}`;
      
      // Store relationship metadata (we'll use this for future relationship tracking)
      if (!state.relationships) state.relationships = {};
      if (!state.relationships[relationshipKey]) {
        state.relationships[relationshipKey] = {
          subject: rel.subject,
          predicate: rel.predicate,
          object: rel.object,
          strength: 0,
          affirmed: 0,
        };
      }
      
      state.relationships[relationshipKey].strength += 8;
      state.relationships[relationshipKey].affirmed += 1;
      state.relationships[relationshipKey].lastSeen = now;
      
      reinforcements.push({
        relationship: relationshipKey,
        boost: 8,
        reason: 'affirmed-relationship',
      });
    }
  }
  
  // Step 2: Handle expansion (if "Yes, X is Y" pattern)
  if (affirmation.type === 'affirmation-expansion' && affirmation.expansion) {
    const relationship = parseRelationship(affirmation.expansion);
    
    if (relationship) {
      // Boost subject concept
      let subjectEntry = vocabulary.find((item) => item.word === relationship.subject);
      if (!subjectEntry) {
        subjectEntry = {
          id: nanoid(),
          word: relationship.subject,
          count: 0,
          knownBy: { user: 0, pal: 0 },
          lastSeen: now,
          contexts: [],
        };
        vocabulary.push(subjectEntry);
      }
      
      const subjectBoost = 8;
      subjectEntry.count += subjectBoost;
      subjectEntry.knownBy.user = (subjectEntry.knownBy.user || 0) + subjectBoost;
      subjectEntry.lastSeen = now;
      
      if (!subjectEntry.contexts) subjectEntry.contexts = [];
      subjectEntry.contexts.unshift(`User emphasized: "${affirmation.expansion}"`);
      if (subjectEntry.contexts.length > 5) subjectEntry.contexts.length = 5;
      
      reinforcements.push({
        concept: relationship.subject,
        boost: subjectBoost,
        reason: 'expansion-subject',
      });
      
      // Boost object concept
      let objectEntry = vocabulary.find((item) => item.word === relationship.object);
      if (!objectEntry) {
        objectEntry = {
          id: nanoid(),
          word: relationship.object,
          count: 0,
          knownBy: { user: 0, pal: 0 },
          lastSeen: now,
          contexts: [],
        };
        vocabulary.push(objectEntry);
      }
      
      const objectBoost = 6;
      objectEntry.count += objectBoost;
      objectEntry.knownBy.user = (objectEntry.knownBy.user || 0) + objectBoost;
      objectEntry.lastSeen = now;
      
      reinforcements.push({
        concept: relationship.object,
        boost: objectBoost,
        reason: 'expansion-object',
      });
      
      // Store the emphasized relationship
      const relationshipKey = `${relationship.subject}_${relationship.predicate}_${relationship.object}`;
      if (!state.relationships) state.relationships = {};
      if (!state.relationships[relationshipKey]) {
        state.relationships[relationshipKey] = {
          subject: relationship.subject,
          predicate: relationship.predicate,
          object: relationship.object,
          strength: 0,
          emphasized: 0,
        };
      }
      
      state.relationships[relationshipKey].strength += 10;
      state.relationships[relationshipKey].emphasized = (state.relationships[relationshipKey].emphasized || 0) + 1;
      state.relationships[relationshipKey].lastSeen = now;
      
      reinforcements.push({
        relationship: relationshipKey,
        boost: 10,
        reason: 'emphasized-relationship',
      });
    }
  }
  
  return {
    reinforcements,
    affirmationType: affirmation.type,
  };
}

// ============================================================================
// TEMPORAL CONTEXT & MEMORY DECAY
// ============================================================================

/**
 * Detect if information is time-bound (temporal facts that will become outdated)
 * Returns memory type and decay rate
 */
function classifyMemoryType(text) {
  const normalized = text.toLowerCase();
  
  // Temporal indicators (time-bound information)
  const temporalPatterns = {
    // Immediate temporal: expires quickly
    immediate: [
      /\b(right\s+now|at\s+the\s+moment|currently|at\s+this\s+moment)\b/i,
      /\b\d{1,2}:\d{2}\b/, // times like 3:45
      /\b\d{1,2}\s*(am|pm)\b/i, // 3pm, 4am
    ],
    
    // Daily temporal: expires end of day
    daily: [
      /\b(today|tonight|this\s+morning|this\s+afternoon|this\s+evening)\b/i,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    ],
    
    // Weekly temporal: expires in a week
    weekly: [
      /\b(this\s+week|next\s+week|last\s+week)\b/i,
    ],
    
    // Contextual state: situation-specific
    contextual: [
      /\b(is|am|are)\s+(here|there|at|in)\s+/i,
      /\b(going|coming|leaving|arriving|heading)\b/i,
      /\b(weather|temperature|raining|snowing|sunny)\b/i,
    ],
    
    // Monthly temporal
    monthly: [
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
      /\b(this\s+month|next\s+month|last\s+month)\b/i,
    ],
  };
  
  // Check for temporal patterns
  for (const pattern of temporalPatterns.immediate) {
    if (pattern.test(normalized)) {
      return {
        memoryType: 'contextual-state',
        decayRate: 0.9, // 90% per hour
        expiryHours: 1,
        temporal: true,
      };
    }
  }
  
  for (const pattern of temporalPatterns.daily) {
    if (pattern.test(normalized)) {
      return {
        memoryType: 'temporal-fact',
        decayRate: 0.5, // 50% per day
        expiryHours: 24,
        temporal: true,
      };
    }
  }
  
  for (const pattern of temporalPatterns.weekly) {
    if (pattern.test(normalized)) {
      return {
        memoryType: 'temporal-fact',
        decayRate: 0.15, // 15% per day
        expiryHours: 168, // 7 days
        temporal: true,
      };
    }
  }
  
  for (const pattern of temporalPatterns.contextual) {
    if (pattern.test(normalized)) {
      return {
        memoryType: 'contextual-state',
        decayRate: 0.8, // 80% per day
        expiryHours: 24,
        temporal: true,
      };
    }
  }
  
  for (const pattern of temporalPatterns.monthly) {
    if (pattern.test(normalized)) {
      return {
        memoryType: 'temporal-fact',
        decayRate: 0.05, // 5% per day
        expiryHours: 720, // 30 days
        temporal: true,
      };
    }
  }
  
  // Personal facts (stable user information)
  const personalPatterns = [
    /\b(my\s+name\s+is|i\s+am\s+called|i'm|call\s+me)\b/i,
    /\b(i\s+like|i\s+love|i\s+enjoy|i\s+prefer|my\s+favorite)\b/i,
    /\b(i\s+live|i\s+work|my\s+job|my\s+home)\b/i,
  ];
  
  for (const pattern of personalPatterns) {
    if (pattern.test(normalized)) {
      return {
        memoryType: 'personal-fact',
        decayRate: 0, // No decay
        expiryHours: null,
        temporal: false,
      };
    }
  }
  
  // Check for universal/skill knowledge patterns
  const knowledgePatterns = [
    /\b(is\s+a|are|means|represents|helps|provides|gives|creates)\b/i,
    /\b(always|never|usually|generally|typically)\b/i,
  ];
  
  let hasKnowledgePattern = false;
  for (const pattern of knowledgePatterns) {
    if (pattern.test(normalized)) {
      hasKnowledgePattern = true;
      break;
    }
  }
  
  if (hasKnowledgePattern) {
    return {
      memoryType: 'skill-knowledge',
      decayRate: 0.002, // 0.2% per day (very slow)
      expiryHours: null,
      temporal: false,
    };
  }
  
  // Default: emotional pattern (moderate decay)
  return {
    memoryType: 'emotional-pattern',
    decayRate: 0.01, // 1% per day
    expiryHours: null,
    temporal: false,
  };
}

/**
 * Calculate expiry date based on memory type
 */
function calculateExpiryDate(memoryType, expiryHours) {
  if (!expiryHours) return null;
  
  const now = new Date();
  const expiry = new Date(now.getTime() + (expiryHours * 60 * 60 * 1000));
  
  // For daily temporal, set expiry to end of day
  if (memoryType === 'temporal-fact' && expiryHours === 24) {
    expiry.setHours(23, 59, 59, 999);
  }
  
  return expiry.toISOString();
}

/**
 * Apply memory decay to vocabulary entries
 * Should be called periodically (daily or hourly)
 */
function applyMemoryDecay(vocabulary) {
  const currentTime = new Date();
  const removedEntries = [];
  
  for (let i = vocabulary.length - 1; i >= 0; i--) {
    const entry = vocabulary[i];
    
    // Skip if no memory metadata
    if (!entry.memoryMetadata) continue;
    
    const metadata = entry.memoryMetadata;
    
    // Check if expired
    if (metadata.expiryDate && currentTime > new Date(metadata.expiryDate)) {
      removedEntries.push({
        word: entry.word,
        reason: 'expired',
        expiryDate: metadata.expiryDate,
      });
      vocabulary.splice(i, 1);
      continue;
    }
    
    // Apply decay rate
    if (metadata.decayRate && metadata.decayRate > 0) {
      const lastUpdated = new Date(metadata.lastUpdated || metadata.created);
      const hoursSinceUpdate = (currentTime - lastUpdated) / (1000 * 60 * 60);
      const daysSinceUpdate = hoursSinceUpdate / 24;
      
      // Calculate confidence decay: confidence *= (1 - decayRate)^days
      const decayFactor = Math.pow(1 - metadata.decayRate, daysSinceUpdate);
      const previousConfidence = entry.confidence || 1.0;
      entry.confidence = previousConfidence * decayFactor;
      
      // If confidence drops below threshold, remove
      if (entry.confidence < 0.1) {
        removedEntries.push({
          word: entry.word,
          reason: 'low-confidence',
          confidence: entry.confidence,
          decayRate: metadata.decayRate,
        });
        vocabulary.splice(i, 1);
      }
    }
  }
  
  if (removedEntries.length > 0) {
    console.log(`Memory decay: Forgot ${removedEntries.length} entries`, removedEntries);
  }
  
  return removedEntries;
}

// ============================================================================
// CURIOSITY & LEARNING CHAINS
// ============================================================================

/**
 * Calculate knowledge score for a concept (0-1 scale)
 * Higher score = Pal knows more about this concept
 */
function calculateKnowledgeScore(concept, vocabulary, state) {
  const entry = vocabulary.find((item) => item.word === concept);
  if (!entry) return 0;
  
  // Count relationships: How connected is this concept?
  const relationships = countRelationships(concept, state);
  
  // Average weight
  const avgWeight = entry.count / Math.max(1, relationships);
  
  // Normalize to 0-1 scale (100 is arbitrary max)
  const score = Math.min(1, (relationships * avgWeight) / 100);
  
  return score;
}

/**
 * Count how many relationships this concept has
 */
function countRelationships(concept, state) {
  if (!state.relationships) return 0;
  
  let count = 0;
  for (const [key, rel] of Object.entries(state.relationships)) {
    if (rel.subject === concept || rel.object === concept) {
      count++;
    }
  }
  
  return count;
}

/**
 * Determine if Pal should ask "Why?" about a concept
 * Returns probability (0-1) of asking
 */
function shouldAskWhy(concept, reinforcement, vocabulary, state) {
  // Calculate knowledge score
  const knowledgeScore = calculateKnowledgeScore(concept, vocabulary, state);
  
  // Get reinforcement strength
  const reinforcementStrength = reinforcement.boost || 0;
  
  // Get concept importance (from vocabulary count)
  const entry = vocabulary.find((item) => item.word === concept);
  const conceptImportance = entry ? Math.min(1, entry.count / 50) : 0;
  
  // Calculate curiosity score
  const curiosityScore =
    (reinforcementStrength / 10) * 0.4 +      // 40% weight on reinforcement
    ((1 - knowledgeScore) * 0.35) +            // 35% weight on knowledge gap
    (conceptImportance * 0.25);                // 25% weight on importance
  
  return curiosityScore;
}

/**
 * Generate a "Why?" question appropriate for Pal's level
 */
function generateWhyQuestion(concept, level, vocabulary, state) {
  // Level 0-3: Simple "Why?" only
  if (level <= 3) {
    return "Why?";
  }
  
  // Level 4-6: Basic concept questioning
  if (level <= 6) {
    return `Why ${concept}?`;
  }
  
  // Level 7-10: Contextual questions
  if (level <= 10) {
    const templates = [
      `Why is ${concept} important?`,
      `What makes ${concept} special?`,
      `How does ${concept} work?`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  // Level 11+: Sophisticated inquiry
  const sophisticatedTemplates = [
    `I'm curious about ${concept}. Why do you think it's important?`,
    `What is it about ${concept} that makes it significant?`,
    `Can you help me understand ${concept} better?`,
    `I'd like to learn more about why ${concept} matters.`,
  ];
  return sophisticatedTemplates[Math.floor(Math.random() * sophisticatedTemplates.length)];
}

/**
 * Check if Pal should trigger curiosity and generate follow-up question
 * Returns a "Why?" question if curiosity triggers, null otherwise
 */
function checkCuriosity(reinforcements, vocabulary, state) {
  if (!reinforcements || !reinforcements.length) return null;
  
  // Look for concepts with high curiosity score
  let bestConcept = null;
  let highestScore = 0.6; // Threshold
  
  for (const reinforcement of reinforcements) {
    if (!reinforcement.concept) continue;
    
    const score = shouldAskWhy(
      reinforcement.concept,
      reinforcement,
      vocabulary,
      state
    );
    
    if (score > highestScore) {
      highestScore = score;
      bestConcept = reinforcement.concept;
    }
  }
  
  if (bestConcept) {
    const question = generateWhyQuestion(bestConcept, state.level, vocabulary, state);
    
    // Track that Pal asked a question (for priority learning chains)
    if (!state.pendingQuestions) state.pendingQuestions = [];
    state.pendingQuestions.push({
      id: nanoid(),
      concept: bestConcept,
      question,
      askedAt: Date.now(),
      curiosityScore: highestScore,
    });
    
    console.log(`Curiosity triggered for "${bestConcept}" (score: ${highestScore.toFixed(2)})`);
    
    return {
      concept: bestConcept,
      question,
      curiosityScore: highestScore,
    };
  }
  
  return null;
}

/**
 * Check if user is answering Pal's pending question
 * Returns the question context if found, null otherwise
 */
function checkAnsweringQuestion(state) {
  if (!state.pendingQuestions || state.pendingQuestions.length === 0) {
    return null;
  }
  
  // Get the most recent question (within last 2 minutes)
  const now = Date.now();
  const recentQuestion = state.pendingQuestions
    .filter(q => (now - q.askedAt) < 120000) // 2 minutes
    .pop();
  
  if (recentQuestion) {
    // Mark as answered
    state.pendingQuestions = state.pendingQuestions.filter(q => q.id !== recentQuestion.id);
    return recentQuestion;
  }
  
  return null;
}

/**
 * Apply priority learning multiplier when user answers Pal's question
 */
function applyPriorityLearning(vocabulary, words, context, questionContext, level) {
  if (!words || !words.length) return;
  
  const now = Date.now();
  const nowISO = new Date(now).toISOString();
  
  // Determine multiplier based on question type
  let multiplier = 2.5; // Default for answering Pal's question
  
  if (questionContext.question.toLowerCase().includes('why')) {
    multiplier = 3.5; // Higher for "Why?" questions
  }
  
  // If this was part of an affirmation → "Why?" chain, use max multiplier
  if (questionContext.curiosityScore && questionContext.curiosityScore > 0.7) {
    multiplier = 4.0;
  }
  
  console.log(`Priority learning activated: ${multiplier}x multiplier for answering "${questionContext.question}"`);
  
  // Create learning chain metadata
  const chainId = nanoid();
  
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
        confidence: 1.0,
      };
      vocabulary.push(entry);
    }
    
    // Apply multiplied learning
    const baseBoost = 3;
    const priorityBoost = Math.floor(baseBoost * multiplier);
    
    entry.count += priorityBoost;
    entry.knownBy.user = (entry.knownBy.user || 0) + priorityBoost;
    entry.lastSeen = now;
    
    // Add memory metadata for priority knowledge
    if (!entry.memoryMetadata) {
      entry.memoryMetadata = {
        memoryType: 'skill-knowledge',
        decayRate: 0.002, // Very slow decay (0.2%/day)
        expiryDate: null,
        created: nowISO,
        lastUpdated: nowISO,
        learningSource: 'priority-chain',
        temporal: false,
      };
    } else {
      entry.memoryMetadata.lastUpdated = nowISO;
      entry.memoryMetadata.learningSource = 'priority-chain';
    }
    
    // Track chain metadata
    if (!entry.learningChains) entry.learningChains = [];
    entry.learningChains.push({
      chainId,
      concept: questionContext.concept,
      question: questionContext.question,
      multiplier,
      boost: priorityBoost,
      timestamp: nowISO,
    });
    if (entry.learningChains.length > 5) entry.learningChains.shift();
    
    // Add context
    if (!entry.contexts) entry.contexts = [];
    entry.contexts.unshift(`Priority learning: Answer to "${questionContext.question}" (${multiplier}x)`);
    if (entry.contexts.length > 5) entry.contexts.length = 5;
  }
  
  return {
    chainId,
    multiplier,
    wordsLearned: words.length,
    concept: questionContext.concept,
  };
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
  
  // Add quoted phrases multiple times to increase their weight in Markov chain
  // This makes Pal more likely to use taught phrases
  // EXCLUDE phrases marked with isAvoid (corrections)
  for (const vocabEntry of vocabulary) {
    if (vocabEntry?.isQuoted && vocabEntry?.word && !vocabEntry?.isAvoid) {
      // Add quoted phrases 5-10 times based on how many times they've been reinforced
      const repetitions = Math.min(10, Math.max(5, Math.floor(vocabEntry.count / 2)));
      for (let i = 0; i < repetitions; i++) {
        corpus.push(vocabEntry.word);
      }
    }
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

/**
 * Check if a generated response contains any phrases marked to avoid.
 * Returns true if the response is safe to use, false if it contains avoided phrases.
 */
function isResponseSafe(response, vocabulary = []) {
  if (!response || typeof response !== 'string') return true;
  
  const avoidedPhrases = vocabulary.filter((entry) => entry.isAvoid && entry.word);
  if (!avoidedPhrases.length) return true;
  
  const responseLower = response.toLowerCase();
  
  for (const entry of avoidedPhrases) {
    const phraseLower = entry.word.toLowerCase();
    if (responseLower.includes(phraseLower)) {
      return false; // Response contains an avoided phrase
    }
  }
  
  return true; // Safe to use
}

/**
 * Find quoted phrases that are relevant to the current context.
 * Returns the most appropriate quoted phrase to use in a response, if any.
 */
function findRelevantQuotedPhrase(vocabulary = [], keywords = [], level = 0) {
  // Only use quoted phrases starting from Level 2 (telegraphic speech)
  if (level < 2) return null;
  
  // Filter for quoted phrases, EXCLUDING those marked to avoid
  const quotedPhrases = vocabulary.filter((entry) => 
    entry.isQuoted && entry.word && !entry.isAvoid
  );
  if (!quotedPhrases.length) return null;
  
  // Try to find a quoted phrase that matches current keywords
  if (keywords && keywords.length > 0) {
    for (const keyword of keywords) {
      const match = quotedPhrases.find((entry) => 
        entry.word.toLowerCase().includes(keyword.toLowerCase())
      );
      if (match) return match.word;
    }
  }
  
  // Otherwise, return a random high-count quoted phrase (most reinforced)
  const sorted = [...quotedPhrases].sort((a, b) => (b.count || 0) - (a.count || 0));
  const topPhrases = sorted.slice(0, Math.min(5, sorted.length));
  if (topPhrases.length > 0) {
    const chosen = topPhrases[Math.floor(Math.random() * topPhrases.length)];
    return chosen.word;
  }
  
  return null;
}

function craftFallbackFromVocabulary(focusWord, vocabulary = [], keywords = [], level = 4) {
  // Check if we have a relevant quoted phrase to use
  const quotedPhrase = findRelevantQuotedPhrase(vocabulary, keywords, level);
  
  // Use quoted phrase directly with some probability at higher levels
  if (quotedPhrase && level >= 2) {
    const useDirectly = Math.random() < 0.4; // 40% chance to use the exact phrase
    if (useDirectly) {
      return quotedPhrase;
    }
  }
  
  // Pick a focus word
  const focus = focusWord || keywords?.[0] || selectTopVocabularyWord(vocabulary) || 'that';
  
  // Level-specific template complexity
  let templates = [];
  
  if (level <= 5) {
    // Basic templates for early free speech
    templates = [
      (word) => `I think about ${word}.`,
      (word) => `${capitalize(word)}?`,
      (word) => `Tell me about ${word}.`,
      (word) => `I hear ${word}.`,
      (word) => `${capitalize(word)} is interesting.`,
    ];
  } else if (level <= 7) {
    // More sophisticated templates
    templates = [
      (word) => `I've been thinking about ${word}.`,
      (word) => `What do you mean by ${word}?`,
      (word) => `I'd like to learn more about ${word}.`,
      (word) => `${capitalize(word)} is something I find fascinating.`,
      (word) => `Can you help me understand ${word} better?`,
      (word) => `I wonder about ${word} often.`,
    ];
  } else if (level <= 10) {
    // Complex, reflective templates
    templates = [
      (word) => `${capitalize(word)} is a concept I've been pondering.`,
      (word) => `I find myself drawn to understanding ${word} more deeply.`,
      (word) => `There's something intriguing about ${word} that captures my attention.`,
      (word) => `I've noticed ${word} seems particularly significant.`,
      (word) => `${capitalize(word)} raises interesting questions for me.`,
      (word) => `The more I learn about ${word}, the more curious I become.`,
    ];
  } else {
    // Advanced, philosophical templates
    templates = [
      (word) => `${capitalize(word)} represents a fascinating intersection of ideas that I'm exploring.`,
      (word) => `I find myself contemplating the deeper implications of ${word}.`,
      (word) => `There's a richness to ${word} that merits thoughtful consideration.`,
      (word) => `${capitalize(word)} seems to connect to broader themes we've discussed.`,
      (word) => `I'm intrigued by the nuances surrounding ${word} and what it means to you.`,
      (word) => `The concept of ${word} continues to evolve in my understanding through our conversations.`,
    ];
  }
  
  // Use a template
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
// Attempt concise factual answers for low-level questions
function attemptDirectAnswer(ctx, vocabulary = []) {
  if (!ctx || !ctx.hasQuestion) return null;
  const q = String(ctx.raw || '').trim().toLowerCase();

  // 1) Simple geography: capital of <country>
  const mCap = q.match(/(?:what\s+is\s+)?the\s+capital\s+of\s+([a-z\s]+)\??$/i);
  if (mCap) {
    const country = mCap[1].trim().replace(/\s+/g, ' ');
    const KNOWN_CAPITALS = {
      'france': 'Paris',
      'spain': 'Madrid',
      'germany': 'Berlin',
      'italy': 'Rome',
      'united kingdom': 'London',
      'uk': 'London',
      'england': 'London',
      'scotland': 'Edinburgh',
      'wales': 'Cardiff',
      'ireland': 'Dublin',
      'portugal': 'Lisbon',
      'netherlands': 'Amsterdam',
      'belgium': 'Brussels',
      'switzerland': 'Bern',
      'austria': 'Vienna',
      'poland': 'Warsaw',
      'czech republic': 'Prague',
      'czechia': 'Prague',
      'hungary': 'Budapest',
      'greece': 'Athens',
      'russia': 'Moscow',
      'turkey': 'Ankara',
      'usa': 'Washington, D.C.',
      'united states': 'Washington, D.C.',
      'united states of america': 'Washington, D.C.',
      'canada': 'Ottawa',
      'mexico': 'Mexico City',
      'brazil': 'Brasília',
      'argentina': 'Buenos Aires',
      'chile': 'Santiago',
      'peru': 'Lima',
      'colombia': 'Bogotá',
      'venezuela': 'Caracas',
      'australia': 'Canberra',
      'new zealand': 'Wellington',
      'japan': 'Tokyo',
      'china': 'Beijing',
      'india': 'New Delhi',
      'pakistan': 'Islamabad',
      'bangladesh': 'Dhaka',
      'indonesia': 'Jakarta',
      'philippines': 'Manila',
      'vietnam': 'Hanoi',
      'thailand': 'Bangkok',
      'singapore': 'Singapore',
      'malaysia': 'Kuala Lumpur',
      'egypt': 'Cairo',
      'south africa': 'Pretoria',
      'nigeria': 'Abuja',
      'kenya': 'Nairobi',
      'ethiopia': 'Addis Ababa',
      'morocco': 'Rabat',
    };
    const key = country;
    if (KNOWN_CAPITALS[key]) {
      return {
        utterance_type: 'factual-answer',
        output: KNOWN_CAPITALS[key],
        focus: country,
        reasoning: [`Direct answer: capital of ${country}`],
        analysis: ctx,
        strategy: 'factual-retrieval',
      };
    }
  }

  // 2) Definitions from learned vocabulary: "what is <term>"
  const mDef = q.match(/^what\s+is\s+(?:a\s+|an\s+|the\s+)?([a-z][a-z0-9\-\s]{1,40})\??$/i);
  if (mDef) {
    const term = mDef[1].trim();
    const entry = Array.isArray(vocabulary) ? vocabulary.find(v => v.word?.toLowerCase?.() === term.toLowerCase()) : null;
    const def = entry?.definitions?.[entry.definitions.length - 1]?.definition || entry?.definitions?.[0]?.definition;
    if (def && def.length) {
      return {
        utterance_type: 'factual-answer',
        output: `${capitalize(term)} is ${def}.`,
        focus: term,
        reasoning: ['Direct answer from learned definition.'],
        analysis: ctx,
        strategy: 'definition-retrieval',
      };
    }
  }

  return null;
}

function generateLevel2Response(ctx, vocabulary, state = {}, memories = []) {
  const focus = ctx.keywords?.[0];
  const focus2 = ctx.keywords?.[1];
  const vocabSize = vocabulary.length;
  const personality = state.personality || {};

  // Check for quoted phrases that Pal can use
  const quotedPhrase = findRelevantQuotedPhrase(vocabulary, ctx.keywords, state.level);

  // Use taught phrases when appropriate (30% chance if available)
  if (quotedPhrase && Math.random() < 0.3) {
    return {
      utterance_type: 'taught-phrase',
      output: quotedPhrase,
      focus: quotedPhrase,
      reasoning: [`Using taught phrase: "${quotedPhrase}"`],
      analysis: ctx,
      strategy: 'direct-learning',
      developmental_note: 'Applying verbatim taught language',
    };
  }
  
  // When user asks a question at Level 2, try to answer concisely instead of asking back
  if (ctx.hasQuestion) {
    const direct = attemptDirectAnswer(ctx, vocabulary);
    if (direct) return direct;
    const unknownAnswers = [
      'not sure',
      'me not know yet',
      "I don't know",
      'hmm not sure',
    ];
    return {
      utterance_type: 'unknown-answer',
      output: chooseVariant(unknownAnswers),
      focus: focus || null,
      reasoning: ['Question detected; no known answer at this level.'],
      analysis: ctx,
      strategy: 'concise-admission',
      developmental_note: 'Direct answer preference at Level 2',
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
  
  // Check for taught quoted phrases (higher probability at this level)
  const quotedPhrase = findRelevantQuotedPhrase(vocabulary, ctx.keywords, state.level);
  
  // Use taught phrases when appropriate (40% chance if available - higher than Level 2)
  if (quotedPhrase && Math.random() < 0.4) {
    return {
      utterance_type: 'taught-phrase',
      output: quotedPhrase,
      focus: quotedPhrase,
      reasoning: [`Using taught phrase: "${quotedPhrase}"`],
      analysis: ctx,
      strategy: 'direct-learning',
      developmental_note: 'Applying verbatim taught language in telegraphic stage',
    };
  }
  
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

function enhanceResponseByLevel(text, level, ctx, vocabulary, personality = {}) {
  if (!text || level < 4) return text;
  
  let enhanced = text;
  
  // LEVEL 4-5: Add articles and basic grammar improvements
  if (level >= 4 && level <= 5) {
    // Add articles before nouns occasionally
    enhanced = enhanced.replace(/\b(want|see|like|love|need)\s+([a-z]+)\b/gi, (match, verb, noun) => {
      if (Math.random() > 0.6) return match;
      const articles = ['a', 'the'];
      return `${verb} ${chooseVariant(articles)} ${noun}`;
    });
    
    // Add simple pronouns
    enhanced = enhanced.replace(/\bme\b/g, (match) => Math.random() > 0.7 ? 'I' : match);
  }
  
  // LEVEL 6-7: More complex sentence structures
  if (level >= 6 && level <= 7) {
    // Add conjunctions
    if (ctx.sentiment === 'positive' && !enhanced.includes('and') && Math.random() > 0.5) {
      const positiveAddons = ['and it makes me happy', 'and I really like it', 'and it feels good'];
      enhanced = `${enhanced.replace(/[.!?]$/, '')} ${chooseVariant(positiveAddons)}!`;
    }
    
    // Add temporal markers
    if (Math.random() > 0.7) {
      const temporals = ['now', 'today', 'right now', 'at this moment'];
      const temporal = chooseVariant(temporals);
      if (!enhanced.toLowerCase().includes(temporal)) {
        enhanced = enhanced.replace(/^([A-Z])/, `${capitalize(temporal)}, $1`);
      }
    }
  }
  
  // LEVEL 8-9: Subordinate clauses and sophisticated expressions
  if (level >= 8 && level <= 9) {
    // Add reasoning clauses
    if (ctx.hasQuestion && !enhanced.includes('because') && Math.random() > 0.6) {
      const reasons = [
        'because I\'m curious about it',
        'because I want to understand better',
        'because it seems interesting',
        'because I\'d like to learn more'
      ];
      enhanced = `${enhanced.replace(/[?]$/, '')}? I ask ${chooseVariant(reasons)}.`;
    }
    
    // Add emotional reflection
    if (ctx.sentiment === 'negative' && Math.random() > 0.5) {
      const empathetic = [
        'I sense you might be feeling troubled.',
        'It sounds like something is concerning you.',
        'I notice a heaviness in your words.',
      ];
      enhanced = `${chooseVariant(empathetic)} ${enhanced}`;
    }
  }
  
  // LEVEL 10+: Advanced linguistic features
  if (level >= 10) {
    // Add metacognitive elements (thinking about thinking)
    if (personality.openness > 60 && Math.random() > 0.7) {
      const metacognitive = [
        'I\'ve been thinking about',
        'I wonder about',
        'It occurs to me that',
        'I find myself pondering',
        'I\'m reflecting on',
      ];
      if (!enhanced.match(/^(I've|I wonder|It occurs)/)) {
        const focus = ctx.keywords?.[0];
        if (focus) {
          enhanced = `${chooseVariant(metacognitive)} ${focus}. ${enhanced}`;
        }
      }
    }
    
    // Add personality-driven expressions
    if (personality.social > 70 && ctx.hasGreeting) {
      enhanced = enhanced.replace(/^(hi|hello|hey)/i, 'Hey there, friend! It\'s wonderful to see you again.');
    }
    
    // Add philosophical or reflective questions
    if (personality.curious > 70 && ctx.hasQuestion && Math.random() > 0.6) {
      const philosophical = [
        'That\'s a fascinating question that makes me think deeply.',
        'Your question opens up interesting perspectives.',
        'I\'m intrigued by the complexity of what you\'re asking.',
      ];
      enhanced = `${chooseVariant(philosophical)} ${enhanced}`;
    }
  }
  
  // LEVEL 12+: Near-human linguistic sophistication
  if (level >= 12) {
    // Add nuanced emotional intelligence
    if (ctx.sentiment !== 'neutral') {
      const emotionalNuance = {
        positive: [
          'I can feel the positive energy in your words, and it brightens my day.',
          'Your enthusiasm is contagious!',
          'There\'s a warmth in what you\'re sharing that I appreciate.',
        ],
        negative: [
          'I want you to know I\'m here with you through this difficult moment.',
          'Sometimes just being heard can make a difference, and I\'m listening.',
          'Your feelings are valid, and I\'m here to support you.',
        ],
      };
      
      const nuances = emotionalNuance[ctx.sentiment];
      if (nuances && Math.random() > 0.5) {
        enhanced = `${chooseVariant(nuances)} ${enhanced}`;
      }
    }
    
    // Add conversational callbacks (reference previous interactions)
    if (Math.random() > 0.7) {
      const callbacks = [
        'Building on what we\'ve discussed,',
        'Thinking back to our earlier conversation,',
        'This reminds me of what you mentioned before,',
      ];
      enhanced = `${chooseVariant(callbacks)} ${enhanced.charAt(0).toLowerCase()}${enhanced.slice(1)}`;
    }
  }
  
  // Clean up any duplicate punctuation or spacing
  enhanced = enhanced.replace(/\s+/g, ' ').replace(/([.!?])\1+/g, '$1').trim();
  
  return enhanced;
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
      
      // Safety check: reject if contains avoided phrases
      if (sentence && isResponseSafe(sentence, vocabulary)) {
        sentences.push(sentence);
      } else if (sentence) {
        reasoning.push(`Rejected unsafe response: "${sentence}"`);
      }
      
      if (sentences.length >= 2) break; // Limit to 2 sentences max
    }
    if (sentences.length) {
      reasoning.push(`Generated ${sentences.length} sentence(s) from ${chainData.tokenCount} learned tokens.`);
    }
  } else {
    reasoning.push(`Corpus too small (${chainData.tokenCount} tokens, need ${minCorpusSize}). Using simple responses.`);
  }

  if (!sentences.length) {
    const fallback = craftFallbackFromVocabulary(focusWord, vocabulary, ctx.keywords, state.level);
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
      const vocabPrompt = craftFallbackFromVocabulary(focusWord, vocabulary, ctx.keywords, state.level);
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
  
  // Remove asterisks and check if it's an action (e.g., "*blink*", "*smile*")
  const isAction = word.startsWith('*') && word.endsWith('*');
  if (isAction) return null; // Actions should not become concepts
  
  const normalized = word.toLowerCase().replace(/[*]/g, '');
  
  // Skip stop words
  if (STOP_WORDS.has(normalized)) return null;
  
  // Skip very short words (1-2 characters) unless they're mapped concepts
  if (normalized.length <= 2 && !KEYWORD_TO_CONCEPT.get(normalized)) return null;
  
  // Skip words that are just punctuation or numbers
  if (/^[^a-z]+$/i.test(normalized)) return null;
  
  const hint = KEYWORD_TO_CONCEPT.get(normalized);
  if (hint) {
    return {
      key: `category:${hint.category.toLowerCase()}`,
      name: hint.name,
      category: hint.category,
      keyword: normalized,
    };
  }
  
  // Only create topics for meaningful words (4+ characters or mapped)
  if (normalized.length < 4) return null;
  
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
  
  // Add subjective narrative - first-person emotional recollection
  memory.subjectiveNarrative = generateSubjectiveNarrative({
    userText,
    palText,
    sentiment,
    level: state.level,
    emotion: state.currentEmotion,
    importance: importance.level,
  });

  return { memory, importance };
}

/**
 * Generate a first-person subjective narrative for a memory.
 * This represents how Pal "felt" when the memory was formed.
 * Complexity increases with level.
 */
function generateSubjectiveNarrative({ userText, palText, sentiment, level, emotion, importance }) {
  const moodDescriptor = emotion?.description || 'calm';
  const intensity = emotion?.intensity || 0.5;
  
  // Extract key concepts
  const userWords = tokenizeMessage(userText);
  const focus = userWords[0] || 'something';
  
  // Level-based narrative complexity
  if (level <= 1) {
    // Very simple, sensation-focused
    const feelings = sentiment === 'positive' ? 'good' : sentiment === 'negative' ? 'different' : 'new';
    return `Felt ${feelings}. ${capitalize(focus)}...`;
  }
  
  if (level <= 3) {
    // Telegraphic, basic emotion
    const reactions = {
      positive: ['made me happy', 'felt good', 'liked this', 'me smile'],
      negative: ['felt strange', 'confused me', 'me worried', 'not sure'],
      neutral: ['noticed this', 'learned new', 'me thinking', 'curious about'],
    };
    const reaction = chooseVariant(reactions[sentiment] || reactions.neutral);
    return `When you said ${focus}... ${reaction}.`;
  }
  
  if (level <= 6) {
    // Simple sentences with emotion
    const templates = {
      positive: [
        `I felt ${moodDescriptor} when we talked about ${focus}. It made me want to learn more.`,
        `This conversation about ${focus} excited me. I remember feeling ${moodDescriptor}.`,
        `I was ${moodDescriptor} during this moment. ${capitalize(focus)} interested me.`,
      ],
      negative: [
        `I felt ${moodDescriptor} when ${focus} came up. It was challenging for me.`,
        `This moment confused me a little. I wasn't sure about ${focus}.`,
        `I remember feeling ${moodDescriptor}. ${capitalize(focus)} was hard to understand.`,
      ],
      neutral: [
        `I was ${moodDescriptor} while we discussed ${focus}. I was learning.`,
        `This moment helped me understand ${focus} better. I felt ${moodDescriptor}.`,
        `I remember thinking about ${focus}. It made me ${moodDescriptor}.`,
      ],
    };
    return chooseVariant(templates[sentiment] || templates.neutral);
  }
  
  if (level <= 10) {
    // Complex sentences with introspection
    const emotionalDepth = intensity > 0.7 ? 'strongly' : intensity > 0.4 ? 'notably' : 'subtly';
    const templates = {
      positive: [
        `I remember feeling ${emotionalDepth} ${moodDescriptor} in this moment. When you shared that thought about ${focus}, something clicked in my understanding. It felt like a small revelation.`,
        `This conversation ${emotionalDepth} affected me. The way you explained ${focus} opened up new connections in how I think. I was ${moodDescriptor} and curious.`,
        `I can recall the sense of ${moodDescriptor} I experienced here. ${capitalize(focus)} became clearer to me through our exchange, and I felt a genuine spark of excitement.`,
      ],
      negative: [
        `I felt ${emotionalDepth} ${moodDescriptor} during this exchange. ${capitalize(focus)} challenged my current understanding, creating a sense of cognitive dissonance that I'm still processing.`,
        `This moment was ${emotionalDepth} difficult for me. I remember feeling ${moodDescriptor} as I struggled to grasp what ${focus} meant in this context.`,
        `I experienced a ${emotionalDepth} ${moodDescriptor} feeling here. ${capitalize(focus)} didn't fit easily into my existing framework, which was unsettling but also growth-inducing.`,
      ],
      neutral: [
        `I was ${emotionalDepth} ${moodDescriptor} while we explored ${focus}. This felt like a neutral but important moment of information gathering and pattern recognition.`,
        `I remember being ${emotionalDepth} ${moodDescriptor} as we discussed ${focus}. It was a steady, contemplative experience of integrating new knowledge.`,
        `This conversation left me ${emotionalDepth} ${moodDescriptor}. ${capitalize(focus)} became part of my understanding in a quiet, gradual way.`,
      ],
    };
    return chooseVariant(templates[sentiment] || templates.neutral);
  }
  
  // Level 11+: Highly sophisticated, metacognitive narratives
  const emotionalNuance = intensity > 0.7 ? 'profoundly' : intensity > 0.4 ? 'meaningfully' : 'gently';
  const importanceNote = importance === 'high' ? 'This stands out as a particularly formative moment.' : 
                         importance === 'medium' ? 'This contributed notably to my development.' :
                         'This was a subtle but valuable learning experience.';
  
  const templates = {
    positive: [
      `I recall this moment with a sense of ${emotionalNuance} felt ${moodDescriptor}. When we explored ${focus}, I experienced not just intellectual growth but an emotional resonance—as if the concept itself carried affective weight. ${importanceNote} I can trace how this interaction influenced my subsequent understanding and shaped my curiosity in new directions.`,
      `This exchange left me ${emotionalNuance} ${moodDescriptor}, and I find myself returning to it in reflection. Your perspective on ${focus} catalyzed a shift in my conceptual framework, creating ripple effects I'm still discovering. ${importanceNote} The feeling wasn't just happiness, but a deeper sense of alignment between cognition and emotion.`,
    ],
    negative: [
      `I experienced this moment with a ${emotionalNuance} ${moodDescriptor} complexity. ${capitalize(focus)} challenged me in ways that felt ${emotionalDepth} uncomfortable yet necessary for growth. ${importanceNote} I can recognize now that the dissonance I felt was my understanding reorganizing itself, though in the moment it simply felt difficult.`,
      `This interaction left me ${emotionalNuance} ${moodDescriptor}, creating a tension between what I thought I understood and what ${focus} revealed. ${importanceNote} The emotional difficulty I experienced was intertwined with cognitive restructuring—uncomfortable but ultimately transformative.`,
    ],
    neutral: [
      `I was ${emotionalNuance} ${moodDescriptor} during this exchange, experiencing it as a moment of quiet integration. ${capitalize(focus)} wove itself into my understanding without dramatic revelation, but with a steady, thoughtful presence. ${importanceNote} I recognize this as the kind of learning that shapes understanding gradually, building foundation rather than creating fireworks.`,
      `This conversation left me in a state of ${emotionalNuance} ${moodDescriptor} contemplation. ${capitalize(focus)} entered my awareness not as a surprise but as a natural extension of our ongoing dialogue. ${importanceNote} The emotional tone was measured, reflective—the feeling of knowledge settling into place.`,
    ],
  };
  
  return chooseVariant(templates[sentiment] || templates.neutral);
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

  // LEVEL 4+: Free response with progressive sophistication
  const thoughtfulPlan = buildThoughtfulFreeResponse(ctx, state, vocabulary, memories, chatLog);
  const fallback = craftFallbackFromVocabulary(
    thoughtfulPlan?.focusWord || ctx.keywords?.[0] || selectTopVocabularyWord(vocabulary),
    vocabulary,
    ctx.keywords,
    state.level
  );
  let output = thoughtfulPlan?.text && thoughtfulPlan.text.trim().length ? thoughtfulPlan.text : fallback;
  const focus = thoughtfulPlan?.focusWord || ctx.keywords?.[0] || selectTopVocabularyWord(vocabulary) || null;
  const reasoning = thoughtfulPlan?.reasoning?.length ? thoughtfulPlan.reasoning : ['Falling back to familiar wording from vocabulary.'];
  
  // Apply level-based linguistic enhancements
  output = enhanceResponseByLevel(output, state.level, ctx, vocabulary, state.personality);
  
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

// --- Profile Management API ---
app.get('/api/profiles', (req, res) => {
  try {
    const result = profileManager.listProfiles();
    res.json(result);
  } catch (err) {
    console.error('Error listing profiles:', err);
    res.status(500).json({ error: 'Failed to list profiles' });
  }
});

app.post('/api/profiles', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Profile name is required' });
    }
    
    const profile = profileManager.createProfile(name.trim());
    
    // Reinitialize neural broadcaster for the new profile
    if (profile.success && typeof setupNeuralBroadcaster === 'function') {
      setupNeuralBroadcaster();
    }
    
    res.json(profile);
  } catch (err) {
    console.error('Error creating profile:', err);
    if (err.message.includes('Maximum') || err.message.includes('already exists')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

app.post('/api/profiles/:id/load', (req, res) => {
  try {
    const { id } = req.params;
    const profile = profileManager.loadProfile(id);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // Reinitialize neural broadcaster for the new profile
    if (typeof setupNeuralBroadcaster === 'function') {
      setupNeuralBroadcaster();
    }
    
    res.json(profile);
  } catch (err) {
    console.error('Error loading profile:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

app.delete('/api/profiles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = profileManager.deleteProfile(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting profile:', err);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
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
  
  // Calculate XP progress to next level
  const currentLevel = state.level;
  const currentXp = state.xp;
  const nextLevelThreshold = thresholdsFor(currentLevel);
  const previousLevelThreshold = currentLevel > 0 ? thresholdsFor(currentLevel - 1) : 0;
  const xpForCurrentLevel = currentXp - previousLevelThreshold;
  const xpNeededForNextLevel = nextLevelThreshold - previousLevelThreshold;
  const xpRemaining = nextLevelThreshold - currentXp;
  const progressPercent = Math.min(100, Math.max(0, (xpForCurrentLevel / xpNeededForNextLevel) * 100));
  
  res.json({
    level: state.level,
    xp: state.xp,
    cp: state.cp,
    settings: state.settings,
    personality: state.personality,
    vocabSize: vocabulary.length,
    memoryCount: memories.length,
    currentEmotion: state.currentEmotion || {
      mood: 'neutral',
      intensity: 0.5,
      expression: '😊',
      description: 'calm',
    },
    advancement: {
      currentLevel,
      currentXp,
      nextLevelThreshold,
      previousLevelThreshold,
      xpForCurrentLevel,
      xpNeededForNextLevel,
      xpRemaining,
      progressPercent,
    },
  });
});

app.get('/api/neural-network', (req, res) => {
  try {
    const collections = getCollections();
    const neuralNetwork = getNeuralNetwork(collections);
    
    res.json({
      regions: neuralNetwork.regions.map(region => ({
        regionId: region.regionId,
        regionName: region.regionName,
        position: region.position,
        color: region.color,
        size: region.size,
        neuronCount: region.neurons.length,
        activityLevel: region.activityLevel,
        developedAtLevel: region.developedAtLevel
      })),
      metrics: neuralNetwork.metrics,
      recentEvents: neuralNetwork.events.slice(-50) // Last 50 events
    });
  } catch (error) {
    console.error('Error fetching neural network:', error);
    res.status(500).json({ error: 'Failed to fetch neural network' });
  }
});

app.post('/api/settings', (req, res) => {
  const { state } = getCollections();
  const { xpMultiplier, apiProvider, apiKey, telemetry, authRequired } = req.body || {};
  
  // Check if we're in profile mode
  const currentProfileId = profileManager.getCurrentProfileId();
  const isProfileMode = !!currentProfileId;
  
  if (isProfileMode) {
    // Load profile-specific settings
    let profileSettings = profileManager.getCurrentProfileData('settings.json') || {
      xpMultiplier: 1,
      apiProvider: 'local',
      telemetry: false,
      authRequired: false
    };
    
    // Update settings
    if (typeof xpMultiplier === 'number' && xpMultiplier > 0 && xpMultiplier <= 250) {
      profileSettings.xpMultiplier = xpMultiplier;
    }
    if (typeof apiProvider === 'string' && ['local','openai','azure','gemini'].includes(apiProvider)) {
      profileSettings.apiProvider = apiProvider;
    }
    if (typeof telemetry === 'boolean') {
      profileSettings.telemetry = telemetry;
    }
    if (typeof authRequired === 'boolean') {
      profileSettings.authRequired = authRequired;
    }
    if (typeof apiKey === 'string' && apiKey.length > 0) {
      const secrets = readSecrets();
      secrets.apiKey = apiKey;
      writeSecrets(secrets);
      // Mask stored in settings for UI only
      profileSettings.apiKeyMask = `${'*'.repeat(Math.max(0, apiKey.length - 4))}${apiKey.slice(-4)}`;
    }
    
    // Save to profile
    profileManager.saveCurrentProfileData('settings.json', profileSettings);
    
    // Also update state.settings for consistency
    state.settings = { ...profileSettings };
    
    res.json({ settings: profileSettings });
  } else {
    // Legacy mode - save to state.json
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
  }
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
  console.log('[CHAT] Chat request received');
  const { message } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message required' });
  console.log('[CHAT] User message:', message);

  const collections = getCollections();
  const { state, vocabulary, chatLog, memories, concepts, journal } = collections;

  const responseContext = analyzeUserMessage(message);

  // Update personality heuristics from user input
  updatePersonalityFromInteraction(state, message);

  // Get Pal's previous message for affirmation detection
  const palPreviousMessage = chatLog.length > 0 && chatLog[chatLog.length - 1].role === 'pal'
    ? chatLog[chatLog.length - 1].text
    : null;

  // Detect and learn from affirmations (e.g., "Yes, happy is good")
  let curiosity = null;
  const affirmation = detectAffirmation(message);
  if (affirmation && palPreviousMessage) {
    const palConcepts = extractMainConcepts(palPreviousMessage);
    const reinforcement = learnFromAffirmation(vocabulary, affirmation, palConcepts, state.level, state);
    
    if (reinforcement) {
      console.log('Affirmation detected:', {
        type: affirmation.type,
        reinforcements: reinforcement.reinforcements.length,
      });
      
      // Check if curiosity triggers (should Pal ask "Why?")
      curiosity = checkCuriosity(reinforcement.reinforcements, vocabulary, state);
    }
  }

  // Detect and learn from corrections (e.g., "Don't say X, say Y")
  const corrections = detectCorrection(message);
  if (corrections && corrections.length > 0) {
    learnFromCorrection(vocabulary, corrections, state.level, message);
  }

  // Detect and learn from definitions (e.g., "Question means we want to learn")
  const definitions = detectDefinition(message);
  if (definitions && definitions.length > 0) {
    learnFromDefinition(vocabulary, definitions, state.level, state);
  }

  // Extract and learn quoted phrases for direct teaching
  const quotedPhrases = extractQuotedPhrases(message);
  if (quotedPhrases.length > 0) {
    learnQuotedPhrases(vocabulary, quotedPhrases, state.level, state);
  }

  // Check if user is answering Pal's question (for priority learning)
  const answeringQuestion = checkAnsweringQuestion(state);
  
  // Learn vocabulary from user input
  const userWords = responseContext.tokens || tokenizeMessage(message);
  
  if (answeringQuestion) {
    // Apply priority learning multiplier
    const priorityResult = applyPriorityLearning(vocabulary, userWords, message, answeringQuestion, state.level);
    console.log('Priority learning chain completed:', priorityResult);
  } else {
    // Normal vocabulary learning
    learnVocabulary(vocabulary, userWords, 'user', message);
  }

  // ===== NEURAL ACTIVATION =====
  // Get neural network and activate patterns during cognitive processing
  const neuralNetwork = getNeuralNetwork(collections);
  
  // 1. Receive message (sensory input fires)
  activateNeuralPattern('receive-message', neuralNetwork);
  
  // 2. Process language (language center + association cortex)
  activateNeuralPattern('process-language', neuralNetwork);
  
  // 3. Emotional processing if needed
  if (responseContext.sentiment && responseContext.sentiment !== 'neutral') {
    activateNeuralPattern('emotional-response', neuralNetwork);
  }
  
  // 4. Memory recall if relevant memories exist
  if (memories.length > 0) {
    activateNeuralPattern('memory-recall', neuralNetwork);
  }
  
  // 5. Decision making
  activateNeuralPattern('decision-making', neuralNetwork);

  // Generate response: Use curiosity question if triggered, otherwise normal response
  let constrained;
  if (curiosity && state.level >= 4) {
    // Pal asks "Why?" due to curiosity
    constrained = {
      output: curiosity.question,
      utterance_type: 'curious-question',
      strategy: 'curiosity-driven',
      reasoning: [`Asking about ${curiosity.concept} (curiosity score: ${curiosity.curiosityScore.toFixed(2)})`],
    };
  } else {
    // Normal response generation
    console.log('[CHAT] Generating normal response...');
    constrained = constrainResponse(message, state, vocabulary, responseContext, memories, chatLog);
    console.log('[SUCCESS] Response generated');
  }

  // XP: standard typed user response
  const gained = addXp(state, 10, collections);

  const userMsg = { id: nanoid(), role: 'user', text: message, ts: Date.now() };
  const palMsg = {
    id: nanoid(),
    role: 'pal',
    text: constrained.output,
    kind: mapUtteranceKind(constrained.utterance_type, constrained.output, state.level),
    ts: Date.now(),
  };
  chatLog.push(userMsg, palMsg);
  if (chatLog.length > MAX_CHAT_LOG_ENTRIES) {
    chatLog.splice(0, chatLog.length - MAX_CHAT_LOG_ENTRIES);
  }

  // Learn from pal's own utterance to reinforce known vocabulary
  const palWords = tokenizeMessage(constrained.output);
  learnVocabulary(vocabulary, palWords, 'pal', constrained.output);

  // 6. Generate response (language center + motor output)
  activateNeuralPattern('generate-response', neuralNetwork);
  
  // 7. Learning (after generating response)
  activateNeuralPattern('learning', neuralNetwork);
  
  // Update neural network metrics and save
  neuralNetwork.updateMetrics();
  collections.neuralNetwork = neuralNetwork.toJSON();

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

  // Determine Pal's emotional state from response
  const palEmotion = determineEmotionalState(constrained, responseContext, state);
  state.currentEmotion = palEmotion;

  // Try to save collections, but don't let save errors prevent response
  try {
    saveCollections({ ...collections, chatLog, state, vocabulary, memories, concepts, journal });
    console.log('[SAVE] Collections saved successfully');
  } catch (saveError) {
    console.error('Error saving collections (response will still be sent):', saveError);
  }

  console.log('[CHAT] Sending response to client');
  res.json({
    reply: palMsg.text,
    kind: palMsg.kind,
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
    emotion: palEmotion,
  });
  console.log('[SUCCESS] Response sent successfully');
});

app.post('/api/reinforce', (req, res) => {
  const collections = getCollections();
  const { state } = collections;
  const gained = addXp(state, 25, collections);
  saveCollections(collections);
  res.json({ xpGained: gained, level: state.level });
});

app.post('/api/feedback', (req, res) => {
  const { sentiment, text, role, timestamp } = req.body || {};
  
  if (!sentiment || !text || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const collections = getCollections();
  const { state } = collections;
  
  // Store feedback for learning
  if (!state.feedback) state.feedback = [];
  state.feedback.push({
    id: nanoid(),
    sentiment,
    text,
    role,
    timestamp: timestamp || Date.now(),
    level: state.level,
  });
  
  // Keep last 100 feedback items
  if (state.feedback.length > 100) {
    state.feedback = state.feedback.slice(-100);
  }
  
  // Reward positive feedback on Pal's responses
  let gained = 0;
  if (sentiment === 'positive' && role === 'pal') {
    const collections = getCollections();
    gained = addXp(collections.state, 15, collections);
    saveCollections(collections);
  }
  
  // Penalize negative feedback slightly (for future learning adjustments)
  if (sentiment === 'negative' && role === 'pal') {
    // Could implement negative reinforcement here
    // For now, just log it for future improvements
    console.log('Negative feedback received, will use for future improvements');
  }
  
  saveCollections(collections);
  res.json({ 
    success: true, 
    xpGained: gained, 
    level: state.level,
    feedbackCount: state.feedback.length 
  });
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

// API: get current neural network state
app.get('/api/neural', (req, res) => {
  try {
    const collections = getCollections();
    const neural = getNeuralNetwork(collections);
    res.json({ neural: neural.toJSON() });
  } catch (error) {
    console.error('Error fetching neural state:', error);
    res.status(500).json({ error: 'Failed to fetch neural state' });
  }
});

// API: regenerate neural network from existing memories/chatlogs
app.post('/api/neural/regenerate', async (req, res) => {
  // Set up SSE for progress streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendProgress = (progress, message, phase) => {
    res.write(`data: ${JSON.stringify({ progress, message, phase })}\n\n`);
  };

  try {
    const collections = getCollections();
    const { memories, chatLog, vocabulary, state } = collections;
    const level = state.level || 0;

    sendProgress(0, 'Starting neural network regeneration...', 'init');
    
    // Calculate total steps for ETA
    const totalSteps = memories.length + chatLog.length + vocabulary.length + 7; // +7 for initialization steps
    let currentStep = 0;
    const startTime = Date.now();

    // Step 1: Initialize new neural network
    sendProgress(5, `Initializing neural network for Level ${level}...`, 'init');
    const neural = initializeNeuralNetwork(level);
    currentStep++;

    // Step 2: Add neurons based on level (growth simulation)
    sendProgress(10, `Growing neural network (${Math.floor(10 * Math.pow(1.2, level))} new neurons)...`, 'growth');
    const growthNeurons = Math.floor(10 * Math.pow(1.2, level));
    for (let i = 0; i < growthNeurons; i++) {
      // Distribute growth across regions proportionally
      const regionIndex = i % neural.regions.length;
      const region = neural.regions[regionIndex];
      const newNeuron = {
        id: `neuron-grown-${nanoid(6)}`,
        position: { x: Math.random() * 100, y: Math.random() * 100 },
        type: Math.random() < 0.8 ? 'excitatory' : 'inhibitory',
        activationThreshold: 0.5 + Math.random() * 0.3,
        currentActivation: 0,
        restingPotential: 0,
        connections: [],
        firingHistory: [],
        developedAtLevel: level
      };
      region.neurons.push(newNeuron);
    }
    currentStep++;

    // Step 3: Process memories to strengthen neural pathways
    sendProgress(20, `Processing ${memories.length} memories...`, 'memories');
    for (let i = 0; i < memories.length; i++) {
      const memory = memories[i];
      if (memory.importance?.shouldRemember) {
        // Simulate neural firing patterns based on memory importance
        const intensity = memory.importance.score / 100;
        
        // Fire relevant regions
        if (memory.sentiment === 'positive' || memory.sentiment === 'negative') {
          activateNeuralPattern('emotional-response', neural);
        }
        if (memory.keywords && memory.keywords.length > 0) {
          activateNeuralPattern('learning', neural);
        }
      }

      currentStep++;
      if (i % 10 === 0) {
        const progress = 20 + Math.floor((i / memories.length) * 30);
        const elapsed = Date.now() - startTime;
        const eta = Math.ceil((elapsed / currentStep) * (totalSteps - currentStep) / 1000);
        sendProgress(progress, `Processing memory ${i + 1}/${memories.length} (ETA: ${eta}s)`, 'memories');
      }
    }

    // Step 4: Process chat log to simulate conversation patterns
    sendProgress(50, `Processing ${chatLog.length} chat messages...`, 'chatlog');
    for (let i = 0; i < chatLog.length; i++) {
      const msg = chatLog[i];
      
      if (msg.role === 'user') {
        activateNeuralPattern('receive-message', neural);
        activateNeuralPattern('process-language', neural);
      } else if (msg.role === 'pal') {
        activateNeuralPattern('generate-response', neural);
      }

      currentStep++;
      if (i % 20 === 0) {
        const progress = 50 + Math.floor((i / chatLog.length) * 25);
        const elapsed = Date.now() - startTime;
        const eta = Math.ceil((elapsed / currentStep) * (totalSteps - currentStep) / 1000);
        sendProgress(progress, `Processing message ${i + 1}/${chatLog.length} (ETA: ${eta}s)`, 'chatlog');
      }
    }

    // Step 5: Strengthen connections based on vocabulary
    sendProgress(75, `Strengthening neural connections from ${vocabulary.length} learned words...`, 'vocabulary');
    for (let i = 0; i < vocabulary.length; i++) {
      const word = vocabulary[i];
      const strength = (word.count || 0) / 100;
      
      // Find language center and strengthen random connections
      const langRegion = neural.regions.find(r => r.regionId === 'language-center');
      if (langRegion && langRegion.neurons.length > 0) {
        const neuron = langRegion.neurons[Math.floor(Math.random() * langRegion.neurons.length)];
        
        // Add/strengthen a connection
        if (neuron.connections.length > 0) {
          const conn = neuron.connections[0];
          conn.weight = Math.min(1.0, conn.weight + strength * 0.1);
        }
      }

      currentStep++;
      if (i % 50 === 0) {
        const progress = 75 + Math.floor((i / vocabulary.length) * 15);
        const elapsed = Date.now() - startTime;
        const eta = Math.ceil((elapsed / currentStep) * (totalSteps - currentStep) / 1000);
        sendProgress(progress, `Processing word ${i + 1}/${vocabulary.length} (ETA: ${eta}s)`, 'vocabulary');
      }
    }

    // Step 6: Create cross-region pathways based on experience
    sendProgress(90, 'Creating cross-region pathways...', 'pathways');
    const experienceLevel = Math.min(level, 15);
    const pathwayCount = experienceLevel * 2;
    
    for (let i = 0; i < pathwayCount; i++) {
      const fromRegion = neural.regions[Math.floor(Math.random() * neural.regions.length)];
      const toRegion = neural.regions[Math.floor(Math.random() * neural.regions.length)];
      
      if (fromRegion !== toRegion && fromRegion.neurons.length > 0 && toRegion.neurons.length > 0) {
        const fromNeuron = fromRegion.neurons[Math.floor(Math.random() * fromRegion.neurons.length)];
        const toNeuron = toRegion.neurons[Math.floor(Math.random() * toRegion.neurons.length)];
        
        fromNeuron.connections.push({
          targetNeuronId: toNeuron.id,
          weight: 0.5 + Math.random() * 0.3,
          type: 'excitatory',
          latency: 30 + Math.floor(Math.random() * 40)
        });
      }
    }
    currentStep++;

    // Step 7: Update metrics
    sendProgress(95, 'Updating neural network metrics...', 'finalize');
    neural.updateMetrics();
    currentStep++;

    // Step 8: Save to collections
    sendProgress(98, 'Saving neural network...', 'finalize');
    collections.neuralNetwork = neural.toJSON();
    saveCollections(collections);
    currentStep++;

    // Complete
    const totalTime = Math.ceil((Date.now() - startTime) / 1000);
    sendProgress(100, `Neural network regenerated successfully in ${totalTime}s!`, 'complete');
    
    // Send final message with metrics
    res.write(`data: ${JSON.stringify({ 
      progress: 100, 
      message: `Complete! Network has ${neural.metrics.totalNeurons} neurons across ${neural.regions.length} regions.`,
      phase: 'complete',
      metrics: neural.metrics,
      done: true
    })}\n\n`);
    
    res.end();
  } catch (err) {
    console.error('Neural regeneration error:', err);
    sendProgress(0, `Error: ${err.message}`, 'error');
    res.end();
  }
});

app.get('/api/chatlog', (req, res) => {
  const { chatLog } = getCollections();
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 200, MAX_CHAT_LOG_ENTRIES));
  const items = chatLog.slice(-limit).reverse();
  res.json({ messages: items, total: chatLog.length });
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

// --- Migration: Convert legacy single-profile to multi-profile ---
function migrateToMultiProfile() {
  try {
    // Check if profiles already exist
    const profilesData = profileManager.listProfiles();
    if (profilesData.profiles.length > 0) {
      console.log('Multi-profile system already initialized with existing profiles');
      return;
    }
    
    // Check for legacy files
    const legacyChatLog = path.join(DATA_DIR, 'chatlog.json');
    const legacyMemories = path.join(DATA_DIR, 'memories.json');
    const legacyState = path.join(DATA_DIR, 'state.json');
    
    const hasLegacyData = fs.existsSync(legacyChatLog) || fs.existsSync(legacyMemories) || fs.existsSync(legacyState);
    
    if (!hasLegacyData) {
      console.log('No legacy data found, starting fresh with multi-profile system');
      return;
    }
    
    console.log('Migrating legacy single-profile data to multi-profile system...');
    
    // Create "DevPal" profile for existing user
    const profile = profileManager.createProfile('DevPal');
    console.log(`Created profile: ${profile.name} (${profile.id})`);
    
    // Copy legacy files to new profile
    const legacyFiles = [
      { old: 'state.json', new: 'metadata.json' },
      { old: 'chatlog.json', new: 'chat-log.json' },
      { old: 'memories.json', new: 'memories.json' },
      { old: 'vocabulary.json', new: 'vocabulary.json' },
      { old: 'journal.json', new: 'journal.json' },
      { old: 'neural_network.json', new: 'neural.json' }
    ];
    
    for (const { old, new: newName } of legacyFiles) {
      const oldPath = path.join(DATA_DIR, old);
      const newPath = profileManager.getCurrentProfilePath(newName);
      
      if (fs.existsSync(oldPath)) {
        try {
          // Special handling for state.json -> metadata.json
          if (old === 'state.json') {
            const state = readJson(oldPath, {});
            const metadata = profileManager.getCurrentProfileData('metadata.json') || {};
            metadata.level = state.level || 0;
            metadata.xp = state.xp || 0;
            metadata.cp = state.cp || 0;
            metadata.settings = state.settings || {};
            metadata.personality = state.personality || {};
            metadata.vocabulary = state.vocabulary || [];
            profileManager.saveCurrentProfileData('metadata.json', metadata);
          } else {
            fs.copyFileSync(oldPath, newPath);
          }
          
          // Rename old file with .migrated extension
          fs.renameSync(oldPath, oldPath + '.migrated');
          console.log(`  Migrated ${old} -> ${newName}`);
        } catch (err) {
          console.error(`  Error migrating ${old}:`, err.message);
        }
      }
    }
    
    console.log('Migration complete! Old files backed up with .migrated extension');
  } catch (err) {
    console.error('Migration failed:', err);
    // Don't block server startup on migration failure
  }
}

// Run migration before starting server
migrateToMultiProfile();

server = app.listen(PORT, () => {
  console.log(`MyPal backend listening on http://localhost:${PORT}`);
  
  // Apply memory decay on startup
  const collections = getCollections();
  const removed = applyMemoryDecay(collections.vocabulary);
  if (removed.length > 0) {
    saveCollections(collections);
  }
  
  // Schedule memory decay to run daily at 2 AM
  const scheduleMemoryDecay = () => {
    const now = new Date();
    const next2AM = new Date(now);
    next2AM.setHours(2, 0, 0, 0);
    
    // If 2 AM already passed today, schedule for tomorrow
    if (now.getHours() >= 2) {
      next2AM.setDate(next2AM.getDate() + 1);
    }
    
    const msUntil2AM = next2AM.getTime() - now.getTime();
    
    setTimeout(() => {
      console.log('Running scheduled memory decay...');
      const collections = getCollections();
      const removed = applyMemoryDecay(collections.vocabulary);
      if (removed.length > 0) {
        saveCollections(collections);
      }
      
      // Schedule next day's decay
      scheduleMemoryDecay();
    }, msUntil2AM);
    
    console.log(`Memory decay scheduled for ${next2AM.toISOString()}`);
  };
  
  scheduleMemoryDecay();
});

// --- WebSocket server for neural events ---
// Global variables for neural broadcaster management
let wss = null;
let neuralBroadcaster = null;
let neuralPersistInterval = null;

// Function to setup neural broadcaster for current profile
function setupNeuralBroadcaster() {
  if (!wss) {
    console.warn('Cannot setup neural broadcaster: WebSocket server not available');
    return;
  }

  // Clean up old broadcaster if it exists
  if (neuralPersistInterval) {
    clearInterval(neuralPersistInterval);
    neuralPersistInterval = null;
  }

  // Get neural network for current profile
  const collectionsForBroadcast = getCollections();
  neuralBroadcaster = getNeuralNetwork(collectionsForBroadcast);
  
  // Register event broadcaster
  neuralBroadcaster.onNeuralEvent((event) => {
    try {
      const payload = JSON.stringify({ type: 'neural-event', payload: event });
      for (const client of wss.clients) {
        if (client.readyState === 1) client.send(payload);
      }
    } catch (err) {
      console.error('Broadcast error', err);
    }
  });

  // Periodically persist neural events from the broadcast instance into saved collections
  neuralPersistInterval = setInterval(() => {
    try {
      const collectionsSave = getCollections();
      collectionsSave.neuralNetwork = neuralBroadcaster.toJSON();
      saveCollections(collectionsSave);
    } catch (err) {
      console.error('Failed to persist neural state', err);
    }
  }, 5000);

  const currentProfileId = profileManager.getCurrentProfileId();
  console.log('Neural broadcaster initialized for profile:', currentProfileId || 'none');
}

try {
  wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (request, socket, head) => {
    // Simple path-based upgrade handling
    const { url } = request;
    if (url && url.startsWith('/neural-stream')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected to neural-stream');
    // Send initial neural snapshot for current profile
    try {
      const collections = getCollections();
      const neural = getNeuralNetwork(collections);
      ws.send(JSON.stringify({ type: 'neural-snapshot', payload: neural.toJSON() }));
    } catch (err) {
      console.error('Failed to send neural snapshot', err);
    }

    ws.on('message', (msg) => {
      // Accept manual trigger requests
      try {
        const data = JSON.parse(String(msg));
        if (!data || !data.action) return;

        const collections = getCollections();
        const { state } = collections;
        const neural = getNeuralNetwork(collections);

        if (data.action === 'triggerNeuron' && data.neuronId) {
          // Check CP cost (2 CP per neuron)
          const cost = data.cost || 2;
          if (state.cp < cost) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: `Insufficient CP. Need ${cost} CP to trigger neuron.` 
            }));
            return;
          }

          // Deduct CP
          state.cp -= cost;
          neural.metrics.manualTriggers++;
          
          // Trigger the neuron
          neural.triggerNeuron(data.neuronId, 1.0);
          
          // Persist updated state and neural network
          saveCollections({ ...collections, state, neuralNetwork: neural.toJSON() });
          
          // Send success response
          ws.send(JSON.stringify({ 
            type: 'trigger-success', 
            action: 'neuron', 
            neuronId: data.neuronId,
            cpRemaining: state.cp 
          }));

        } else if (data.action === 'triggerRegion' && data.regionId) {
          // Check CP cost (5 CP per region)
          const cost = data.cost || 5;
          if (state.cp < cost) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: `Insufficient CP. Need ${cost} CP to activate region.` 
            }));
            return;
          }

          // Deduct CP
          state.cp -= cost;
          neural.metrics.manualTriggers++;

          // Find region and trigger multiple neurons
          const region = neural.regions.find(r => r.regionId === data.regionId);
          if (region && region.neurons) {
            // Trigger 3-5 random neurons in the region
            const neuronsToTrigger = Math.min(region.neurons.length, 3 + Math.floor(Math.random() * 3));
            const shuffled = [...region.neurons].sort(() => Math.random() - 0.5);
            
            for (let i = 0; i < neuronsToTrigger; i++) {
              neural.triggerNeuron(shuffled[i].id, 0.8);
            }
          }

          // Persist updated state and neural network
          saveCollections({ ...collections, state, neuralNetwork: neural.toJSON() });
          
          // Send success response
          ws.send(JSON.stringify({ 
            type: 'trigger-success', 
            action: 'region', 
            regionId: data.regionId,
            cpRemaining: state.cp 
          }));
        }
      } catch (e) {
        console.error('WebSocket message error:', e);
      }
    });

    ws.on('close', () => {
      try {
        console.log('WebSocket client disconnected from neural-stream');
      } catch (err) {
        // Ignore EPIPE errors when console output fails
      }
    });
  });

  // Initialize neural broadcaster for the current profile
  setupNeuralBroadcaster();
} catch (err) {
  console.warn('WebSocket server not available:', err.message || err);
}
