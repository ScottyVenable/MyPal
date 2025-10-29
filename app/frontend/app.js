import * as THREE from 'three';
import ForceGraph3D from '3d-force-graph';

const API_BASE = 'http://localhost:3001/api';
let backendHealthy = false;
let authToken = localStorage.getItem('mypal_token') || null;
let latestMemoryTotal = 0;
let defaultBrainDescription = '';
let latestJournalTotal = 0;
let journalLoaded = false;
let journalLoading = false;
let multiplierDirty = false;
let lastUserMessage = '';
let typingEl = null;
let currentProfileId = null;
let brainGraph3D = null;
let brainGraphData = { nodes: [], links: [] };
let brainGraphResizeObserver = null;
let neuralGraph3D = null;
let neuralGraphData = { nodes: [], links: [] };
let neuralNodeIndex = new Map();
let neuralLinkIndex = new Map();
let neuralGraphResizeObserver = null;
let neuralGraphRefreshRaf = null;
const neuralActivityFeed = [];
const neuralActivityMap = new Map();
const neuralActivityByNeuron = new Map();
const neuralActivityIdSet = new Set();
let neuralReplayQueue = [];
let neuralReplayActive = false;
const MAX_ACTIVITY_ENTRIES = 30;
const CHAT_TIMEOUT_MS = 15000;
const CHAT_MAX_RETRIES = 1;
const CHAT_RETRY_DELAY_MS = 900;
const neuralPlaybackState = {
  autoZoom: false,
  timelinePlaying: false,
  stopRequested: false,
  dropdownListener: null,
  playbackButton: null,
};

// ==============================================
// COMPREHENSIVE LOGGING SYSTEM
// ==============================================

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const LOG_CATEGORIES = {
  CHAT: { text: 'CHAT', emoji: '💬' },
  TYPING: { text: 'TYPING', emoji: '⌨️' },
  UI: { text: 'UI', emoji: '🖥️' },
  API: { text: 'API', emoji: '🌐' },
  WEBSOCKET: { text: 'WEBSOCKET', emoji: '🔌' },
  PROFILE: { text: 'PROFILE', emoji: '👤' },
  NEURAL: { text: 'NEURAL', emoji: '🧠' },
  PERFORMANCE: { text: 'PERFORMANCE', emoji: '⚡' },
  STATE: { text: 'STATE', emoji: '📊' },
  ERROR: { text: 'ERROR', emoji: '❌' },
  STARTUP: { text: 'STARTUP', emoji: '🚀' }
};

let logLevel = LOG_LEVELS.DEBUG; // Set to INFO for production
let logSequence = 0;

function getLogTimestamp() {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  });
  return `${time}`;
}

function log(level, category, message, data = null) {
  if (level < logLevel) return;
  
  const timestamp = getLogTimestamp();
  const seq = String(++logSequence).padStart(4, '0');
  const categoryInfo = LOG_CATEGORIES[category] || { text: 'UNKNOWN', emoji: '📝' };
  const levelName = Object.keys(LOG_LEVELS)[level];
  
  // Clean text-only prefix for file logs and telemetry
  const cleanPrefix = `[${timestamp}] [${seq}] [${categoryInfo.text}] [${levelName}]`;
  
  // Enhanced console prefix with emoji for better visual scanning
  const consolePrefix = `[${timestamp}] [${seq}] ${categoryInfo.emoji} [${levelName}]`;
  
  // Choose appropriate console method
  const consoleMethod = level >= LOG_LEVELS.ERROR ? 'error' :
                       level >= LOG_LEVELS.WARN ? 'warn' :
                       level >= LOG_LEVELS.INFO ? 'info' : 'log';
  
  if (data !== null) {
    console[consoleMethod](`${consolePrefix} ${message}`, data);
  } else {
    console[consoleMethod](`${consolePrefix} ${message}`);
  }
  
  // Send to backend telemetry for critical logs (clean text only)
  if (level >= LOG_LEVELS.WARN) {
    try {
      fetch(`${API_BASE}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          source: 'frontend', 
          type: levelName.toLowerCase(), 
          category: categoryInfo.text,
          message: `${cleanPrefix} ${message} ${data ? JSON.stringify(data) : ''}`,
          timestamp: Date.now(),
          sequence: logSequence
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }
}

// Convenience functions
const logDebug = (category, message, data) => log(LOG_LEVELS.DEBUG, category, message, data);
const logInfo = (category, message, data) => log(LOG_LEVELS.INFO, category, message, data);
const logWarn = (category, message, data) => log(LOG_LEVELS.WARN, category, message, data);
const logError = (category, message, data) => log(LOG_LEVELS.ERROR, category, message, data);

function summarizeNeuralActivations(activations) {
  if (!Array.isArray(activations) || activations.length === 0) return '';
  return activations
    .map((entry) => (entry && typeof entry === 'object' ? entry.task : null))
    .filter(Boolean)
    .join(' -> ');
}

function buildPalMeta(response, { prefix } = {}) {
  const parts = [];
  if (prefix) parts.push(prefix);
  if (response?.kind) parts.push(`Mode: ${response.kind}`);
  const neuralSummary = summarizeNeuralActivations(response?.neuralActivations);
  if (neuralSummary) parts.push(`Neural: ${neuralSummary}`);
  if (typeof response?.processingTimeMs === 'number') {
    const rounded = Math.max(0, Math.round(response.processingTimeMs));
    parts.push(`Processed in ${rounded}ms`);
  }
  return parts.length ? parts.join(' | ') : undefined;
}

// Performance timing helpers
const perfTimers = new Map();

function startTimer(name) {
  perfTimers.set(name, performance.now());
  logDebug('PERFORMANCE', `Timer started: ${name}`);
}

function endTimer(name) {
  const startTime = perfTimers.get(name);
  if (startTime) {
    const duration = performance.now() - startTime;
    perfTimers.delete(name);
    logInfo('PERFORMANCE', `Timer completed: ${name} (${duration.toFixed(2)}ms)`);
    return duration;
  }
  return null;
}

// Global logging controls for console access
window.MyPalLogging = {
  setLevel: (level) => {
    const newLevel = typeof level === 'string' ? LOG_LEVELS[level.toUpperCase()] : level;
    if (newLevel !== undefined) {
      logLevel = newLevel;
      logInfo('STATE', `Log level changed to ${Object.keys(LOG_LEVELS)[newLevel]}`);
    } else {
      console.warn('Invalid log level. Use: DEBUG, INFO, WARN, ERROR or 0-3');
    }
  },
  getLevel: () => Object.keys(LOG_LEVELS)[logLevel],
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
  forceEnableInputs: forceEnableAllInputs,
  clearTyping: clearAllTypingIndicators,
  getLevels: () => LOG_LEVELS,
  getCategories: () => LOG_CATEGORIES
};

// Initialize logging
logInfo('STATE', 'Frontend logging system initialized', { 
  logLevel: Object.keys(LOG_LEVELS)[logLevel],
  categories: Object.keys(LOG_CATEGORIES),
  globalObject: 'MyPalLogging',
  cleanLogging: true
});

console.log('%c🎯 MyPal Logging Initialized!', 'color: #66bb6a; font-weight: bold; font-size: 14px;');
console.log('%cLogs use clean text for files/telemetry, emojis for console only', 'color: #9ab4ff;');
console.log('%cUse MyPalLogging.setLevel("DEBUG") to see all logs', 'color: #9ab4ff;');
console.log('%cAvailable commands: setLevel, getLevel, forceEnableInputs, clearTyping', 'color: #9ab4ff;');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let bootLoaderRefs = null;
let bootLoaderHelpShown = false;

function getBootLoaderRefs() {
  if (!bootLoaderRefs) {
    bootLoaderRefs = {
      container: document.getElementById('boot-loader'),
      stage: document.getElementById('boot-loader-stage'),
      detail: document.getElementById('boot-loader-detail'),
      error: document.getElementById('boot-loader-error'),
      help: document.getElementById('boot-loader-help')
    };
  }
  return bootLoaderRefs;
}

function setBootLoaderStage(stage) {
  const refs = getBootLoaderRefs();
  if (refs.stage && typeof stage === 'string') {
    refs.stage.textContent = stage;
  }
}

function setBootLoaderDetail(detail) {
  const refs = getBootLoaderRefs();
  if (refs.detail && typeof detail === 'string') {
    refs.detail.textContent = detail;
  }
}

function setBootLoaderError(message) {
  const refs = getBootLoaderRefs();
  if (!refs.error) return;
  if (message) {
    refs.error.textContent = message;
    refs.error.classList.remove('hidden');
  } else {
    refs.error.textContent = '';
    refs.error.classList.add('hidden');
  }
}

function toggleBootLoaderHelp(show) {
  const refs = getBootLoaderRefs();
  if (!refs.help) return;
  if (show) {
    refs.help.classList.remove('hidden');
    bootLoaderHelpShown = true;
  } else {
    refs.help.classList.add('hidden');
    bootLoaderHelpShown = false;
  }
}

function showBootLoader(stage, detail) {
  const refs = getBootLoaderRefs();
  if (!refs.container) return;
  refs.container.classList.remove('hidden');
  if (document.body) {
    document.body.classList.add('boot-loading');
  }
  if (stage) setBootLoaderStage(stage);
  if (detail) setBootLoaderDetail(detail);
  setBootLoaderError('');
  toggleBootLoaderHelp(false);
}

function hideBootLoader() {
  const refs = getBootLoaderRefs();
  if (!refs.container) return;
  refs.container.classList.add('hidden');
  if (document.body) {
    document.body.classList.remove('boot-loading');
  }
  setBootLoaderError('');
}

// ==============================================
// PROFILE MANAGEMENT
// ==============================================

// Appearance Settings
function loadAppearanceSettings() {
  const theme = localStorage.getItem('mypal_theme') || 'dark';
  const font = localStorage.getItem('mypal_font') || 'system-ui';
  const textSize = localStorage.getItem('mypal_text_size') || '16';
  const smoothScrolling = localStorage.getItem('mypal_smooth_scrolling') !== 'false';
  const reducedMotion = localStorage.getItem('mypal_reduced_motion') === 'true';
  
  applyAppearanceSettings({ theme, font, textSize, smoothScrolling, reducedMotion });
  
  return { theme, font, textSize, smoothScrolling, reducedMotion };
}

function applyAppearanceSettings({ theme, font, textSize, smoothScrolling, reducedMotion }) {
  document.body.setAttribute('data-theme', theme);
  document.body.style.fontFamily = font;
  document.body.style.fontSize = `${textSize}px`;
  
  if (smoothScrolling) {
    document.body.classList.add('smooth-scrolling');
  } else {
    document.body.classList.remove('smooth-scrolling');
  }
  
  if (reducedMotion) {
    document.body.classList.add('reduced-motion');
  } else {
    document.body.classList.remove('reduced-motion');
  }
}

function saveAppearanceSettings({ theme, font, textSize, smoothScrolling, reducedMotion }) {
  localStorage.setItem('mypal_theme', theme);
  localStorage.setItem('mypal_font', font);
  localStorage.setItem('mypal_text_size', textSize);
  localStorage.setItem('mypal_smooth_scrolling', smoothScrolling);
  localStorage.setItem('mypal_reduced_motion', reducedMotion);
  
  applyAppearanceSettings({ theme, font, textSize, smoothScrolling, reducedMotion });
}

async function loadProfilesList() {
  try {
    const res = await apiFetch('/profiles');
    if (!res.ok) throw new Error('Failed to load profiles');
    return await res.json();
  } catch (err) {
    console.error('Error loading profiles:', err);
    return null;
  }
}

async function createProfile(name) {
  try {
    const res = await apiFetch('/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    const payload = await res.json().catch(() => null);
    
    if (!payload) {
      throw new Error('Unexpected response from server');
    }
    
    if (!res.ok || payload.success === false) {
      const message = payload?.error || 'Failed to create profile';
      throw new Error(message);
    }
    
    return payload?.profile ?? payload;
  } catch (err) {
    console.error('Error creating profile:', err);
    throw err;
  }
}

async function loadProfile(profileId) {
  logInfo('PROFILE', `Loading profile`, { profileId });
  
  try {
    const res = await apiFetch(`/profiles/${profileId}/load`, {
      method: 'POST'
    });
    
    logDebug('API', `Profile load response`, { 
      profileId, 
      status: res.status,
      ok: res.ok
    });

    const payload = await res.json().catch(() => null);
    if (!payload) {
      throw new Error('Unexpected response from server');
    }

    if (!res.ok || payload.success === false) {
      const message = payload?.error || 'Failed to load profile';
      throw new Error(message);
    }

    const profile = payload?.profile ?? payload;
    currentProfileId = profileId;
    localStorage.setItem('mypal_current_profile', profileId);
    
    logInfo('PROFILE', `Profile loaded successfully`, { 
      profileId,
      profileName: profile.name,
      level: profile.level,
      xp: profile.xp
    });
    
    // Update profile badge in header
    const profileBadge = $('#current-profile-name');
    if (profileBadge) {
      profileBadge.textContent = profile.name;
      logDebug('UI', `Profile badge updated`, { profileName: profile.name });
    }
    
    return profile;
  } catch (err) {
    logError('PROFILE', `Error loading profile`, { profileId, error: err.message });
    throw err;
  }
}

async function deleteProfile(profileId) {
  try {
    const res = await apiFetch(`/profiles/${profileId}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) throw new Error('Failed to delete profile');
    return await res.json();
  } catch (err) {
    console.error('Error deleting profile:', err);
    throw err;
  }
}

function showProfileMenu() {
  $('#profile-menu').classList.remove('hidden');
  $('#main-app').classList.add('hidden');
}

function hideProfileMenu() {
  $('#profile-menu').classList.add('hidden');
  $('#main-app').classList.remove('hidden');
}

function describeLastPlayed(timestamp, { includeTime = false } = {}) {
  if (!timestamp) return 'Never';
  try {
    const playedAt = new Date(timestamp);
    const diffMs = Date.now() - playedAt.getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    if (diffMs < oneDay) {
      return includeTime ? `Today at ${playedAt.toLocaleTimeString()}` : 'Today';
    }
    if (diffMs < oneDay * 2) {
      return includeTime ? `Yesterday at ${playedAt.toLocaleTimeString()}` : 'Yesterday';
    }
    return includeTime ? playedAt.toLocaleString() : playedAt.toLocaleDateString();
  } catch {
    return 'Unknown';
  }
}

function renderProfileCards(profiles = [], options = {}) {
  const container = $('#profile-cards');
  if (!container) return;
  const { lastUsedId = null } = options;

  const triggerCreateFlow = () => $('#new-pal-btn')?.click();

  container.innerHTML = '';
  container.classList.remove('hidden');

  if (!profiles || profiles.length === 0) {
    container.innerHTML = `
      <div class="profile-empty-card">
        <h3>No Pals Yet</h3>
        <p>Create a new Pal to begin your journey.</p>
        <button type="button" class="btn-primary btn-inline" id="profile-empty-create">Create Pal</button>
      </div>
    `;
    container.querySelector('#profile-empty-create')?.addEventListener('click', triggerCreateFlow);
    return;
  }

  const sortedProfiles = [...profiles].sort(
    (a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0)
  );
  const recentProfiles = sortedProfiles.slice(0, Math.min(sortedProfiles.length, 3));
  const remainingProfiles = sortedProfiles.slice(recentProfiles.length);

  const fragment = document.createDocumentFragment();

  const createProfileCard = (profile) => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    if (profile.id === lastUsedId) {
      card.classList.add('profile-card-active');
    }

    card.innerHTML = `
      <div class="profile-card-header">
        <div class="profile-card-heading">
          <h3 class="profile-card-name">${profile.name}</h3>
          <div class="profile-card-meta">Level ${profile.level || 1} • ${profile.xp || 0} XP</div>
        </div>
        <button type="button" class="profile-card-delete" data-profile-id="${profile.id}" title="Delete profile">🗑️</button>
      </div>
      <div class="profile-card-body">
        <div class="profile-card-stat">
          <span class="profile-card-stat-label">Messages</span>
          <span class="profile-card-stat-value">${profile.messageCount || 0}</span>
        </div>
        <div class="profile-card-stat">
          <span class="profile-card-stat-label">Memories</span>
          <span class="profile-card-stat-value">${profile.memoryCount || 0}</span>
        </div>
      </div>
      <div class="profile-card-footer">Last played: ${describeLastPlayed(profile.lastPlayedAt)}</div>
    `;

    card.addEventListener('click', async (e) => {
      if ((e.target instanceof HTMLElement) && e.target.classList.contains('profile-card-delete')) {
        return;
      }

      try {
        await loadProfile(profile.id);
        hideProfileMenu();
        await refreshStats();
      } catch (err) {
        alert(`Failed to load profile: ${err.message}`);
      }
    });

    const deleteBtn = card.querySelector('.profile-card-delete');
    deleteBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();

      if (!confirm(`Delete "${profile.name}"? This cannot be undone.`)) return;

      try {
        await deleteProfile(profile.id);
        await initProfileMenu();
      } catch (err) {
        alert(`Failed to delete profile: ${err.message}`);
      }
    });

    return card;
  };

  const buildSection = (title, items) => {
    if (!items || items.length === 0) return;

    const section = document.createElement('section');
    section.className = 'profile-section';

    const header = document.createElement('div');
    header.className = 'profile-section-header';
    header.innerHTML = `
      <h2 class="profile-section-title">${title}</h2>
      <span class="profile-section-count">${items.length}</span>
    `;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'profile-card-grid';
    items.forEach((profile) => {
      const card = createProfileCard(profile);
      if (card) grid.appendChild(card);
    });

    section.appendChild(grid);
    fragment.appendChild(section);
  };

  buildSection('Recently Used', recentProfiles);
  buildSection(recentProfiles.length ? 'All Pals' : 'Your Pals', remainingProfiles);

  container.appendChild(fragment);
}

async function initProfileMenu() {
  const data = await loadProfilesList();
  if (!data) {
    alert('Failed to load profiles. Please check the server.');
    return;
  }
  
  const { profiles, lastUsedId, maxProfiles } = data;
  
  // Update continue button
  const continueSection = $('#continue-section');
  const continueBtn = $('#continue-btn');
  const continueName = $('#continue-name');
  const continueMeta = $('#continue-meta');
  
  if (lastUsedId && profiles.length > 0) {
    const lastProfile = profiles.find(p => p.id === lastUsedId);
    if (lastProfile) {
      continueSection.classList.remove('hidden');
      continueName.textContent = lastProfile.name;
      if (continueMeta) {
        const playedLabel = describeLastPlayed(lastProfile.lastPlayedAt, { includeTime: true });
        continueMeta.textContent = `Level ${lastProfile.level || 1} • Last played ${playedLabel}`;
        continueMeta.classList.remove('hidden');
      }
      
      continueBtn.onclick = async () => {
        try {
          await loadProfile(lastUsedId);
          hideProfileMenu();
          await refreshStats();
        } catch (err) {
          alert(`Failed to continue: ${err.message}`);
        }
      };
    } else {
      continueSection.classList.add('hidden');
      if (continueMeta) {
        continueMeta.textContent = '';
        continueMeta.classList.add('hidden');
      }
    }
  } else {
    continueSection.classList.add('hidden');
    if (continueMeta) {
      continueMeta.textContent = '';
      continueMeta.classList.add('hidden');
    }
  }
  
  // Update New Pal button state
  const newPalBtn = $('#new-pal-btn');
  if (profiles.length >= maxProfiles) {
    newPalBtn.disabled = true;
    newPalBtn.title = `Maximum ${maxProfiles} profiles reached`;
  } else {
    newPalBtn.disabled = false;
    newPalBtn.title = '';
  }
  
  renderProfileCards(profiles, { lastUsedId });
}

function wireProfileManagement() {
  const newPalBtn = $('#new-pal-btn');
  const loadPalBtn = $('#load-pal-btn');
  const newPalModal = $('#new-pal-modal');
  const newPalForm = $('#new-pal-form');
  const newPalCancel = $('#new-pal-cancel');
  const newPalError = $('#new-pal-error');
  
  newPalBtn?.addEventListener('click', () => {
    // Re-query the input element to avoid stale references
    const newPalName = $('#new-pal-name');
    if (!newPalName) return;
    
    newPalModal.classList.remove('hidden');
    newPalName.value = '';
    
    // Ensure input is editable and focusable - comprehensive cleanup
    newPalName.removeAttribute('readonly');
    newPalName.removeAttribute('disabled');
    newPalName.removeAttribute('aria-disabled');
    newPalName.removeAttribute('tabindex');
    newPalName.readOnly = false;
    newPalName.disabled = false;
    newPalError.classList.add('hidden');
    
    // Delay focus to ensure modal is fully rendered and DOM is settled
    setTimeout(() => {
      // Double-check attributes before focusing
      newPalName.removeAttribute('readonly');
      newPalName.removeAttribute('disabled');
      newPalName.readOnly = false;
      newPalName.disabled = false;
      
      try {
        // Use requestAnimationFrame for reliable caret placement
        requestAnimationFrame(() => {
          newPalName.focus({ preventScroll: true });
          newPalName.select();
        });
      } catch {
        newPalName.focus();
      }
    }, 100);
  });
  
  loadPalBtn?.addEventListener('click', async () => {
    logInfo('PROFILE', 'Load Pal button clicked');
    const profileCards = $('#profile-cards');
    if (!profileCards) {
      logError('PROFILE', 'Profile cards container not found');
      return;
    }
    
    if (profileCards.classList.contains('hidden')) {
      logInfo('PROFILE', 'Showing profile cards - loading profiles');
      // Show profile cards - reload to ensure fresh data
      const data = await loadProfilesList();
      logDebug('PROFILE', 'Profiles loaded', { 
        success: !!data,
        profileCount: data?.profiles?.length || 0,
        profiles: data?.profiles
      });
      
      renderProfileCards(data?.profiles || [], { lastUsedId: data?.lastUsedId });
      logInfo('PROFILE', 'Profile cards rendered');
      if (data?.profiles?.length) {
        setTimeout(() => {
          profileCards.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    } else {
      logInfo('PROFILE', 'Hiding profile cards');
      // Hide profile cards
      profileCards.classList.add('hidden');
    }
  });
  
  newPalCancel?.addEventListener('click', () => {
    newPalModal.classList.add('hidden');
  });
  
  newPalForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Re-query to ensure we have the current element
    const newPalName = $('#new-pal-name');
    if (!newPalName) return;
    
    const name = newPalName.value.trim();
    if (!name) {
      newPalError.textContent = 'Please enter a name';
      newPalError.classList.remove('hidden');
      return;
    }
    
    try {
      const profile = await createProfile(name);
      await loadProfile(profile.id);
      newPalModal.classList.add('hidden');
      hideProfileMenu();
      await refreshStats();
    } catch (err) {
      newPalError.textContent = err.message;
      newPalError.classList.remove('hidden');
    }
  });
  
  // Close modal on background click
  newPalModal?.addEventListener('click', (e) => {
    if (e.target === newPalModal) {
      newPalModal.classList.add('hidden');
    }
  });
  
  // Add a fallback click handler on the input itself to ensure it can always receive focus
  const newPalNameInput = $('#new-pal-name');
  newPalNameInput?.addEventListener('click', function() {
    // Remove any attributes that might prevent input
    this.removeAttribute('readonly');
    this.removeAttribute('disabled');
    this.readOnly = false;
    this.disabled = false;
    // Ensure focus
    if (document.activeElement !== this) {
      this.focus();
    }
  });
  
  // Also handle focus events to ensure the input is always editable when focused
  newPalNameInput?.addEventListener('focus', function() {
    this.removeAttribute('readonly');
    this.removeAttribute('disabled');
    this.readOnly = false;
    this.disabled = false;
  });
}

// ==============================================
// EXISTING CODE CONTINUES BELOW
// ==============================================

window.addEventListener('error', (event) => {
  const message = event?.error?.stack || event?.message || 'Unknown error';
  console.error('[GlobalError]', message);
  try {
    fetch(`${API_BASE}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'frontend', type: 'error', message }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
});

window.addEventListener('unhandledrejection', (event) => {
  const message = event?.reason?.stack || event?.reason || 'Unknown rejection';
  console.error('[UnhandledRejection]', message);
  try {
    fetch(`${API_BASE}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'frontend', type: 'unhandledrejection', message }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
});

async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const method = (options.method || 'GET').toUpperCase();
  const url = `${API_BASE}${path}`;
  const start = performance.now();
  const meta = { path, method, hasBody: typeof options.body !== 'undefined' };
  logDebug('API', 'apiFetch start', meta);
  try {
    const res = await fetch(url, { ...options, headers });
    const elapsedMs = Math.round(performance.now() - start);
    logDebug('API', 'apiFetch response', { ...meta, status: res.status, ok: res.ok, elapsedMs });
    return res;
  } catch (err) {
    const elapsedMs = Math.round(performance.now() - start);
    logError('API', 'apiFetch network error', { ...meta, elapsedMs, error: err.message, aborted: options?.signal?.aborted === true });
    throw err;
  }
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function setMultiplierDisplay(value) {
  const label = $('#xp-multiplier-value');
  if (!label) return;
  const numeric = Math.max(1, Math.min(250, Number(value) || 1));
  label.textContent = `${numeric}x`;
}

function updateBrainSummary({ nodeCount = 0, edgeCount = 0, conceptCount = 0, memoriesTotal = latestMemoryTotal } = {}) {
  const summary = $('#brain-summary');
  if (!summary) return;
  const parts = [`Nodes: ${nodeCount}`, `Links: ${edgeCount}`];
  if (conceptCount > 0) parts.push(`Concepts: ${conceptCount}`);
  parts.push(`Memories: ${memoriesTotal}`);
  summary.textContent = parts.join(' | ');
}

function formatTimestamp(ts) {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${day} | ${time}`;
}

function updateEmotionDisplay(emotion) {
  if (!emotion) return;
  
  const icon = $('#emotion-icon');
  const mood = $('#emotion-mood');
  const fill = $('#emotion-fill');
  
  if (!icon || !mood || !fill) return;
  
  // Update icon with animation
  icon.style.animation = 'none';
  setTimeout(() => {
    icon.textContent = emotion.expression || '😊';
    icon.style.animation = 'emotionPulse 2s ease-in-out infinite';
  }, 10);
  
  // Update mood text
  const moodText = `Pal is ${emotion.description || 'calm'}`;
  mood.textContent = moodText;
  
  // Update emotion bar
  const intensity = (emotion.intensity || 0.5) * 100;
  fill.style.width = `${intensity}%`;
  
  // Remove all mood classes
  fill.classList.remove('happy', 'curious', 'caring', 'concerned', 'friendly', 'focused');
  
  // Add current mood class
  if (emotion.mood) {
    fill.classList.add(emotion.mood);
  }

  const summary = $('#emotion-summary');
  if (summary) {
    let intensityValue = typeof emotion.intensity === 'number' ? emotion.intensity : 0.5;
    intensityValue = Math.max(0, Math.min(1, intensityValue));
    const intensityPercent = Math.round(intensityValue * 100);
    const tone = emotion.description || emotion.mood || 'centered';
    let energyText = '';
    if (typeof emotion.energy === 'number') {
      const energyPercent = Math.round(Math.max(0, Math.min(1, emotion.energy)) * 100);
      energyText = ` · Energy ${energyPercent}%`;
    }
    summary.textContent = `Feeling ${tone} at ${intensityPercent}% intensity${energyText}`;
  }
}

function switchTab(name) {
  logInfo('UI', `Switching to tab: ${name}`);
  
  const target = document.getElementById(`tab-${name}`);
  if (!target) {
    logWarn('UI', `Tab "${name}" not found; ignoring switch request`);
    return;
  }

  $$('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab === target);
    tab.setAttribute('aria-hidden', tab !== target ? 'true' : 'false');
  });

  $$('nav button').forEach((btn) => {
    const isActive = btn.dataset.tab === name;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  
  logDebug('UI', `Tab switch completed`, { activeTab: name });
}

async function reinforceClick(btn) {
  btn.disabled = true;
  try {
    await apiFetch(`/reinforce`, { method: 'POST' });
    await refreshStats();
  } catch {}
}

async function feedbackClick(btn, sentiment, text, role) {
  // Visual feedback
  const wasActive = btn.classList.contains('active');
  
  // Remove active state from sibling button
  const sibling = btn.parentElement.querySelector(`.feedback-btn:not(.${btn.classList.contains('thumbs-up') ? 'thumbs-up' : 'thumbs-down'})`);
  if (sibling) sibling.classList.remove('active');
  
  // Toggle this button
  if (wasActive) {
    btn.classList.remove('active');
  } else {
    btn.classList.add('active');
    
    // Send feedback to backend
    try {
      await apiFetch(`/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sentiment, 
          text, 
          role,
          timestamp: Date.now()
        }),
      });
      
      // If positive feedback on Pal's message, give bonus XP
      if (sentiment === 'positive' && role === 'pal') {
        await refreshStats();
      }
    } catch (err) {
      console.error('Feedback error:', err);
    }
  }
}

function addMessage(role, text, metaText) {
  const wrap = document.createElement('div');
  wrap.className = `msg ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text && String(text).trim().length ? text : '?';
  // Timestamp tooltip
  try {
    const ts = new Date();
    bubble.title = ts.toLocaleString();
    wrap.dataset.ts = String(ts.getTime());
  } catch {}
  wrap.appendChild(bubble);
  if (metaText) {
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = metaText;
    wrap.appendChild(meta);
  }
  
  // Add feedback buttons for both user and pal messages
  const feedbackContainer = document.createElement('div');
  feedbackContainer.className = 'feedback-buttons';
  
  const thumbsUp = document.createElement('button');
  thumbsUp.className = 'feedback-btn thumbs-up';
  thumbsUp.title = 'Good response';
  thumbsUp.innerHTML = '👍';
  thumbsUp.addEventListener('click', () => feedbackClick(thumbsUp, 'positive', text, role));
  
  const thumbsDown = document.createElement('button');
  thumbsDown.className = 'feedback-btn thumbs-down';
  thumbsDown.title = 'Needs improvement';
  thumbsDown.innerHTML = '👎';
  thumbsDown.addEventListener('click', () => feedbackClick(thumbsDown, 'negative', text, role));
  
  feedbackContainer.appendChild(thumbsUp);
  feedbackContainer.appendChild(thumbsDown);
  wrap.appendChild(feedbackContainer);

  // Add a 'Try again' option for pal messages
  if (role === 'pal') {
    const tryBtn = document.createElement('button');
    tryBtn.className = 'try-again-btn';
    tryBtn.type = 'button';
    tryBtn.title = 'Regenerate Pal\'s response';
    tryBtn.textContent = 'Try again';
    tryBtn.addEventListener('click', async () => {
      if (!lastUserMessage) return;
      
      // Disable button during regeneration
      tryBtn.disabled = true;
      tryBtn.textContent = 'Generating...';
      
      const indicator = showTyping();
      try {
        const res = await sendChat(lastUserMessage);
        const replyText = typeof res?.reply === 'string' ? res.reply : (res?.output ? String(res.output) : 'Unable to respond right now.');
        const meta = buildPalMeta(res, { prefix: 'Regenerated' });
        addMessage('pal', replyText, meta);
        if (typeof res?.processingTimeMs === 'number') {
          logInfo('PERFORMANCE', 'Regenerated response received', { processingTimeMs: Math.round(res.processingTimeMs) });
        }
        const regenSummary = summarizeNeuralActivations(res?.neuralActivations);
        if (regenSummary) {
          logDebug('NEURAL', 'Neural activation sequence received (regeneration)', { neuralSummary: regenSummary });
        }
        if (res?.emotion) updateEmotionDisplay(res.emotion);
        const wasDirty = multiplierDirty; await refreshStats(); multiplierDirty = wasDirty;
        if (journalLoaded) await loadJournal(true);
      } catch (e) {
        console.error('Regeneration error:', e);
        let errorMsg = 'Sorry, I had trouble responding.';
        
        if (!backendHealthy) {
          errorMsg = 'Server not running. Please start the backend.';
          showStatusModal();
        } else if (e.message?.includes('fetch') || e.message?.includes('network')) {
          errorMsg = 'Network error. Unable to regenerate response.';
        }
        
        addMessage('pal', errorMsg);
      } finally {
        hideTyping(indicator);
        // Additional cleanup to ensure no typing indicators persist
        clearAllTypingIndicators();
        // Re-enable button
        tryBtn.disabled = false;
        tryBtn.textContent = 'Try again';
      }
    });
    wrap.appendChild(tryBtn);
  }
  
  $('#chat-window').appendChild(wrap);
  $('#chat-window').scrollTop = $('#chat-window').scrollHeight;
}

function showTyping() {
  logDebug('TYPING', 'showTyping() called');
  
  // Always clear any existing typing indicators first
  const existingCount = document.querySelectorAll('.msg.pal.typing').length;
  if (existingCount > 0) {
    logWarn('TYPING', `Found ${existingCount} existing typing indicators before cleanup`);
  }
  clearAllTypingIndicators();
  
  const wrap = document.createElement('div');
  wrap.className = 'msg pal typing';
  wrap.setAttribute('data-created', Date.now());
  
  const bubble = document.createElement('div');
  bubble.className = 'bubble typing-bubble';
  bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  wrap.appendChild(bubble);
  
  const win = document.getElementById('chat-window');
  if (win) {
    win.appendChild(wrap);
    win.scrollTop = win.scrollHeight;
    logInfo('TYPING', 'Typing indicator created and added to DOM', { 
      elementId: wrap.getAttribute('data-created'),
      totalTypingElements: win.querySelectorAll('.msg.pal.typing').length
    });
  } else {
    logError('TYPING', 'Chat window not found - typing indicator not added');
  }
  
  typingEl = wrap;
  return wrap;
}

function hideTyping(el = typingEl) {
  const elementId = el ? el.getAttribute('data-created') : 'unknown';
  logDebug('TYPING', `hideTyping() called for element ${elementId}`);
  
  try { 
    if (el && el.parentElement) {
      el.parentElement.removeChild(el);
      logInfo('TYPING', `Typing indicator removed from DOM`, { elementId });
    } else {
      logWarn('TYPING', `Cannot remove typing indicator - element or parent missing`, { 
        hasElement: !!el,
        hasParent: el ? !!el.parentElement : false,
        elementId
      });
    }
  } catch (err) {
    logError('TYPING', 'Error removing typing indicator', { error: err.message, elementId });
  }
  
  // Clear global reference if this was the current typing element
  if (el === typingEl) {
    typingEl = null;
    logDebug('TYPING', 'Global typingEl reference cleared');
  }
  
  // Additional cleanup: remove any lingering typing indicators
  clearAllTypingIndicators();
}

function clearAllTypingIndicators() {
  logDebug('TYPING', 'clearAllTypingIndicators() called');
  
  const win = document.getElementById('chat-window');
  if (!win) {
    logWarn('TYPING', 'Chat window not found during typing indicator cleanup');
    return;
  }
  
  const existingTyping = win.querySelectorAll('.msg.pal.typing');
  if (existingTyping.length === 0) {
    logDebug('TYPING', 'No typing indicators found to clear');
    return;
  }
  
  logInfo('TYPING', `Clearing ${existingTyping.length} typing indicators`);
  
  existingTyping.forEach((el, index) => {
    try {
      const elementId = el.getAttribute('data-created') || `index-${index}`;
      if (el && el.parentElement) {
        el.parentElement.removeChild(el);
        logDebug('TYPING', `Removed typing indicator ${elementId}`);
      }
    } catch (err) {
      logError('TYPING', `Error clearing typing indicator ${index}`, { error: err.message });
    }
  });
  
  // Reset global state
  if (typingEl) {
    logDebug('TYPING', 'Resetting global typingEl reference');
    typingEl = null;
  }
  
  // Verify cleanup
  const remainingTyping = win.querySelectorAll('.msg.pal.typing');
  if (remainingTyping.length > 0) {
    logWarn('TYPING', `${remainingTyping.length} typing indicators still remain after cleanup`);
  } else {
    logInfo('TYPING', 'All typing indicators successfully cleared');
  }
}

function clearFloatingTypingIndicators() {
  // Clear floating chat typing indicators if they exist
  const floatingWin = document.getElementById('floating-chat-window');
  if (!floatingWin) return;
  
  const existingTyping = floatingWin.querySelectorAll('.msg.pal.typing');
  existingTyping.forEach(el => {
    try {
      if (el && el.parentElement) {
        el.parentElement.removeChild(el);
      }
    } catch (err) {
      console.warn('Error clearing floating typing indicator:', err);
    }
  });
}

function forceEnableAllInputs() {
  logWarn('UI', 'Emergency function called: forceEnableAllInputs');
  
  // Emergency function to force re-enable all chat inputs
  const inputs = ['#chat-input', '#floating-chat-input'];
  let enabledCount = 0;
  
  inputs.forEach(selector => {
    const input = document.querySelector(selector);
    if (input) {
      const wasDisabled = input.disabled;
      input.disabled = false;
      input.value = ''; // Clear any residual value
      input.placeholder = 'Type a message...';
      if (wasDisabled) {
        enabledCount++;
        logInfo('UI', `Force enabled and cleared input: ${selector}`);
      }
    } else {
      logWarn('UI', `Input not found: ${selector}`);
    }
  });
  
  logInfo('UI', `Emergency enable completed - ${enabledCount} inputs were re-enabled`);
}

async function sendChat(message, { attempt = 1, originalRequestId = null } = {}) {
  const requestId = Date.now();
  const parentRequestId = originalRequestId || requestId;
  const timeoutMs = attempt === 1 ? CHAT_TIMEOUT_MS : Math.max(CHAT_TIMEOUT_MS + 5000, Math.round(CHAT_TIMEOUT_MS * 1.5));
  logDebug('API', 'sendChat() called', { requestId, parentRequestId, attempt, messageLength: message.length, timeoutMs });

  const controller = new AbortController();
  const startedAt = performance.now();
  const timeout = setTimeout(() => {
    const elapsedMs = Math.round(performance.now() - startedAt);
    logWarn('API', 'Chat request timeout triggered', { requestId, parentRequestId, attempt, timeoutMs, elapsedMs, backendHealthy });
    controller.abort();
  }, timeoutMs);
  
  try {
    logDebug('API', 'Making chat API request', { requestId, parentRequestId, attempt, endpoint: '/chat' });
    const res = await apiFetch(`/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    const elapsedMs = Math.round(performance.now() - startedAt);
    
    logDebug('API', 'Chat API response received', { 
      requestId,
      parentRequestId,
      attempt,
      status: res.status,
      ok: res.ok,
      statusText: res.statusText,
      elapsedMs
    });
    
    if (!res.ok) {
      logError('API', 'Chat API returned error status', { 
        requestId,
        parentRequestId,
        attempt,
        status: res.status,
        statusText: res.statusText
      });
      throw new Error('Chat failed');
    }
    
  const contentLengthHeader = typeof res.headers?.get === 'function' ? res.headers.get('content-length') : null;
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;
    const data = await res.json();
    const activationCount = Array.isArray(data?.neuralActivations) ? data.neuralActivations.length : 0;
    logInfo('API', 'Chat response parsed successfully', { 
      requestId,
      parentRequestId,
      attempt,
      hasReply: !!data.reply,
      hasOutput: !!data.output,
      hasEmotion: !!data.emotion,
      processingTimeMs: typeof data?.processingTimeMs === 'number' ? data.processingTimeMs : null,
      activationCount,
      elapsedMs,
      contentLength
    });

    if (typeof data?.processingTimeMs === 'number') {
      logInfo('PERFORMANCE', 'Backend processed chat request', { 
        requestId,
        parentRequestId,
        processingTimeMs: Math.round(data.processingTimeMs)
      });
    }

    const neuralSummary = summarizeNeuralActivations(data?.neuralActivations);
    if (neuralSummary) {
      logDebug('NEURAL', 'Neural activation sequence received', { 
        requestId,
        parentRequestId,
        neuralSummary
      });
    }

    return data;
  } catch (err) {
    clearTimeout(timeout);
    const elapsedMs = Math.round(performance.now() - startedAt);
    
    if (err.name === 'AbortError') {
      logError('API', 'Chat request aborted (timeout)', { requestId, parentRequestId, attempt, timeoutMs, elapsedMs, backendHealthy });
      const healthAfterTimeout = await checkHealth();
      logInfo('API', 'Backend health check after timeout', { requestId, parentRequestId, attempt, healthAfterTimeout });
      if (attempt <= CHAT_MAX_RETRIES) {
        logWarn('API', 'Retrying chat request after timeout', { requestId, parentRequestId, attempt, nextAttempt: attempt + 1, retryDelayMs: CHAT_RETRY_DELAY_MS * attempt });
        await wait(CHAT_RETRY_DELAY_MS * attempt);
        return sendChat(message, { attempt: attempt + 1, originalRequestId: parentRequestId });
      }
      const seconds = Math.round(timeoutMs / 1000);
      throw new Error(`Request timed out after ${seconds} seconds`);
    }
    
    logError('API', 'Chat request failed', { 
      requestId,
      parentRequestId,
      attempt,
      elapsedMs,
      error: err.message,
      name: err.name
    });
    throw err;
  }
}

async function getStats() {
  const res = await apiFetch(`/stats`);
  return res.json();
}

// --- Neural Visualization Frontend ---
let neuralSocket = null;
let neuralState = null;
let neuralConnected = false;
const neuralReadyWaiters = new Set();

async function fetchNeuralSnapshot() {
  try {
    const res = await apiFetch('/neural');
    if (!res.ok) return null;
    const data = await res.json();
    return data.neural || null;
  } catch (e) { return null; }
}

function onNeuronClickFront(neuronId) {
  // Simple request to backend snapshot to find neuron info
  if (!neuralState) return;
  for (const region of neuralState.regions) {
    const found = region.neurons.find(n => n.id === neuronId);
    if (found) {
      alert(`Neuron ${neuronId}\nRegion: ${region.regionName}\nFires: ${found.firingHistory?.length || 0}`);
      return;
    }
  }
}

// Batch neural events for performance
let neuralEventBatch = [];
let neuralEventRafId = null;

function resolveNeuralWaiters() {
  neuralReadyWaiters.forEach((entry) => {
    if (entry.timer) clearTimeout(entry.timer);
    entry.resolve(true);
  });
  neuralReadyWaiters.clear();
}

function rejectNeuralWaiters(error) {
  const reason = error instanceof Error ? error : new Error(String(error || 'Neural connection unavailable'));
  neuralReadyWaiters.forEach((entry) => {
    if (entry.timer) clearTimeout(entry.timer);
    entry.reject(reason);
  });
  neuralReadyWaiters.clear();
}

function waitForNeuralReady({ timeoutMs = 5000 } = {}) {
  if (neuralConnected && neuralSocket && neuralSocket.readyState === WebSocket.OPEN) {
    return Promise.resolve(true);
  }
  return new Promise((resolve, reject) => {
    const entry = { resolve, reject };
    if (timeoutMs > 0) {
      entry.timer = setTimeout(() => {
        neuralReadyWaiters.delete(entry);
        reject(new Error('timeout'));
      }, timeoutMs);
    }
    neuralReadyWaiters.add(entry);
  });
}

function connectNeuralSocket(options = {}) {
  const { skipIfOpen = true } = options;
  if (neuralSocket && neuralSocket.readyState === WebSocket.OPEN) {
    if (skipIfOpen) {
      logDebug('WEBSOCKET', 'Neural socket already connected');
      neuralConnected = true;
      resolveNeuralWaiters();
      return neuralSocket;
    }
    try {
      neuralSocket.close(1000, 'Reinitializing neural stream');
    } catch {}
  } else if (neuralSocket && neuralSocket.readyState === WebSocket.CONNECTING && skipIfOpen) {
    logDebug('WEBSOCKET', 'Neural socket connection in progress');
    return neuralSocket;
  }

  if (neuralSocket && neuralSocket.readyState !== WebSocket.CLOSED) {
    try {
      neuralSocket.close(1000, 'Restarting neural stream');
    } catch {}
  }
  neuralSocket = null;
  neuralConnected = false;

  let wsUrl;
  try {
    wsUrl = window.location.protocol === 'file:' 
      ? 'ws://localhost:3001/neural-stream'
      : (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host.replace(/:\d+$/, ':3001') + '/neural-stream';
  } catch (e) {
    logError('WEBSOCKET', 'Failed to construct neural stream URL', { error: e.message });
    rejectNeuralWaiters(e);
    return null;
  }

  try {
    logInfo('WEBSOCKET', 'Connecting to neural stream', { url: wsUrl });
    neuralSocket = new WebSocket(wsUrl);
  } catch (e) {
    logError('WEBSOCKET', 'WebSocket connect error', { error: e.message });
    rejectNeuralWaiters(e);
    return null;
  }

  neuralSocket.addEventListener('open', () => {
    neuralConnected = true;
    logInfo('WEBSOCKET', 'Neural socket connected successfully');
    resolveNeuralWaiters();
  });

  neuralSocket.addEventListener('message', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (!data) return;
      
      if (data.type === 'neural-snapshot') {
        logDebug('NEURAL', 'Neural snapshot received', { 
          totalNeurons: data.payload?.metrics?.totalNeurons,
          regions: data.payload?.regions?.length
        });
        renderNeuralNetwork(data.payload);
        const summary = document.getElementById('neural-summary');
        if (summary) summary.textContent = `Neurons: ${data.payload.metrics.totalNeurons} · Regions: ${data.payload.regions.length} · Firings: ${data.payload.metrics.totalFirings}`;
      } else if (data.type === 'neural-event') {
        logDebug('NEURAL', 'Neural event received', { eventType: data.payload?.type });
        // Batch neural events using requestAnimationFrame
        neuralEventBatch.push(data.payload);
        if (!neuralEventRafId) {
          neuralEventRafId = requestAnimationFrame(() => {
            const events = neuralEventBatch.splice(0);
            neuralEventRafId = null;
            events.forEach(handleNeuralEvent);
          });
        }
      } else {
        logDebug('WEBSOCKET', 'Unknown neural message type', { type: data.type });
      }
    } catch (e) { 
      logError('WEBSOCKET', 'Neural message parsing error', { error: e.message });
    }
  });

  neuralSocket.addEventListener('close', (event) => {
    const wasConnected = neuralConnected;
    neuralConnected = false;
    if (!wasConnected) {
      rejectNeuralWaiters(new Error('Neural socket closed before ready'));
    }
    logWarn('WEBSOCKET', 'Neural socket closed', { code: event?.code, reason: event?.reason || 'no reason provided' });
    neuralSocket = null;
  });

  neuralSocket.addEventListener('error', (e) => {
    logError('WEBSOCKET', 'Neural socket error', { error: e.message || 'Unknown error' });
    if (!neuralConnected) {
      rejectNeuralWaiters(new Error(e.message || 'Neural socket error'));
    }
  });

  return neuralSocket;
}

async function waitForBackendReady() {
  let attempt = 0;
  while (true) {
    attempt += 1;
    setBootLoaderStage('Connecting to backend...');
    setBootLoaderDetail(`Checking health (attempt ${attempt})...`);
    const healthy = await checkHealth();
    if (healthy) {
      backendHealthy = true;
      logInfo('STARTUP', 'Backend health confirmed', { attempt });
      setBootLoaderError('');
      if (bootLoaderHelpShown) {
        toggleBootLoaderHelp(false);
      }
      return true;
    }

    logWarn('STARTUP', 'Backend health check failed', { attempt });
    setBootLoaderError('Waiting for backend at http://localhost:3001. Start it with `npm run dev` inside app/backend or run AUTORUN.ps1.');
    if (!bootLoaderHelpShown && attempt >= 3) {
      toggleBootLoaderHelp(true);
    }
    await wait(Math.min(1500 + attempt * 500, 4000));
  }
}

async function waitForNeuralConnection() {
  let attempt = 0;
  setBootLoaderError('');
  while (true) {
    attempt += 1;
    setBootLoaderStage('Connecting to neural stream...');
    setBootLoaderDetail(`Establishing WebSocket (attempt ${attempt})...`);
    connectNeuralSocket({ skipIfOpen: attempt === 1 });

    try {
      await waitForNeuralReady({ timeoutMs: 4000 });
      logInfo('STARTUP', 'Neural stream connected', { attempt });
      setBootLoaderError('');
      return true;
    } catch (err) {
      logWarn('STARTUP', 'Neural stream connection attempt failed', { attempt, error: err.message });
      setBootLoaderError('Waiting for neural telemetry. Ensure the backend stays running.');
      if (!bootLoaderHelpShown) {
        toggleBootLoaderHelp(true);
      }
    }

    await wait(Math.min(1500 + attempt * 500, 5000));
  }
}

async function runStartupSequence() {
  showBootLoader('Starting MyPal...', 'Preparing local systems...');
  await waitForBackendReady();
  setBootLoaderStage('Backend online');
  setBootLoaderDetail('Preparing neural telemetry...');
  setBootLoaderError('');
  await wait(300);
  await waitForNeuralConnection();
  setBootLoaderStage('All systems ready');
  setBootLoaderDetail('Loading profile menu...');
  setBootLoaderError('');
  await wait(350);
  hideBootLoader();
  hideStatusModal();
  logInfo('STARTUP', 'Startup sequence completed');
}

function describeIntensityLevel(value = 0) {
  const intensity = Math.abs(Number(value) || 0);
  if (intensity >= 1.4) return { label: 'surging', icon: '⚡' };
  if (intensity >= 0.9) return { label: 'strong', icon: '🔥' };
  if (intensity >= 0.5) return { label: 'steady', icon: '✨' };
  if (intensity > 0.15) return { label: 'gentle', icon: '🌟' };
  return { label: 'baseline', icon: '•' };
}

function formatTimeAgo(timestamp) {
  const ts = Number(timestamp) || Date.now();
  const diff = Date.now() - ts;
  if (diff < 1500) return 'just now';
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  const date = new Date(ts);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getNeuronInfo(neuronId) {
  if (!neuronId) return null;
  const node = neuralNodeIndex.get(neuronId);
  if (node) {
    return {
      neuronId,
      regionId: node.regionId,
      regionName: node.regionName || formatRegionName(node.regionId),
      label: node.label || neuronId,
    };
  }
  return null;
}

function getNeuronLabel(neuronId) {
  if (!neuronId) return 'Unknown neuron';
  return neuronId.length > 8 ? `…${neuronId.slice(-6)}` : neuronId;
}

function ensureActivityCapacity() {
  if (neuralActivityFeed.length <= MAX_ACTIVITY_ENTRIES) return;
  const excess = neuralActivityFeed.length - MAX_ACTIVITY_ENTRIES;
  const removed = neuralActivityFeed.splice(0, excess);
  removed.forEach((entry) => {
    neuralActivityMap.delete(entry.id);
    neuralActivityIdSet.delete(entry.id);
  });
  // Prune neuron map to remove stale references
  neuralActivityByNeuron.forEach((list, neuronId) => {
    const filtered = list.filter((activity) => neuralActivityMap.has(activity.id));
    if (filtered.length) {
      neuralActivityByNeuron.set(neuronId, filtered);
    } else {
      neuralActivityByNeuron.delete(neuronId);
    }
  });
}

function buildActivitySummary(entry) {
  if (!entry) return '';
  if (entry.type === 'neuron-fire') {
    const intensity = describeIntensityLevel(entry.intensity);
    const neuronLabel = getNeuronLabel(entry.neuronId);
    const regionName = entry.regionName || formatRegionName(entry.regionId);
    let summary = `${regionName} neuron ${neuronLabel} fired with ${intensity.label} energy`;
    if (entry.connections?.length) {
      const first = entry.connections[0];
      const count = entry.connections.length;
      const targetRegion = first.toRegionName || formatRegionName(first.toRegionId);
      if (count === 1) {
        summary += `, signaling ${targetRegion} (${getNeuronLabel(first.toNeuronId)})`;
      } else {
        summary += `, cascading to ${count} downstream neurons`;
      }
    }
    return `${summary}.`;
  }
  if (entry.type === 'connection-signal') {
    const fromRegion = entry.fromRegionName || 'Source neuron';
    const toRegion = entry.toRegionName || 'target neuron';
    const strength = describeIntensityLevel(entry.signal);
    return `${fromRegion} signaled ${toRegion} with ${strength.label} strength.`;
  }
  if (entry.type === 'neural-growth') {
    const region = entry.regionName || formatRegionName(entry.regionId);
    return `${region} grew ${entry.newNeurons} new neurons after reaching level ${entry.level}.`;
  }
  return '';
}

function addNeuralActivityEntry(event, options = {}) {
  if (!event || !event.type) return null;
  const timestamp = event.timestamp || Date.now();

  if (event.type === 'neuron-fire') {
    const activityId = `fire-${event.neuronId}-${timestamp}`;
    if (neuralActivityIdSet.has(activityId)) {
      return neuralActivityMap.get(activityId) || null;
    }

    const nodeInfo = getNeuronInfo(event.neuronId);
    const regionName = event.regionName || nodeInfo?.regionName || formatRegionName(event.regionId);
    const entry = {
      id: activityId,
      type: 'neuron-fire',
      neuronId: event.neuronId,
      regionId: event.regionId,
      regionName,
      intensity: event.intensity ?? 0,
      timestamp,
      connections: [],
      timeline: [{
        type: 'neuron-fire',
        neuronId: event.neuronId,
        intensity: event.intensity ?? 0,
        timestamp,
      }],
    };

    const intensityMeta = describeIntensityLevel(entry.intensity);
    entry.intensityLabel = intensityMeta.label;
    entry.intensityIcon = intensityMeta.icon;
    entry.summary = buildActivitySummary(entry);
    entry.timeLabel = formatTimeAgo(timestamp);

    neuralActivityFeed.push(entry);
    neuralActivityMap.set(entry.id, entry);
    neuralActivityIdSet.add(entry.id);

    if (entry.neuronId) {
      const list = neuralActivityByNeuron.get(entry.neuronId) || [];
      list.push(entry);
      while (list.length && (timestamp - list[0].timestamp) > 6000) {
        list.shift();
      }
      // Keep only recent entries per neuron (last 5)
      while (list.length > 5) list.shift();
      neuralActivityByNeuron.set(entry.neuronId, list);
    }

    ensureActivityCapacity();
    return entry;
  }

  if (event.type === 'connection-signal') {
    const sourceList = neuralActivityByNeuron.get(event.fromNeuronId);
    let parentEntry = null;
    if (sourceList && sourceList.length) {
      parentEntry = [...sourceList].reverse().find((item) => (timestamp - item.timestamp) <= 4000);
    }

    const targetInfo = getNeuronInfo(event.toNeuronId);
    const connectionDetails = {
      type: 'connection',
      fromNeuronId: event.fromNeuronId,
      toNeuronId: event.toNeuronId,
      toRegionId: targetInfo?.regionId,
      toRegionName: targetInfo?.regionName || formatRegionName(targetInfo?.regionId),
      signal: event.signal ?? 0,
      latency: event.latency || 180,
      timestamp,
    };

    if (parentEntry) {
      parentEntry.connections.push(connectionDetails);
      parentEntry.timeline.push(connectionDetails);
      parentEntry.summary = buildActivitySummary(parentEntry);
      parentEntry.lastUpdated = timestamp;
      return parentEntry;
    }

    // Standalone connection entry if no parent neuron fire found
    const fromInfo = getNeuronInfo(event.fromNeuronId);
    const activityId = `signal-${event.fromNeuronId}-${event.toNeuronId}-${timestamp}`;
    if (neuralActivityIdSet.has(activityId)) {
      return neuralActivityMap.get(activityId) || null;
    }

    const entry = {
      id: activityId,
      type: 'connection-signal',
      timestamp,
      fromNeuronId: event.fromNeuronId,
      toNeuronId: event.toNeuronId,
      fromRegionName: fromInfo?.regionName || formatRegionName(fromInfo?.regionId),
      toRegionName: targetInfo?.regionName || formatRegionName(targetInfo?.regionId),
      signal: event.signal ?? 0,
      connections: [connectionDetails],
      timeline: [connectionDetails],
    };
    entry.summary = buildActivitySummary(entry);
    entry.timeLabel = formatTimeAgo(timestamp);

    neuralActivityFeed.push(entry);
    neuralActivityMap.set(entry.id, entry);
    neuralActivityIdSet.add(entry.id);
    ensureActivityCapacity();
    return entry;
  }

  if (event.type === 'neural-growth') {
    const activityId = `growth-${event.regionId}-${timestamp}`;
    if (neuralActivityIdSet.has(activityId)) return neuralActivityMap.get(activityId) || null;

    const regionName = formatRegionName(event.regionId);
    const entry = {
      id: activityId,
      type: 'neural-growth',
      regionId: event.regionId,
      regionName,
      newNeurons: event.newNeurons || 0,
      level: event.level || 0,
      timestamp,
      timeline: [{ ...event, type: 'neural-growth', timestamp }],
    };
    entry.summary = buildActivitySummary(entry);
    entry.timeLabel = formatTimeAgo(timestamp);

    neuralActivityFeed.push(entry);
    neuralActivityMap.set(entry.id, entry);
    neuralActivityIdSet.add(entry.id);
    ensureActivityCapacity();
    return entry;
  }

  return null;
}

function replayNeuralActivity(activityId) {
  const entry = neuralActivityMap.get(activityId);
  if (!entry) return;
  if (!neuralGraph3D) {
    logWarn('NEURAL', 'Replay requested but neural graph not ready');
    return;
  }
  neuralReplayQueue.push(entry);
  if (!neuralReplayActive) {
    processNeuralReplayQueue();
  }
}

function processNeuralReplayQueue() {
  if (neuralReplayActive) return;
  if (neuralPlaybackState.stopRequested) {
    neuralReplayQueue.length = 0;
    neuralPlaybackState.timelinePlaying = false;
    neuralPlaybackState.stopRequested = false;
    return;
  }
  const next = neuralReplayQueue.shift();
  if (!next) return;
  neuralReplayActive = true;

  const autoZoom = Object.prototype.hasOwnProperty.call(next, 'autoZoom')
    ? !!next.autoZoom
    : neuralPlaybackState.autoZoom;

  runNeuronReplay(next, { autoZoom })
    .catch((err) => logError('NEURAL', 'Replay error', { error: err.message }))
    .finally(() => {
      neuralReplayActive = false;
      if (neuralPlaybackState.stopRequested) {
        neuralReplayQueue.length = 0;
        neuralPlaybackState.timelinePlaying = false;
        neuralPlaybackState.stopRequested = false;
        return;
      }
      if (neuralReplayQueue.length) {
        processNeuralReplayQueue();
      } else if (neuralPlaybackState.timelinePlaying) {
        neuralPlaybackState.timelinePlaying = false;
        if (neuralPlaybackState.playbackButton) {
          neuralPlaybackState.playbackButton.classList.remove('playing');
          neuralPlaybackState.playbackButton.classList.remove('active');
        }
        logInfo('NEURAL', 'Timeline playback completed');
      }
    });
}

function runNeuronReplay(entry, options = {}) {
  return new Promise((resolve) => {
    const baseDuration = 520;
    const intensity = entry.intensity ?? 0.8;
    if (options.autoZoom) autoFocusNeuron(entry.neuronId);
    simulateNeuronPulse(entry.neuronId, intensity, baseDuration);

    let delay = Math.max(220, baseDuration * 0.6);
    if (Array.isArray(entry.connections) && entry.connections.length) {
      entry.connections.forEach((connection, index) => {
        const stepDelay = delay + (index * (connection.latency || 160));
        setTimeout(() => {
          if (options.autoZoom && connection.toNeuronId) {
            autoFocusNeuron(connection.toNeuronId, { distance: 240, duration: 800 });
          }
          simulateConnectionPulse(connection.fromNeuronId || entry.neuronId, connection.toNeuronId, connection.signal, (connection.latency || 180) + 220);
          simulateNeuronPulse(connection.toNeuronId, Math.abs(connection.signal || 0.6), 420);
        }, stepDelay);
      });
      delay += entry.connections.reduce((acc, conn) => acc + (conn.latency || 160), 0);
    }

    setTimeout(resolve, delay + 560);
  });
}

function collectTimelineEntries(mode = 'latest') {
  if (!neuralActivityFeed.length) return [];
  const firings = neuralActivityFeed
    .filter((entry) => entry.type === 'neuron-fire')
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  if (!firings.length) return [];
  switch (mode) {
    case 'latest':
      return [firings[firings.length - 1]];
    case 'last5':
      return firings.slice(-5);
    case 'last10':
      return firings.slice(-10);
    case 'all':
    default:
      return firings;
  }
}

function playNeuralTimeline(mode = 'latest') {
  const entries = collectTimelineEntries(mode);
  if (!entries.length) {
    logWarn('NEURAL', 'No neural firings available for playback', { mode });
    return;
  }
  stopNeuralTimeline({ keepCamera: true });
  const clones = entries.map((entry) => ({
    ...entry,
    autoZoom: neuralPlaybackState.autoZoom,
    timeline: true,
  }));

  const beginPlayback = () => {
    neuralPlaybackState.stopRequested = false;
    neuralPlaybackState.timelinePlaying = true;
    if (neuralPlaybackState.playbackButton) {
      neuralPlaybackState.playbackButton.classList.add('playing');
    }
    neuralReplayQueue.push(...clones);
    if (!neuralReplayActive) {
      processNeuralReplayQueue();
    }
    logInfo('NEURAL', 'Timeline playback started', { mode, count: clones.length });
  };

  if (neuralReplayActive && neuralPlaybackState.stopRequested) {
    const waitForStop = () => {
      if (!neuralReplayActive && !neuralPlaybackState.stopRequested) {
        beginPlayback();
      } else {
        setTimeout(waitForStop, 120);
      }
    };
    waitForStop();
  } else {
    beginPlayback();
  }
}

function stopNeuralTimeline({ keepCamera = false } = {}) {
  if (!neuralPlaybackState.timelinePlaying && !neuralReplayQueue.length && !neuralReplayActive) return;
  neuralReplayQueue.length = 0;
  neuralPlaybackState.stopRequested = neuralReplayActive;
  neuralPlaybackState.timelinePlaying = false;
  const dropdown = $('#neural-playback-dropdown');
  if (dropdown) dropdown.classList.add('hidden');
  if (neuralPlaybackState.playbackButton) {
    neuralPlaybackState.playbackButton.classList.remove('playing');
    neuralPlaybackState.playbackButton.classList.remove('active');
  }
  if (!keepCamera) {
    logInfo('NEURAL', 'Timeline playback stopped');
  }
}

function simulateNeuronPulse(neuronId, intensity = 1, duration = 420) {
  const node = neuralNodeIndex.get(neuronId);
  if (!node) return;

  const boost = 1 + Math.min(Math.abs(intensity || 1), 2.6) * 0.35;
  node.firePulse = true;
  node.displaySize = node.baseSize * boost;
  scheduleNeuralGraphRefresh();

  setTimeout(() => {
    node.firePulse = false;
    node.displaySize = node.baseSize;
    scheduleNeuralGraphRefresh();
  }, duration);
}

function simulateConnectionPulse(fromNeuronId, toNeuronId, signal = 0.8, decayDelay = 280) {
  if (!fromNeuronId || !toNeuronId) return;
  const key = `${fromNeuronId}|${toNeuronId}`;
  const link = neuralLinkIndex.get(key);
  if (!link) return;

  const strength = Math.abs(signal || 0.8);
  link.highlight = true;
  link.width = Math.max(link.width, 1.1 + strength * 0.6);
  link.particleCount = Math.max(1, Math.ceil(strength * 4));
  link.particleSpeed = Math.max(0.004, Math.min(0.02, 0.006 + strength * 0.01));
  scheduleNeuralGraphRefresh();

  setTimeout(() => {
    link.particleCount = 0;
    link.particleSpeed = 0.008;
    link.highlight = false;
    link.width = Math.max(0.35, link.weight * 0.9);
    scheduleNeuralGraphRefresh();
  }, decayDelay);
}

function handleNeuralEvent(event) {
  if (!event || !event.type) return;

  if (neuralState) {
    if (!Array.isArray(neuralState.events)) {
      neuralState.events = [];
    }
    neuralState.events.push(event);
    if (neuralState.events.length > 200) {
      neuralState.events = neuralState.events.slice(-200);
    }
  }

  addNeuralActivityEntry(event);

  if (event.type === 'neuron-fire') {
    const neuronId = event.neuronId;
    const node = neuralNodeIndex.get(neuronId);
    if (!node) return;

    node.firePulse = true;
    node.displaySize = node.baseSize * 1.35;
    if (node.sourceNeuron) {
      node.sourceNeuron.currentActivation = event.intensity ?? node.sourceNeuron.currentActivation;
    }
    scheduleNeuralGraphRefresh();

    if (neuralState?.metrics) {
      neuralState.metrics.totalFirings = (neuralState.metrics.totalFirings || 0) + 1;
      neuralState.metrics.mostRecentFiring = {
        neuronId,
        intensity: event.intensity || 0,
        timestamp: event.timestamp || Date.now()
      };
    }

    if (Array.isArray(node.sourceNeuron?.connections)) {
      node.sourceNeuron.connections.forEach((connection) => {
        const key = `${node.id}|${connection.targetNeuronId}`;
        const link = neuralLinkIndex.get(key);
        if (!link) return;
        link.highlight = true;
        link.width = Math.max(link.width, 1.4);
        link.particleCount = Math.max(2, Math.ceil((event.intensity || 1) * 3));
        link.particleSpeed = 0.012;
        scheduleNeuralGraphRefresh();

        setTimeout(() => {
          link.highlight = false;
          link.width = Math.max(0.35, link.weight * 0.9);
          link.particleCount = 0;
          link.particleSpeed = 0.008;
          scheduleNeuralGraphRefresh();
        }, connection.latency ? connection.latency * 1.5 : 240);
      });
    }

    setTimeout(() => {
      node.firePulse = false;
      node.displaySize = node.baseSize;
      scheduleNeuralGraphRefresh();
    }, 420);
  } else if (event.type === 'connection-signal') {
    const key = `${event.fromNeuronId}|${event.toNeuronId}`;
    const link = neuralLinkIndex.get(key);
    if (!link) return;

    const strength = Math.abs(event.signal || 0.75);
    link.particleCount = Math.max(1, Math.ceil(strength * 4));
    link.particleSpeed = Math.max(0.004, Math.min(0.02, 0.006 + strength * 0.01));
    link.highlight = true;
    link.width = Math.max(link.width, 1.2);
    scheduleNeuralGraphRefresh();

    const decayDelay = (event.latency || 120) * 1.6;
    setTimeout(() => {
      link.particleCount = 0;
      link.particleSpeed = 0.008;
      link.highlight = false;
      link.width = Math.max(0.35, link.weight * 0.9);
      scheduleNeuralGraphRefresh();
    }, decayDelay);
  } else if (event.type === 'neural-growth') {
    showNeuralGrowthAnimation(event);
  }

  updateNeuralEvents();
  updateNeuralStats();
}

// Show neural growth animation when leveling up
function showNeuralGrowthAnimation(growthEvent) {
  const { regionId, newNeurons, level } = growthEvent;

  const celebration = document.createElement('div');
  celebration.className = 'neural-growth-celebration';
  celebration.innerHTML = `
    <div class="growth-icon">🧠✨</div>
    <div class="growth-text">
      <div class="growth-title">Neural Growth!</div>
      <div class="growth-details">Level ${level} • +${newNeurons} neurons in ${formatRegionName(regionId)}</div>
    </div>
  `;
  celebration.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #5b6fd8 0%, #66bb6a 100%);
    color: white;
    padding: 20px 30px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 1002;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    animation: growthCelebration 4s ease-out forwards;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  document.body.appendChild(celebration);

  const regionNodes = (neuralGraphData?.nodes || []).filter((node) => node.regionId === regionId);
  regionNodes.forEach((node, index) => {
    const delay = 400 + index * 80;
    setTimeout(() => {
      node.firePulse = true;
      node.displaySize = node.baseSize * 1.25;
      scheduleNeuralGraphRefresh();

      setTimeout(() => {
        node.firePulse = false;
        node.displaySize = node.baseSize;
        scheduleNeuralGraphRefresh();
      }, 600);
    }, delay);
  });

  setTimeout(() => {
    if (celebration.parentNode) {
      celebration.parentNode.removeChild(celebration);
    }
  }, 4000);

  setTimeout(() => {
    fetchNeuralSnapshot().then((snapshot) => {
      if (snapshot) renderNeuralNetwork(snapshot);
    });
  }, 2000);
}

// Wire up Neural tab button to initialize
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-brain-tab]');
  if (!btn) return;
  const tab = btn.dataset.brainTab;
  if (tab === 'neural') {
    // Fetch snapshot and connect websocket
    fetchNeuralSnapshot().then((snapshot) => {
      if (snapshot) renderNeuralNetwork(snapshot);
      connectNeuralSocket();
    });
  }
});

async function saveSettings(xpMultiplier, apiProvider, apiKey, telemetry, authRequired) {
  const res = await apiFetch(`/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xpMultiplier, apiProvider, apiKey, telemetry, authRequired })
  });
  return res.json();
}

async function doReset() {
  const res = await apiFetch(`/reset`, { method: 'POST' });
  return res.json();
}

async function doExport() {
  const res = await apiFetch(`/export`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pal_memory.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

let radarChart;
function renderStats(s) {
  $('#stat-level').textContent = s.level;
  $('#stat-xp').textContent = s.xp;
  $('#stat-cp').textContent = s.cp;
  $('#stat-vocab').textContent = s.vocabSize;
  const multiplier = s.settings?.xpMultiplier ?? 1;
  const multiplierInput = $('#xp-multiplier');
  if (!multiplierDirty && multiplierInput) {
    multiplierInput.value = multiplier;
  }
  if (!multiplierDirty) {
    setMultiplierDisplay(multiplier);
  }
  if (typeof s.memoryCount === 'number') {
    latestMemoryTotal = s.memoryCount;
    updateBrainSummary({ memoriesTotal: latestMemoryTotal });
  }
  if (document.getElementById('api-provider')) {
    $('#api-provider').value = s.settings?.apiProvider || 'local';
  }
  if (document.getElementById('telemetry')) {
    $('#telemetry').checked = !!s.settings?.telemetry;
  }
  if (document.getElementById('auth-required')) {
    $('#auth-required').checked = !!s.settings?.authRequired;
  }
  
  // Update emotion display in stats tab
  if (s.currentEmotion) {
    const statIcon = $('#stat-emotion-icon');
    const statMood = $('#stat-emotion-mood');
    const statFill = $('#stat-emotion-fill');
    
    if (statIcon) statIcon.textContent = s.currentEmotion.expression || '😊';
    if (statMood) statMood.textContent = s.currentEmotion.description || 'Calm';
    if (statFill) {
      const intensity = (s.currentEmotion.intensity || 0.5) * 100;
      statFill.style.width = `${intensity}%`;
      statFill.classList.remove('happy', 'curious', 'caring', 'concerned', 'friendly', 'focused');
      if (s.currentEmotion.mood) {
        statFill.classList.add(s.currentEmotion.mood);
      }
    }
  }

  // Update advancement display
  if (s.advancement) {
    const advLevel = $('#advancement-level');
    const advXp = $('#advancement-xp');
    const advRemaining = $('#advancement-remaining');
    const advProgressBar = $('#advancement-progress-bar');
    const advProgressText = $('#advancement-progress-text');
    
    if (advLevel) advLevel.textContent = s.advancement.currentLevel;
    if (advXp) advXp.textContent = `${s.advancement.currentXp} / ${s.advancement.nextLevelThreshold}`;
    if (advRemaining) advRemaining.textContent = s.advancement.xpRemaining;
    if (advProgressBar) advProgressBar.style.width = `${s.advancement.progressPercent}%`;
    if (advProgressText) advProgressText.textContent = `${Math.round(s.advancement.progressPercent)}%`;
  }

  const labels = ['Curious', 'Logical', 'Social', 'Agreeable', 'Cautious'];
  const data = [
    s.personality.curious,
    s.personality.logical,
    s.personality.social,
    s.personality.agreeable,
    s.personality.cautious,
  ];
  
  // Reuse chart instance for better performance
  if (radarChart) {
    radarChart.data.datasets[0].data = data;
    radarChart.update('none'); // Skip animations for performance
  } else {
    const ctx = document.getElementById('personalityChart').getContext('2d');
    radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: 'Personality',
          data,
          borderColor: '#9ab4ff',
          backgroundColor: 'rgba(154, 180, 255, 0.2)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#9ab4ff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.5,
        animation: false, // Disable animations for performance
        scales: {
          r: { 
            suggestedMin: 0, 
            suggestedMax: 100, 
            grid: { color: 'rgba(42, 48, 107, 0.4)' }, 
            angleLines: { color: 'rgba(42, 48, 107, 0.4)' }, 
            pointLabels: { 
              color: '#dfe3ff',
              font: { size: 12, weight: '500' },
              padding: 8
            },
            ticks: {
              color: '#7a8ab8',
              backdropColor: 'transparent',
              font: { size: 9 }
            }
          }
        },
        plugins: { 
          legend: { 
            labels: { 
              color: '#dfe3ff',
              font: { size: 11 },
              padding: 10
            } 
          } 
        }
      }
    });
  }
}

async function refreshStats() {
  const s = await getStats();
  renderStats(s);
}

async function fetchBrain() {
  const res = await apiFetch(`/brain`);
  if (!res.ok) throw new Error('brain fetch failed');
  return res.json();
}

async function fetchMemories(limit = 20) {
  const res = await apiFetch(`/memories?limit=${limit}`);
  if (!res.ok) throw new Error('memories fetch failed');
  return res.json();
}

async function fetchJournal(limit = 50) {
  const res = await apiFetch(`/journal?limit=${limit}`);
  if (!res.ok) throw new Error('journal fetch failed');
  return res.json();
}

async function fetchChatLog(limit = 200) {
  const res = await apiFetch(`/chatlog?limit=${limit}`);
  if (!res.ok) throw new Error('chatlog fetch failed');
  return res.json();
}

function renderBrain(data) {
  const container = document.getElementById('brain-graph');
  const desc = document.getElementById('brain-description');
  if (!container) return;

  if (!defaultBrainDescription && desc) {
    defaultBrainDescription = desc.textContent || '';
  }

  if (typeof ForceGraph3D === 'undefined') {
    console.warn('[BRAIN] ForceGraph3D unavailable. WebGL not supported.');
    if (desc) {
      desc.textContent = 'Knowledge web visualization requires WebGL support.';
    }
    return;
  }

  const nodesInput = Array.isArray(data.nodes) ? data.nodes : [];
  const linksInput = Array.isArray(data.links) ? data.links : [];
  const conceptsInput = Array.isArray(data.concepts) ? data.concepts : [];

  const conceptIndex = new Map(conceptsInput.map((concept) => [concept.id, concept]));
  const nodes = nodesInput.map((node) => {
    const concept = conceptIndex.get(node.id);
    const isConcept = !!concept || node.group === 'concept';
    const sentimentLabel = concept?.sentiment?.label || 'neutral';
    const value = node.value || 1;
    const displaySize = Math.max(3.5, Math.log(value + 1) * 4.5);

    let color = '#6f86ff';
    if (isConcept) {
      color = sentimentLabel === 'positive'
        ? '#66bb6a'
        : sentimentLabel === 'negative'
          ? '#ef5350'
          : '#ffb74d';
    }

    const tooltipParts = [`${node.label}`];
    if (isConcept && concept) {
      tooltipParts.push(`${concept.category}`);
      tooltipParts.push(`Importance: ${(concept.importanceScore || 0).toFixed(2)}`);
      tooltipParts.push(`Mentions: ${concept.totalMentions || 0}`);
    } else {
      tooltipParts.push(`Frequency score: ${value}`);
    }

    return {
      id: node.id,
      label: node.label,
      group: isConcept ? 'concept' : (node.group || 'language'),
      value,
      concept: concept || null,
      color,
      displaySize,
      tooltip: tooltipParts.join('\n')
    };
  });

  const links = linksInput.map((link) => {
    const weight = link.value || 1;
    return {
      source: link.from,
      target: link.to,
      weight,
      width: Math.max(0.4, Math.log(weight + 1)),
      color: weight >= 4 ? '#8ea6ff' : '#394580',
      particleCount: weight >= 6 ? 1 : 0,
      particleSpeed: 0.0015 + Math.min(weight, 8) * 0.0004
    };
  });

  brainGraphData = { nodes, links };

  if (!brainGraph3D) {
    container.innerHTML = '';
    brainGraph3D = ForceGraph3D()(container);
    brainGraph3D
      .showNavInfo(false)
      .backgroundColor('#0b0f2a')
      .nodeId('id')
      .nodeLabel((node) => node.tooltip || node.label)
      .nodeVal((node) => node.displaySize || 4)
      .nodeColor((node) => node.color || '#6f86ff')
      .nodeOpacity(0.92)
      .linkColor((link) => link.color || '#394580')
      .linkWidth((link) => link.width || 1)
      .linkOpacity(0.25)
      .linkDirectionalParticles((link) => link.particleCount || 0)
      .linkDirectionalParticleSpeed((link) => link.particleSpeed || 0.002)
      .linkDirectionalParticleWidth(2)
      .onNodeClick((node, event) => {
        handleBrainNodeClick(node, event);
        // If shift-click, focus camera on this node
        if (event?.shiftKey) {
          focusOnBrainNode(node);
        }
      })
      .onNodeRightClick((node) => {
        focusOnBrainNode(node);
      });

    const controls = brainGraph3D.controls();
    controls.autoRotate = false;
    controls.enableZoom = true;
    controls.minDistance = 120;

    const updateSize = () => {
      const { clientWidth, clientHeight } = container;
      brainGraph3D.width(clientWidth);
      brainGraph3D.height(clientHeight);
    };

    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      brainGraphResizeObserver = new ResizeObserver(updateSize);
      brainGraphResizeObserver.observe(container);
    } else {
      window.addEventListener('resize', updateSize);
    }

    brainGraph3D.cameraPosition({ x: 0, y: 0, z: 650 });
  }

  brainGraph3D.graphData(brainGraphData);
  brainGraph3D.refresh();

  updateBrainSummary({
    nodeCount: nodes.length,
    edgeCount: links.length,
    conceptCount: conceptsInput.length
  });

  if (desc) {
    if (conceptsInput.length) {
      const sorted = [...conceptsInput].sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0) || (b.totalMentions || 0) - (a.totalMentions || 0));
      const top = sorted[0];
      if (top) {
        const topKeywords = top.keywords?.slice(0, 3).map((k) => k.word).filter(Boolean);
        const keywordText = topKeywords?.length ? `Keywords: ${topKeywords.join(', ')}` : '';
        desc.textContent = `Dominant concept: ${top.name} (${top.category}). ${keywordText}`.trim();
      } else {
        desc.textContent = defaultBrainDescription || 'Nodes represent the words and concepts Pal hears most often. Links connect words that commonly appear together.';
      }
    } else {
      desc.textContent = defaultBrainDescription || 'Nodes represent the words and concepts Pal hears most often. Links connect words that commonly appear together.';
    }
  }
}

function handleBrainNodeClick(node) {
  const desc = document.getElementById('brain-description');
  if (!desc) return;

  if (node.concept) {
    const concept = node.concept;
    const sentimentLabel = concept.sentiment?.label || 'neutral';
    const importance = (concept.importanceScore || 0).toFixed(2);
    const topKeywords = concept.keywords?.slice(0, 3).map((k) => `${k.word} (${k.count || 0})`).join(', ');
    const details = [
      `${concept.name} — ${concept.category}`,
      `Sentiment: ${sentimentLabel}`,
      `Mentions: ${concept.totalMentions || 0}`,
      `Importance: ${importance}`
    ];
    if (topKeywords) {
      details.push(`Keywords: ${topKeywords}`);
    }
    desc.textContent = details.join(' • ');
  } else {
    desc.textContent = `High-frequency word: "${node.label}" • Frequency score: ${node.value}`;
  }
}

function focusOnBrainNode(node) {
  if (!brainGraph3D || !brainGraphData) return;
  
  // Get node object
  const nodeObj = brainGraphData.nodes.find(n => n.id === node.id);
  if (!nodeObj) return;
  
  // Reset all node and link styling
  brainGraphData.nodes.forEach(n => {
    const originalColor = n.group === 'concept'
      ? (n.concept?.sentiment?.label === 'positive' ? '#66bb6a'
        : n.concept?.sentiment?.label === 'negative' ? '#ef5350'
        : '#ffb74d')
      : '#6f86ff';
    n.color = originalColor;
    n.displaySize = Math.max(3.5, Math.log((n.value || 1) + 1) * 4.5);
  });
  
  brainGraphData.links.forEach(link => {
    link.color = link.weight >= 4 ? 'rgba(142, 166, 255, 0.3)' : 'rgba(57, 69, 128, 0.25)';
    link.width = Math.max(0.4, Math.log((link.weight || 1) + 1));
  });
  
  // Highlight the focused node
  nodeObj.color = '#ffe082';
  nodeObj.displaySize = (nodeObj.displaySize || 5) * 2.5;
  
  // Highlight connected nodes and links
  const connectedNodeIds = new Set();
  brainGraphData.links.forEach(link => {
    const sourceId = link.source.id || link.source;
    const targetId = link.target.id || link.target;
    
    if (sourceId === node.id || targetId === node.id) {
      link.color = 'rgba(255, 224, 130, 0.8)';
      link.width = (link.width || 1) * 3;
      
      // Track connected nodes
      if (sourceId === node.id) connectedNodeIds.add(targetId);
      if (targetId === node.id) connectedNodeIds.add(sourceId);
    }
  });
  
  // Highlight connected nodes
  brainGraphData.nodes.forEach(n => {
    if (connectedNodeIds.has(n.id)) {
      n.color = '#a0c4ff'; // Light blue for connected
      n.displaySize = (n.displaySize || 5) * 1.4;
    }
  });
  
  // Update graph
  brainGraph3D.graphData(brainGraphData);
  
  // Camera animation to focus on node
  const distance = 350;
  const distRatio = 1 + distance / Math.hypot(nodeObj.x || 0, nodeObj.y || 0, nodeObj.z || 0);
  
  brainGraph3D.cameraPosition(
    {
      x: (nodeObj.x || 0) * distRatio,
      y: (nodeObj.y || 0) * distRatio,
      z: (nodeObj.z || 0) * distRatio
    },
    nodeObj, // lookAt
    1000 // ms transition duration
  );
}

function renderMemories(payload) {
  const container = document.getElementById('memory-list');
  if (!container) return;
  const memories = payload?.memories || [];
  latestMemoryTotal = payload?.total ?? latestMemoryTotal;
  updateBrainSummary({ memoriesTotal: latestMemoryTotal });

  if (!memories.length) {
    container.innerHTML = '<p class="memory-empty">No memories yet — start chatting to create them.</p>';
    return;
  }

  container.innerHTML = '';
  memories.forEach((memory) => {
    const item = document.createElement('article');
    item.className = 'memory-item';

    const header = document.createElement('header');
    const when = document.createElement('span');
    when.textContent = formatTimestamp(memory.ts);
    const sentiment = document.createElement('span');
    const sentimentClass = memory.sentiment ? `sentiment-${memory.sentiment}` : 'sentiment-neutral';
    sentiment.className = sentimentClass;
    sentiment.textContent = memory.sentiment || 'neutral';
    header.appendChild(when);
    header.appendChild(sentiment);

    const text = document.createElement('div');
    text.className = 'text';
    text.textContent = `You: ${memory.userText || ''}\nPal: ${memory.palText || ''}`.trim();

    // Add subjective narrative if available
    if (memory.subjectiveNarrative) {
      const narrative = document.createElement('div');
      narrative.className = 'subjective-narrative';
      const narrativeLabel = document.createElement('span');
      narrativeLabel.className = 'narrative-label';
      narrativeLabel.textContent = "Pal's perspective:";
      const narrativeText = document.createElement('p');
      narrativeText.textContent = memory.subjectiveNarrative;
      narrative.appendChild(narrativeLabel);
      narrative.appendChild(narrativeText);
      item.appendChild(header);
      item.appendChild(text);
      item.appendChild(narrative);
    } else {
      item.appendChild(header);
      item.appendChild(text);
    }

    const keywords = document.createElement('div');
    keywords.className = 'keywords';
    if (memory.keywords?.length) {
      keywords.textContent = `Keywords: ${memory.keywords.join(', ')}`;
    } else {
      keywords.textContent = 'Keywords: —';
    }

    item.appendChild(keywords);
    container.appendChild(item);
  });
}

function renderJournal(payload) {
  const container = document.getElementById('journal-entries');
  if (!container) return;
  const summary = document.getElementById('journal-summary');
  const thoughts = payload?.thoughts || [];
  latestJournalTotal = payload?.total ?? latestJournalTotal;
  if (summary) summary.textContent = `Thoughts: ${latestJournalTotal}`;

  if (!thoughts.length) {
    container.innerHTML = '<p class="memory-empty">No thoughts yet — keep chatting to spark new ones.</p>';
    return;
  }

  container.innerHTML = '';
  thoughts.forEach((thought) => {
    const entry = document.createElement('article');
    entry.className = 'journal-entry';

    const header = document.createElement('header');
    const when = document.createElement('span');
    when.textContent = formatTimestamp(thought.ts);
    header.appendChild(when);
    const stage = document.createElement('span');
    stage.textContent = thought.stage ? thought.stage : `Level ${thought.level ?? '—'}`;
    header.appendChild(stage);
    const strategy = document.createElement('span');
    strategy.textContent = `Strategy: ${thought?.response?.strategy || 'unknown'}`;
    header.appendChild(strategy);
    entry.appendChild(header);

    const userLine = document.createElement('p');
    userLine.className = 'journal-user';
    userLine.textContent = thought.userText ? `User: ${thought.userText}` : 'User: —';
    entry.appendChild(userLine);

    const focusLine = document.createElement('p');
    focusLine.className = 'journal-focus';
    const focusParts = [];
    if (thought.focus) focusParts.push(`Focus: ${thought.focus}`);
    if (thought.concept?.name) focusParts.push(`Concept: ${thought.concept.name}`);
    focusLine.textContent = focusParts.length ? focusParts.join(' · ') : 'Focus: —';
    entry.appendChild(focusLine);

    const responseLine = document.createElement('p');
    responseLine.className = 'journal-response';
    const palText = thought?.response?.text;
    responseLine.textContent = palText ? `Pal: ${palText}` : 'Pal: …';
    entry.appendChild(responseLine);

    const analysis = document.createElement('div');
    analysis.className = 'journal-analysis';
    const analysisTags = [];
    const keywords = Array.isArray(thought?.analysis?.keywords) ? thought.analysis.keywords : [];
    if (keywords.length) analysisTags.push(`Keywords: ${keywords.join(', ')}`);
    if (thought?.analysis?.sentiment) analysisTags.push(`Sentiment: ${thought.analysis.sentiment}`);
    const flags = [];
    if (thought?.analysis?.hasQuestion) flags.push('Question noted');
    if (thought?.analysis?.hasGreeting) flags.push('Greeting detected');
    if (thought?.analysis?.hasThanks) flags.push('Thanks detected');
    if (thought?.analysis?.isCommand) flags.push('Instruction noticed');
    if (flags.length) analysisTags.push(`Signals: ${flags.join(', ')}`);
    if (analysisTags.length) {
      analysisTags.forEach((text) => {
        const span = document.createElement('span');
        span.textContent = text;
        analysis.appendChild(span);
      });
    } else {
      const span = document.createElement('span');
      span.textContent = 'No analysis captured';
      analysis.appendChild(span);
    }
    entry.appendChild(analysis);

    const reasoningList = document.createElement('ul');
    reasoningList.className = 'journal-reasoning';
    const reasoning = Array.isArray(thought?.response?.reasoning) ? thought.response.reasoning : [];
    if (reasoning.length) {
      reasoning.forEach((line) => {
        const li = document.createElement('li');
        li.textContent = line;
        reasoningList.appendChild(li);
      });
      entry.appendChild(reasoningList);
    }

    const memoryLine = document.createElement('p');
    memoryLine.className = 'journal-memory';
    const memParts = [];
    const memory = thought?.memory;
    if (memory) {
      memParts.push(memory.stored ? 'Memory stored' : 'Memory not stored');
      if (memory.importanceLevel) memParts.push(`Importance: ${memory.importanceLevel}`);
      if (typeof memory.importanceScore === 'number') memParts.push(`Score: ${Math.round(memory.importanceScore)}`);
      if (memory.memoryId) memParts.push(`Memory ID: ${memory.memoryId.slice(0, 8)}…`);
    }
    if (memParts.length) {
      memParts.forEach((text) => {
        const span = document.createElement('span');
        span.textContent = text;
        memoryLine.appendChild(span);
      });
      entry.appendChild(memoryLine);
    }

    container.appendChild(entry);
  });
}

async function loadJournal(force = false) {
  const container = document.getElementById('journal-entries');
  if (!container || !backendHealthy) return;
  if (journalLoading) return;
  if (!force && journalLoaded) return;
  journalLoading = true;
  
  // Show loading spinner
  container.innerHTML = '<div class="graph-loading"><div class="loading-spinner"></div><p>Loading thoughts...</p></div>';
  
  try {
    const data = await fetchJournal();
    renderJournal(data);
    journalLoaded = true;
  } catch (err) {
    console.error('Failed to load journal', err);
    container.innerHTML = '<p class="memory-empty">Failed to load thoughts. Try refreshing.</p>';
  } finally {
    journalLoading = false;
  }
}

async function loadBrainInsights() {
  try {
    const [graph, memories] = await Promise.all([fetchBrain(), fetchMemories()]);
    console.log('[BRAIN] Loaded graph data:', { nodes: graph.nodes?.length || 0, links: graph.links?.length || 0, concepts: graph.concepts?.length || 0 });
    renderBrain(graph);
    renderMemories(memories);
  } catch (err) {
    console.error('Failed to load brain insights', err);
    // On error, reset to empty state
    updateBrainSummary({ nodeCount: 0, edgeCount: 0, conceptCount: 0, memoriesTotal: 0 });
  }
}

function wireTabs() {
  $$('nav button').forEach(btn => btn.addEventListener('click', async () => {
    const tab = btn.dataset.tab;
    if (window.perf) window.perf.mark(`${tab}_tab_enter`);
    
    switchTab(tab);
    
    if (tab === 'journal') {
      // Ensure the thoughts subtab is active by default
      const thoughtsBtn = document.querySelector('.brain-tab-btn[data-journal-tab="thoughts"]');
      if (thoughtsBtn && !thoughtsBtn.classList.contains('active')) {
        thoughtsBtn.classList.add('active');
      }
      
      // Show the thoughts content by default
      const thoughtsContent = document.getElementById('journal-tab-thoughts');
      if (thoughtsContent && !thoughtsContent.classList.contains('active')) {
        thoughtsContent.classList.add('active');
      }
      
      await loadJournal(true);
    } else if (tab === 'brain') {
      await loadBrainInsights();
      if (window.perf) {
        window.perf.mark('brain_tab_ready');
        window.perf.measure('Brain Tab Load', 'brain_tab_enter', 'brain_tab_ready');
      }
    } else if (tab === 'stats') {
      await renderProgressDashboard();
      if (window.perf) {
        window.perf.mark('stats_tab_ready');
        window.perf.measure('Stats Tab Load', 'stats_tab_enter', 'stats_tab_ready');
      }
    }
  }));
}

// Store chat handler to prevent duplicate listeners
let chatSubmitHandler = null;

function wireChat() {
  logInfo('UI', 'Wiring chat form event handlers');
  
  const form = $('#chat-form');
  
  // Remove existing listener if it exists to prevent duplicates
  if (chatSubmitHandler) {
    form.removeEventListener('submit', chatSubmitHandler);
    logDebug('UI', 'Removed existing chat submit handler');
  }
  
  // Define the handler
  chatSubmitHandler = async (e) => {
    e.preventDefault();
    const chatId = Date.now();
    startTimer(`chat_${chatId}`);
    logInfo('CHAT', `Chat submission started`, { chatId, timestamp: chatId });
    
    const input = $('#chat-input');
    const floatingInput = $('#floating-chat-input');
    const rawValue = input.value;
    const msg = rawValue.trim();
    
    logDebug('CHAT', `Message validation`, { 
      rawLength: rawValue.length, 
      trimmedLength: msg.length,
      rawValue: rawValue.substring(0, 50),
      isEmpty: !msg
    });
    
    if (!msg) {
      logDebug('CHAT', 'Empty message submitted - ignoring');
      return;
    }
    
    logInfo('CHAT', `User message prepared`, { 
      chatId, 
      messageLength: msg.length,
      message: msg.substring(0, 100) + (msg.length > 100 ? '...' : '')
    });
    
    lastUserMessage = msg;
    addMessage('user', msg);
    
    if (window.perf) {
      window.perf.mark('chat_msg_dom_ready');
      window.perf.measure('Chat Message Render', 'chat_msg_submit', 'chat_msg_dom_ready');
    }
    
    // If floating chat is open, sync the message there too
    if (floatingChatOpen) {
      addFloatingMessage('user', msg);
    }
    
    input.value = '';
    logDebug('CHAT', `Input cleared and UI state changing`, { chatId });
    
    // Disable both inputs while waiting for response
    input.disabled = true;
    input.placeholder = 'Pal is thinking...';
    logInfo('UI', `Main input disabled - waiting for response`, { chatId });
    
    if (floatingInput) {
      floatingInput.disabled = true;
      floatingInput.placeholder = 'Pal is thinking...';
      logDebug('UI', `Floating input disabled`, { chatId });
    }
    
    const indicator = showTyping();
    const floatingIndicator = floatingChatOpen ? showFloatingTyping() : null;
    logInfo('CHAT', `Typing indicators created`, { 
      chatId,
      mainIndicator: !!indicator,
      floatingIndicator: !!floatingIndicator,
      floatingChatOpen: typeof floatingChatOpen !== 'undefined' ? floatingChatOpen : 'undefined'
    });
    
    // FAILSAFE: Force re-enable inputs after 65 seconds no matter what
    const failsafeTimeout = setTimeout(() => {
      logWarn('FAILSAFE', `Force re-enabling inputs after timeout`, { chatId });
      clearAllTypingIndicators();
      clearFloatingTypingIndicators();
      if (input) {
        input.disabled = false;
        input.value = '';
        input.placeholder = 'Type a message...';
      }
      if (floatingInput) {
        floatingInput.disabled = false;
        floatingInput.value = '';
        floatingInput.placeholder = 'Type a message...';
      }
      addMessage('pal', '⚠️ Something went wrong. Please try again.');
    }, 65000);
    
    try {
      logInfo('API', `Sending chat request to backend`, { chatId });
      const res = await sendChat(msg);
      
      // Clear failsafe timeout since we got a response
      clearTimeout(failsafeTimeout);
      
      // Validate response
      if (!res) {
        throw new Error('Empty response from server');
      }
      
      logInfo('API', `Backend response received`, { 
        chatId, 
        hasReply: !!(res?.reply),
        hasOutput: !!(res?.output),
        hasEmotion: !!(res?.emotion),
        kind: res?.kind
      });
      
      // CRITICAL: Clear typing indicators and re-enable inputs BEFORE displaying message
      logInfo('CHAT', `Cleaning up UI before displaying response`, { chatId });
      
      // Remove typing indicators first
      hideTyping(indicator);
      if (floatingIndicator) {
        hideFloatingTyping(floatingIndicator);
      }
      clearAllTypingIndicators();
      clearFloatingTypingIndicators();
      
      // Re-enable and reset inputs
      if (input) {
        input.disabled = false;
        input.value = '';
        input.placeholder = 'Type a message...';
        logDebug('UI', `Main input re-enabled before message display`, { chatId });
      }
      
      if (floatingInput) {
        floatingInput.disabled = false;
        floatingInput.value = '';
        floatingInput.placeholder = 'Type a message...';
        logDebug('UI', `Floating input re-enabled before message display`, { chatId });
      }
      
      // NOW display the response after UI is ready
      const replyText = typeof res?.reply === 'string' ? res.reply : (res?.output ? String(res.output) : 'Unable to respond right now.');
      const meta = buildPalMeta(res);
      addMessage('pal', replyText, meta);
      logInfo('CHAT', `Pal message added to main chat`, { 
        chatId,
        responseLength: replyText.length,
        meta,
        processingTimeMs: typeof res?.processingTimeMs === 'number' ? res.processingTimeMs : null
      });

      if (typeof res?.processingTimeMs === 'number') {
        logInfo('PERFORMANCE', `Chat response rendered`, { 
          chatId,
          processingTimeMs: Math.round(res.processingTimeMs)
        });
      }

      const neuralSummary = summarizeNeuralActivations(res?.neuralActivations);
      if (neuralSummary) {
        logDebug('NEURAL', `Neural activation sequence applied`, { chatId, neuralSummary });
      }
      
      // If floating chat is open, sync the response there too
      if (floatingChatOpen) {
        addFloatingMessage('pal', replyText, meta);
        logDebug('CHAT', `Response synced to floating chat`, { chatId });
      }
      
      // Update emotion display if emotion data is present
      if (res?.emotion) {
        updateEmotionDisplay(res.emotion);
        logDebug('UI', `Emotion display updated`, { 
          chatId,
          emotion: res.emotion.expression,
          mood: res.emotion.mood,
          intensity: res.emotion.intensity
        });
        if (floatingChatOpen) {
          updateFloatingEmotion(res.emotion);
        }
      }
      
      const wasDirty = multiplierDirty;
      await refreshStats();
      multiplierDirty = wasDirty;
      if (journalLoaded) {
        await loadJournal(true);
      }
      logDebug('STATE', `Post-chat cleanup completed`, { chatId });
      
    } catch (e) {
      // Clear failsafe timeout since we're handling the error
      clearTimeout(failsafeTimeout);
      
      logError('CHAT', `Chat request failed`, { 
        chatId,
        error: e.message,
        stack: e.stack,
        backendHealthy
      });
      
      // Clear UI state before showing error
      hideTyping(indicator);
      if (floatingIndicator) {
        hideFloatingTyping(floatingIndicator);
      }
      clearAllTypingIndicators();
      clearFloatingTypingIndicators();
      
      // Re-enable inputs before showing error message
      if (input) {
        input.disabled = false;
        input.value = '';
        input.placeholder = 'Type a message...';
      }
      if (floatingInput) {
        floatingInput.disabled = false;
        floatingInput.value = '';
        floatingInput.placeholder = 'Type a message...';
      }
      
      let errorMsg = 'Sorry, I had trouble responding.';
      
      // Provide more specific error messages
      if (!backendHealthy) {
        errorMsg = 'Server not running. Please start the backend.';
        logWarn('STATE', `Backend unhealthy - showing status modal`, { chatId });
        showStatusModal();
      } else if (e.message?.includes('fetch') || e.message?.includes('network')) {
        errorMsg = 'Network error. Please check your connection.';
        logWarn('API', `Network error detected`, { chatId, error: e.message });
      } else if (e.message?.toLowerCase().includes('request timed out')) {
        errorMsg = `${e.message}. Please try again.`;
        logWarn('API', 'Request timeout', { chatId, error: e.message });
      } else if (e.message?.includes('Chat failed')) {
        errorMsg = 'Unable to generate response. Please try again.';
        logWarn('API', `Chat generation failed`, { chatId });
      } else {
        logError('API', `Unexpected error`, { chatId, error: e.message });
      }
      
      addMessage('pal', errorMsg);
      if (floatingChatOpen) {
        addFloatingMessage('pal', errorMsg);
      }
      logInfo('CHAT', `Error message displayed to user`, { chatId, errorMsg });
    } finally {
      logInfo('CHAT', `Chat cleanup starting`, { chatId });
      
      // Final safety check - ensure everything is cleared (defensive programming)
      clearAllTypingIndicators();
      clearFloatingTypingIndicators();
      
      // Safety timeout to catch any edge cases
      setTimeout(() => {
        const chatInput = $('#chat-input');
        const floatInput = $('#floating-chat-input');
        
        // Only log if we needed to force re-enable (shouldn't happen now)
        if (chatInput && chatInput.disabled) {
          chatInput.disabled = false;
          chatInput.value = '';
          chatInput.placeholder = 'Type a message...';
          logWarn('UI', `Main input force re-enabled via safety timeout`, { chatId });
        }
        if (floatInput && floatInput.disabled) {
          floatInput.disabled = false;
          floatInput.value = '';
          floatInput.placeholder = 'Type a message...';
          logWarn('UI', `Floating input force re-enabled via safety timeout`, { chatId });
        }
      }, 100);
      
      // Focus the input
      if (input) {
        try {
          input.focus();
          logDebug('UI', `Input focused successfully`, { chatId });
        } catch (e) {
          logWarn('UI', `Could not focus input`, { chatId, error: e.message });
        }
      }
      
      const totalTime = endTimer(`chat_${chatId}`);
      logInfo('CHAT', `Chat cycle completed`, { 
        chatId,
        totalTime: totalTime ? `${totalTime.toFixed(2)}ms` : 'unknown'
      });
    }
  };
  
  // Add the event listener
  form.addEventListener('submit', chatSubmitHandler);
  logDebug('UI', 'Chat submit handler registered');
}

function wireSettings() {
  // Load and apply appearance settings
  const appearance = loadAppearanceSettings();
  
  // Set initial values in form
  if ($('#theme-select')) $('#theme-select').value = appearance.theme;
  if ($('#font-select')) $('#font-select').value = appearance.font;
  if ($('#text-size')) {
    $('#text-size').value = appearance.textSize;
    $('#text-size-value').textContent = `${appearance.textSize}px`;
  }
  if ($('#smooth-scrolling')) $('#smooth-scrolling').checked = appearance.smoothScrolling;
  if ($('#reduced-motion')) $('#reduced-motion').checked = appearance.reducedMotion;
  
  // Wire appearance controls
  $('#theme-select')?.addEventListener('change', (e) => {
    saveAppearanceSettings({
      theme: e.target.value,
      font: $('#font-select').value,
      textSize: $('#text-size').value,
      smoothScrolling: $('#smooth-scrolling').checked,
      reducedMotion: $('#reduced-motion').checked
    });
  });
  
  $('#font-select')?.addEventListener('change', (e) => {
    saveAppearanceSettings({
      theme: $('#theme-select').value,
      font: e.target.value,
      textSize: $('#text-size').value,
      smoothScrolling: $('#smooth-scrolling').checked,
      reducedMotion: $('#reduced-motion').checked
    });
  });
  
  $('#text-size')?.addEventListener('input', (e) => {
    $('#text-size-value').textContent = `${e.target.value}px`;
  });
  
  $('#text-size')?.addEventListener('change', (e) => {
    saveAppearanceSettings({
      theme: $('#theme-select').value,
      font: $('#font-select').value,
      textSize: e.target.value,
      smoothScrolling: $('#smooth-scrolling').checked,
      reducedMotion: $('#reduced-motion').checked
    });
  });
  
  $('#smooth-scrolling')?.addEventListener('change', (e) => {
    saveAppearanceSettings({
      theme: $('#theme-select').value,
      font: $('#font-select').value,
      textSize: $('#text-size').value,
      smoothScrolling: e.target.checked,
      reducedMotion: $('#reduced-motion').checked
    });
  });
  
  $('#reduced-motion')?.addEventListener('change', (e) => {
    saveAppearanceSettings({
      theme: $('#theme-select').value,
      font: $('#font-select').value,
      textSize: $('#text-size').value,
      smoothScrolling: $('#smooth-scrolling').checked,
      reducedMotion: e.target.checked
    });
  });
  
  $('#save-settings').addEventListener('click', async () => {
    const saveBtn = $('#save-settings');
    const originalText = saveBtn.textContent;
    
    // Show loading state
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    try {
      const mult = parseInt($('#xp-multiplier').value, 10) || 1;
      const provider = ($('#api-provider').value || 'local');
      const keyRaw = ($('#api-key').value || '').trim();
      const telemetry = !!$('#telemetry').checked;
      const authRequired = !!$('#auth-required').checked;
      
      await saveSettings(mult, provider, keyRaw ? keyRaw : undefined, telemetry, authRequired);
      if (keyRaw) $('#api-key').value = '';
      multiplierDirty = false;
      await refreshStats();
      
      // Show success feedback
      saveBtn.textContent = '? Saved!';
      setTimeout(() => {
        saveBtn.textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      saveBtn.textContent = '? Failed';
      setTimeout(() => {
        saveBtn.textContent = originalText;
      }, 2000);
    } finally {
      saveBtn.disabled = false;
    }
  });
  
  $('#switch-profile')?.addEventListener('click', async () => {
    if (confirm('Switch to a different profile? Your current session will be saved.')) {
      currentProfileId = null;
      localStorage.removeItem('mypal_current_profile');
      showProfileMenu();
      await initProfileMenu();
      
      // Ensure profile cards are visible when switching profiles
      const profileCards = $('#profile-cards');
      if (profileCards) {
        profileCards.classList.remove('hidden');
      }
    }
  });
  
  $('#reset-pal').addEventListener('click', async () => {
    const confirmed = confirm('Are you sure? Doing this will wipe your Pal forever.');
    if (!confirmed) return;
    
    const resetBtn = $('#reset-pal');
    const originalText = resetBtn.textContent;
    resetBtn.disabled = true;
    resetBtn.textContent = 'Resetting...';
    
    try {
      await doReset();
      
      const chatWindow = $('#chat-window');
      if (chatWindow) chatWindow.innerHTML = '';

      const memoryList = $('#memory-list');
      if (memoryList) memoryList.innerHTML = '<p class="memory-empty">No memories yet — start chatting to create them.</p>';
      latestMemoryTotal = 0;
      updateBrainSummary({ nodeCount: 0, edgeCount: 0, conceptCount: 0, memoriesTotal: latestMemoryTotal });

      const brainGraph = document.getElementById('brain-graph');
      if (brainGraph) brainGraph.innerHTML = '<div class="graph-empty">Teach Pal new ideas to grow this graph.</div>';

      const journalEntries = document.getElementById('journal-entries');
      if (journalEntries) journalEntries.innerHTML = '<p class="memory-empty">No thoughts yet — keep chatting to spark new ones.</p>';
      const journalSummary = document.getElementById('journal-summary');
      if (journalSummary) journalSummary.textContent = 'Thoughts: 0';
      latestJournalTotal = 0;
      journalLoaded = false;

      authToken = null;
      localStorage.removeItem('mypal_token');
      const authStatus = document.getElementById('auth-status');
      if (authStatus) authStatus.textContent = 'Not logged in';
      
      resetBtn.textContent = '? Reset complete';
      setTimeout(() => {
        resetBtn.textContent = originalText;
        resetBtn.disabled = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to reset Pal:', err);
      alert('Unable to reset Pal. Please ensure you are logged in if authentication is required.');
      resetBtn.textContent = '? Failed';
      setTimeout(() => {
        resetBtn.textContent = originalText;
        resetBtn.disabled = false;
      }, 2000);
    }

    multiplierDirty = false;
    // Parallelize independent API calls for better performance
    await Promise.all([refreshStats(), loadBrainInsights()]);
    updateDevPanel();
  });
  $('#export-memory').addEventListener('click', doExport);

  const multiplierInputEl = $('#xp-multiplier');
  multiplierInputEl?.addEventListener('input', (e) => {
    multiplierDirty = true;
    setMultiplierDisplay(e.target.value);
  });
  multiplierInputEl?.addEventListener('change', () => {
    multiplierDirty = true;
  });
}

async function init() {
  // Performance monitoring
  if (window.perf) window.perf.mark('init_start');

  const bootRefs = getBootLoaderRefs();
  bootRefs.help?.addEventListener('click', () => {
    logInfo('STARTUP', 'Troubleshooting modal opened from loader');
    showStatusModal();
  });
  
  // Wire up profile management first
  wireProfileManagement();
  await runStartupSequence();

  // Always show profile menu on startup - let user choose their profile
  showProfileMenu();
  await initProfileMenu();

  if (window.perf) {
    window.perf.mark('init_profile_menu_ready');
    window.perf.measure('Init to Profile Menu', 'init_start', 'init_profile_menu_ready');
  }
  
  wireTabs();
  wireChat();
  wireChatSearch();
  setupChatInsightsPanel();
  wireSettings();
  setupBrainSubTabs();
  setupJournalSubTabs();
  setupNeuralRefresh();
  setupNeuralSearchAndFilters();
  setupBrainSearchAndFilters();
  setupNeuralRegeneration();
  setupNeuralPlaybackControls();
  setupCollapsibleInfo();
  setupMemorySearch();
  connectNeuralSocket(); // Connect WebSocket for real-time neural events
  
  // Wire exit button
  $('#exit-to-menu')?.addEventListener('click', async () => {
    if (confirm('Exit to profile menu? Your current session will be saved.')) {
      currentProfileId = null;
      localStorage.removeItem('mypal_current_profile');
      // Ensure any floating overlays are closed to avoid input capture
      const floatingModal = document.getElementById('floating-chat-modal');
      if (floatingModal) {
        floatingModal.classList.add('hidden');
      }
      if (typeof floatingChatOpen !== 'undefined') {
        floatingChatOpen = false;
      }
      showProfileMenu();
      await initProfileMenu();
    }
  });
  
  const retry = document.getElementById('retry-connection');
  const dismiss = document.getElementById('dismiss-connection');
  retry?.addEventListener('click', async () => {
    const ok = await checkHealth();
    if (ok) {
      hideStatusModal();
      if (currentProfileId) {
        await refreshStats();
      } else {
        await initProfileMenu();
      }
    }
  });
  dismiss?.addEventListener('click', hideStatusModal);

  // Dev tools and emergency shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      toggleDevPanel();
    }
    
    // Emergency shortcut: Ctrl + Shift + R to force re-enable inputs
    if (e.ctrlKey && e.shiftKey && (e.key === 'r' || e.key === 'R')) {
      e.preventDefault();
      logWarn('UI', 'Emergency shortcut triggered: Ctrl+Shift+R');
      forceEnableAllInputs();
      clearAllTypingIndicators();
      clearFloatingTypingIndicators();
      logInfo('UI', 'Emergency input recovery completed');
    }
  });
  const ping = document.getElementById('dev-ping');
  ping?.addEventListener('click', async () => {
    const ok = await checkHealth();
    updateDevPanel();
    if (!ok) showStatusModal();
  });
  updateDevPanel();
  const refreshBrainBtn = document.getElementById('refresh-brain');
  refreshBrainBtn?.addEventListener('click', async () => {
    await loadBrainInsights();
  });
  const refreshJournalBtn = document.getElementById('refresh-journal');
  refreshJournalBtn?.addEventListener('click', async () => {
    await loadJournal(true);
  });

  // Auth controls in dev panel
  const authUser = document.getElementById('auth-user');
  const authPass = document.getElementById('auth-pass');
  const authStatus = document.getElementById('auth-status');
  const setAuthStatus = () => authStatus && (authStatus.textContent = authToken ? `Token: ${authToken.slice(0,8)}…` : 'Not logged in');
  setAuthStatus();
  document.getElementById('auth-register')?.addEventListener('click', async () => {
    const username = (authUser?.value || '').trim();
    const password = authPass?.value || '';
    if (!username || !password) return;
    const res = await fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    if (!res.ok) return;
    const data = await res.json();
    authToken = data.token; localStorage.setItem('mypal_token', authToken); setAuthStatus();
  });
  document.getElementById('auth-login')?.addEventListener('click', async () => {
    const username = (authUser?.value || '').trim();
    const password = authPass?.value || '';
    if (!username || !password) return;
    const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    if (!res.ok) return;
    const data = await res.json();
    authToken = data.token; localStorage.setItem('mypal_token', authToken); setAuthStatus();
  });
  document.getElementById('auth-logout')?.addEventListener('click', async () => {
    if (authToken) { await apiFetch('/auth/logout', { method: 'POST' }); }
    authToken = null; localStorage.removeItem('mypal_token'); setAuthStatus();
  });
}

window.addEventListener('DOMContentLoaded', init);

async function checkHealth() {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1500);
    const r = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(t);
    backendHealthy = r.ok;
  } catch {
    backendHealthy = false;
  }
  return backendHealthy;
}

function showStatusModal() {
  const m = document.getElementById('status-modal');
  if (m) m.classList.remove('hidden');
}

function hideStatusModal() {
  const m = document.getElementById('status-modal');
  if (m) m.classList.add('hidden');
}

function toggleDevPanel() {
  const p = document.getElementById('dev-panel');
  if (!p) return;
  p.classList.toggle('hidden');
  updateDevPanel();
}

function updateDevPanel() {
  const status = document.getElementById('dev-backend-status');
  status && (status.textContent = backendHealthy ? 'healthy' : 'unreachable');
  // We can fetch settings to populate provider
  getStats().then(s => {
    const prov = document.getElementById('dev-api-provider');
    if (prov) prov.textContent = s.settings?.apiProvider || 'local';
  }).catch(() => {});
}

// --- Chat search ---
function renderSearchResults(matches = []) {
  const panel = document.getElementById('chat-search-results');
  if (!panel) return;
  if (!matches.length) {
    panel.classList.add('hidden');
    panel.innerHTML = '';
    return;
  }
  panel.classList.remove('hidden');
  panel.innerHTML = '';
  for (const m of matches) {
    const row = document.createElement('div');
    row.className = 'search-row';
    const when = document.createElement('span');
    when.className = 'when';
    when.textContent = formatTimestamp(m.ts);
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = m.role === 'pal' ? 'Pal' : 'You';
    const text = document.createElement('span');
    text.className = 'text';
    text.textContent = m.text;
    row.appendChild(when);
    row.appendChild(who);
    row.appendChild(text);
    panel.appendChild(row);
  }
}

function wireChatSearch() {
  const input = document.getElementById('chat-search');
  const btn = document.getElementById('chat-search-btn');
  const clear = document.getElementById('chat-search-clear');
  const perform = async () => {
    const q = (input?.value || '').trim();
    if (!q) { renderSearchResults([]); return; }
    try {
      const { messages = [] } = await fetchChatLog(300);
      const lower = q.toLowerCase();
      const matches = messages.filter(m => String(m.text || '').toLowerCase().includes(lower));
      renderSearchResults(matches.slice(-100));
    } catch (err) {
      console.error('Chat search failed', err);
      renderSearchResults([]);
    }
  };
  btn?.addEventListener('click', perform);
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); perform(); } });
  clear?.addEventListener('click', () => { if (input) input.value = ''; renderSearchResults([]); });
}

function setupChatInsightsPanel() {
  const buttons = Array.from(document.querySelectorAll('.insight-view-btn'));
  const panels = Array.from(document.querySelectorAll('.insight-view'));
  if (!buttons.length || !panels.length) return;

  const activate = (viewName) => {
    if (!viewName) return;
    buttons.forEach((btn) => {
      const isActive = btn.dataset.insightView === viewName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    panels.forEach((panel) => {
      const matches = panel.dataset.insightContent === viewName;
      panel.classList.toggle('active', matches);
      panel.setAttribute('aria-hidden', matches ? 'false' : 'true');
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => activate(btn.dataset.insightView));
    btn.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        activate(btn.dataset.insightView);
      }
    });
  });

  const active = buttons.find((btn) => btn.classList.contains('active')) || buttons[0];
  if (active) {
    activate(active.dataset.insightView);
  }

  const brainLink = document.querySelector('.insight-link-btn[data-target-tab="brain"]');
  if (brainLink) {
    brainLink.addEventListener('click', () => {
      try {
        const brainButton = document.querySelector('nav button[data-tab="brain"]');
        if (typeof switchTab === 'function') {
          switchTab('brain');
        } else {
          brainButton?.click();
        }
        brainButton?.focus();
      } catch (err) {
        console.warn('Failed to open brain tab from insight link', err);
      }
    });
  }
}

// --- Progress dashboard (stats tab) ---
let xpChartEl = null;
let convoChartEl = null;
async function renderProgressDashboard() {
  let payload;
  try {
    payload = await fetchMemories(400);
  } catch (err) {
    console.error('Failed to fetch memories for progress dashboard:', err);
    return;
  }
  
  const memories = payload?.memories || [];
  
  // Show empty state messages if no data
  const xpCanvas = document.getElementById('xpChart');
  const convoCanvas = document.getElementById('convoChart');
  
  if (!memories.length) {
    // Show empty state for XP chart
    if (xpCanvas) {
      const xpContainer = xpCanvas.parentElement;
      if (xpContainer) {
        xpContainer.innerHTML = '<p class="graph-empty">Start chatting to track your XP progress!</p>';
      }
    }
    
    // Show empty state for conversation chart
    if (convoCanvas) {
      const convoContainer = convoCanvas.parentElement;
      if (convoContainer) {
        convoContainer.innerHTML = '<p class="graph-empty">Conversation data will appear here as you chat.</p>';
      }
    }
    
    return;
  }

  const byDay = new Map();
  const xpSeries = [];
  for (const m of memories) {
    const day = new Date(m.ts).toLocaleDateString();
    byDay.set(day, (byDay.get(day) || 0) + 1);
    xpSeries.push({ t: m.ts, v: (m?.xp?.total ?? 0) });
  }
  xpSeries.sort((a,b) => a.t - b.t);
  const xpLabels = xpSeries.map(p => new Date(p.t).toLocaleTimeString());
  const xpData = xpSeries.map(p => p.v);
  const convoLabels = Array.from(byDay.keys());
  const convoData = Array.from(byDay.values());

  const xpCtx = xpCanvas?.getContext('2d');
  if (xpCtx) {
    // Reuse chart instance for better performance
    if (xpChartEl) {
      xpChartEl.data.labels = xpLabels;
      xpChartEl.data.datasets[0].data = xpData;
      xpChartEl.update('none'); // Skip animations
    } else {
      xpChartEl = new Chart(xpCtx, {
        type: 'line',
        data: { 
          labels: xpLabels, 
          datasets: [{ 
            label: 'XP Over Time', 
            data: xpData, 
            borderColor: '#9ab4ff', 
            backgroundColor: 'rgba(154,180,255,0.2)', 
            tension: 0.25,
            pointRadius: 2,
            pointHoverRadius: 4
          }] 
        },
        options: { 
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2,
          animation: false, // Disable animations for performance
          plugins: { 
            legend: { 
              labels: { color: '#dfe3ff', font: { size: 11 } } 
            } 
          }, 
          scales: { 
            x: { 
              ticks: { 
                color: '#dfe3ff',
                maxRotation: 45,
                minRotation: 45,
                font: { size: 9 },
                maxTicksLimit: 12
              },
              grid: { color: 'rgba(42, 48, 107, 0.3)' }
            }, 
            y: { 
              ticks: { color: '#dfe3ff', font: { size: 10 } },
              grid: { color: 'rgba(42, 48, 107, 0.3)' }
            } 
          } 
        }
      });
    }
  }
  const convoCtx = convoCanvas?.getContext('2d');
  if (convoCtx) {
    // Reuse chart instance for better performance
    if (convoChartEl) {
      convoChartEl.data.labels = convoLabels;
      convoChartEl.data.datasets[0].data = convoData;
      convoChartEl.update('none'); // Skip animations
    } else {
      convoChartEl = new Chart(convoCtx, {
        type: 'bar',
        data: { 
          labels: convoLabels, 
          datasets: [{ 
            label: 'Conversations per day', 
            data: convoData, 
            backgroundColor: 'rgba(50,64,168,0.5)', 
            borderColor: '#9ab4ff',
            borderWidth: 1
          }] 
        },
        options: { 
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2,
          animation: false, // Disable animations for performance
          plugins: { 
            legend: { 
              labels: { color: '#dfe3ff', font: { size: 11 } } 
            } 
          }, 
          scales: { 
            x: { 
              ticks: { 
                color: '#dfe3ff',
                font: { size: 10 },
                maxRotation: 0,
                minRotation: 0
              },
              grid: { color: 'rgba(42, 48, 107, 0.3)' }
            }, 
            y: { 
              ticks: { color: '#dfe3ff', font: { size: 10 } },
              grid: { color: 'rgba(42, 48, 107, 0.3)' },
              beginAtZero: true
            } 
          } 
        }
      });
    }
  }
}

// ==============================================
// NEURAL VISUALIZATION
// ==============================================

// Brain sub-tab switching
function setupBrainSubTabs() {
  const buttons = $$('.brain-tab-btn[data-brain-tab]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.brainTab;
      
      // Update button states
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update content visibility
      $$('.brain-tab-content').forEach(content => content.classList.remove('active'));
      const targetContent = document.getElementById(`brain-tab-${tabName}`);
      if (targetContent) {
        targetContent.classList.add('active');
        
        // Load neural data when switching to neural tab
        if (tabName === 'neural') {
          refreshNeuralNetwork();
        }
      }
    });
  });
}

// Journal sub-tab switching
function setupJournalSubTabs() {
  const buttons = $$('.brain-tab-btn[data-journal-tab]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.journalTab;
      
      // Update button states
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update content visibility
      const allContents = document.querySelectorAll('#tab-journal .brain-tab-content');
      allContents.forEach(content => content.classList.remove('active'));
      const targetContent = document.getElementById(`journal-tab-${tabName}`);
      if (targetContent) {
        targetContent.classList.add('active');
        
        // Load data when switching tabs
        if (tabName === 'thoughts') {
          loadJournal(true);
        }
        // Other tabs will be populated later with specific data
      }
    });
  });
}

// Fetch neural network data
async function fetchNeuralNetwork() {
  try {
    const res = await apiFetch('/neural');
    if (!res.ok) throw new Error('Failed to fetch neural network');
    const data = await res.json();
    return data.neural || null;
  } catch (err) {
    console.error('Error fetching neural network:', err);
    return null;
  }
}

// Refresh neural network visualization
async function refreshNeuralNetwork() {
  const btn = $('#refresh-neural');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Refreshing...';
  }
  
  const networkData = await fetchNeuralNetwork();
  if (!networkData) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Refresh';
    }
    return;
  }
  
  renderNeuralNetwork(networkData);
  
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Refresh';
  }
}

function renderNeuralNetwork(networkData) {
  const container = document.getElementById('neural-network-graph');
  const data = networkData || neuralState;
  if (!container || !data || !data.regions) return;

  if (typeof ForceGraph3D === 'undefined') {
    console.warn('[NEURAL] ForceGraph3D unavailable. WebGL not supported.');
    return;
  }

  neuralState = data;

  neuralActivityFeed.length = 0;
  neuralActivityMap.clear();
  neuralActivityIdSet.clear();
  neuralActivityByNeuron.clear();
  neuralReplayQueue = [];
  neuralReplayActive = false;
  updateNeuralEvents();

  const nodes = [];
  const links = [];
  neuralNodeIndex = new Map();
  neuralLinkIndex = new Map();

  data.regions.forEach((region) => {
    const neurons = Array.isArray(region.neurons) ? region.neurons : [];
    neurons.forEach((neuron) => {
      const baseSize = neuron.type === 'excitatory' ? 11 : 8;
      const connectionBoost = Math.min(neuron.connections?.length || 0, 12);
      const displaySize = baseSize + connectionBoost * 0.6;
      const node = {
        id: neuron.id,
        label: neuron.pattern || neuron.id.slice(-8),
        kind: 'neuron',
        regionId: region.regionId,
        regionName: region.regionName,
        neuronType: neuron.type,
        connectionCount: neuron.connections?.length || 0,
        activationThreshold: neuron.activationThreshold || 1,
        restingPotential: neuron.restingPotential || 0,
        color: region.color,
        baseSize: displaySize,
        displaySize,
        firePulse: false,
        sourceNeuron: neuron
      };
      nodes.push(node);
      neuralNodeIndex.set(node.id, node);
    });
  });

  const knownIds = new Set(neuralNodeIndex.keys());
  data.regions.forEach((region) => {
    const neurons = Array.isArray(region.neurons) ? region.neurons : [];
    neurons.forEach((neuron) => {
      if (!Array.isArray(neuron.connections)) return;
      neuron.connections.forEach((connection) => {
        if (!knownIds.has(connection.targetNeuronId)) return;
        const key = `${neuron.id}|${connection.targetNeuronId}`;
        if (neuralLinkIndex.has(key)) return;
        const weight = connection.weight || 0.5;
        const link = {
          source: neuron.id,
          target: connection.targetNeuronId,
          weight,
          latency: connection.latency || 60,
          color: 'rgba(140, 162, 255, 0.32)',
          width: Math.max(0.35, weight * 0.9),
          particleCount: 0,
          particleSpeed: 0.008,
          highlight: false
        };
        links.push(link);
        neuralLinkIndex.set(key, link);
      });
    });
  });

  if (!nodes.length) {
    container.innerHTML = '<div class="graph-empty">Neural network not yet initialized.</div>';
    return;
  }

  neuralGraphData = { nodes, links };

  if (Array.isArray(data.events) && data.events.length) {
    const recentEvents = data.events.slice(-MAX_ACTIVITY_ENTRIES);
    recentEvents.forEach((evt) => addNeuralActivityEntry(evt, { silent: true }));
    updateNeuralEvents();
  }

  if (!neuralGraph3D) {
    container.innerHTML = '';
    neuralGraph3D = ForceGraph3D()(container);
    neuralGraph3D
      .showNavInfo(false)
      .backgroundColor('#070b23')
      .nodeId('id')
      .nodeOpacity(0.95)
      .nodeVal((node) => node.displaySize || 6)
      .nodeColor((node) => (node.firePulse ? '#ffffff' : node.color))
      .nodeLabel(formatNeuronTooltip)
      .linkColor((link) => (link.highlight ? '#ffe082' : link.color))
      .linkWidth((link) => link.width || 0.5)
      .linkOpacity(0.2)
      .linkDirectionalParticles((link) => link.particleCount || 0)
      .linkDirectionalParticleSpeed((link) => link.particleSpeed || 0.008)
      .linkDirectionalParticleWidth(3)
      .onNodeClick((node, event) => {
        if (node.kind === 'neuron' && node.sourceNeuron) {
          // Show details modal
          showNeuronDetails(node.sourceNeuron);
          
          // If shift-click, focus camera on this neuron and highlight connections
          if (event?.shiftKey) {
            focusOnNeuron(node);
          }
        }
      })
      .onNodeRightClick((node) => {
        if (node.kind === 'neuron') {
          focusOnNeuron(node);
        }
      });

    const controls = neuralGraph3D.controls();
    if (controls) {
      controls.autoRotate = false;
      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.rotateSpeed = 0.35;
      controls.zoomSpeed = 1.0;
      controls.panSpeed = 0.6;
      controls.minDistance = 110;
    }

    const updateSize = () => {
      const { clientWidth, clientHeight } = container;
      neuralGraph3D.width(clientWidth);
      neuralGraph3D.height(clientHeight);
    };

    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      neuralGraphResizeObserver = new ResizeObserver(updateSize);
      neuralGraphResizeObserver.observe(container);
    } else {
      window.addEventListener('resize', updateSize);
    }

    neuralGraph3D.cameraPosition({ x: 0, y: 0, z: 720 });
  }

  neuralGraph3D.graphData(neuralGraphData);
  neuralGraph3D.refresh();

  updateNeuralStats();
  updateNeuralEvents();
}

function formatNeuronTooltip(node) {
  if (node.kind !== 'neuron') return node.label;
  const activation = node.sourceNeuron?.currentActivation ?? 0;
  const threshold = node.activationThreshold ?? 1;
  return [
    `Neuron ${node.label}`,
    `Region: ${node.regionName}`,
    `Type: ${node.neuronType}`,
    `Connections: ${node.connectionCount}`,
    `Activation: ${activation.toFixed(2)} / ${threshold}`,
    '',
    'Click to view details',
    'Right-click or Shift+Click to focus'
  ].join('\n');
}

function moveCameraToNeuron(nodeObj, { distance = 280, duration = 950 } = {}) {
  if (!neuralGraph3D || !nodeObj) return;
  const target = {
    x: nodeObj.x || 0,
    y: nodeObj.y || 0,
    z: nodeObj.z || 0,
  };
  const distRatio = 1 + distance / Math.max(1, Math.hypot(target.x, target.y, target.z));
  neuralGraph3D.cameraPosition(
    { x: target.x * distRatio, y: target.y * distRatio, z: target.z * distRatio },
    nodeObj,
    duration
  );
}

function autoFocusNeuron(neuronId, options = {}) {
  if (!neuronId) return;
  const nodeObj = neuralNodeIndex.get(neuronId);
  if (!nodeObj) return;
  moveCameraToNeuron(nodeObj, options);
}

function focusOnNeuron(node) {
  if (!neuralGraph3D || !neuralGraphData) return;
  
  // Get node position
  const nodeObj = neuralGraphData.nodes.find(n => n.id === node.id);
  if (!nodeObj) return;
  
  // Reset all node and link highlighting
  neuralGraphData.nodes.forEach(n => {
    const region = neuralState?.regions?.find(r => r.regionId === n.regionId);
    n.color = region?.color || '#888888';
    n.displaySize = n.baseSize || 10;
  });
  
  neuralGraphData.links.forEach(link => {
    link.highlight = false;
    link.color = 'rgba(140, 162, 255, 0.15)';
    link.width = Math.max(0.35, (link.weight || 0.5) * 0.5);
  });
  
  // Highlight the focused neuron
  nodeObj.color = '#ffe082';
  nodeObj.displaySize = (nodeObj.baseSize || 10) * 2;
  
  // Highlight connected neurons and links
  const connectedNodeIds = new Set();
  neuralGraphData.links.forEach(link => {
    const sourceId = link.source.id || link.source;
    const targetId = link.target.id || link.target;
    
    if (sourceId === node.id || targetId === node.id) {
      link.highlight = true;
      link.color = 'rgba(255, 224, 130, 0.8)';
      link.width = (link.weight || 0.5) * 3;
      
      // Track connected nodes
      if (sourceId === node.id) connectedNodeIds.add(targetId);
      if (targetId === node.id) connectedNodeIds.add(sourceId);
    }
  });
  
  // Highlight connected neurons
  neuralGraphData.nodes.forEach(n => {
    if (connectedNodeIds.has(n.id)) {
      n.color = '#a0c4ff'; // Light blue for connected
      n.displaySize = (n.baseSize || 10) * 1.3;
    }
  });
  
  // Update graph
  neuralGraph3D.graphData(neuralGraphData);
  
  // Camera animation to focus on node
  const distance = 300;
  const distRatio = 1 + distance / Math.hypot(nodeObj.x || 0, nodeObj.y || 0, nodeObj.z || 0);
  
  neuralGraph3D.cameraPosition(
    { 
      x: (nodeObj.x || 0) * distRatio, 
      y: (nodeObj.y || 0) * distRatio, 
      z: (nodeObj.z || 0) * distRatio 
    },
    nodeObj, // lookAt
    1000 // ms transition duration
  );
}

function scheduleNeuralGraphRefresh() {
  if (!neuralGraph3D) return;
  if (neuralGraphRefreshRaf) return;
  neuralGraphRefreshRaf = requestAnimationFrame(() => {
    neuralGraphRefreshRaf = null;
    neuralGraph3D.refresh();
  });
}

// LEGACY SVG-BASED FUNCTIONS - No longer used with vis.js visualization
// Kept for reference only

/*
// Render neurons within a region with proper clustering
function renderNeuronsInRegion(regionGroup, region) {
  const neurons = region.neurons || [];
  const maxVisible = 20; // Limit visible neurons for performance
  const visibleNeurons = neurons.slice(0, maxVisible);
  
  // Create clusters based on neuron types
  const excitatory = visibleNeurons.filter(n => n.type === 'excitatory');
  const inhibitory = visibleNeurons.filter(n => n.type === 'inhibitory');
  
  // Position neurons in organic clusters
  const clusterPositions = generateClusterPositions(region.size, excitatory.length, inhibitory.length);
  
  // Draw excitatory neurons (larger, brighter)
  excitatory.forEach((neuron, index) => {
    if (index < clusterPositions.excitatory.length) {
      const pos = clusterPositions.excitatory[index];
      const circle = createNeuronElement(neuron, pos, region.color, 'excitatory');
      regionGroup.appendChild(circle);
    }
  });
  
  // Draw inhibitory neurons (smaller, different color)
  inhibitory.forEach((neuron, index) => {
    if (index < clusterPositions.inhibitory.length) {
      const pos = clusterPositions.inhibitory[index];
      const circle = createNeuronElement(neuron, pos, region.color, 'inhibitory');
      regionGroup.appendChild(circle);
    }
  });
}

// Generate organic cluster positions for neurons
function generateClusterPositions(regionSize, excitatoryCount, inhibitoryCount) {
  const padding = 20;
  const width = regionSize.width - 2 * padding;
  const height = regionSize.height - 2 * padding;
  
  const positions = {
    excitatory: [],
    inhibitory: []
  };
  
  // Generate excitatory positions in main cluster
  for (let i = 0; i < excitatoryCount && i < 15; i++) {
    const angle = (i / excitatoryCount) * 2 * Math.PI;
    const radius = Math.random() * Math.min(width, height) * 0.3;
    const x = padding + width/2 + Math.cos(angle) * radius;
    const y = padding + height/2 + Math.sin(angle) * radius;
    positions.excitatory.push({ x, y });
  }
  
  // Generate inhibitory positions around edges
  for (let i = 0; i < inhibitoryCount && i < 5; i++) {
    const x = padding + Math.random() * width;
    const y = padding + Math.random() * height;
    positions.inhibitory.push({ x, y });
  }
  
  return positions;
}

// Create individual neuron SVG element
function createNeuronElement(neuron, position, regionColor, type) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', position.x);
  circle.setAttribute('cy', position.y);
  circle.setAttribute('r', type === 'excitatory' ? '4' : '2.5');
  circle.setAttribute('fill', regionColor);
  circle.setAttribute('opacity', type === 'excitatory' ? '0.8' : '0.6');
  circle.setAttribute('stroke', '#ffffff');
  circle.setAttribute('stroke-width', '0.5');
  circle.classList.add('neuron-node', `neuron-${type}`);
  circle.setAttribute('data-neuron-id', neuron.id);
  
  // Add click handler for neuron details
  circle.addEventListener('click', (e) => {
    e.stopPropagation();
    showNeuronDetails(neuron);
  });
  
  // Add hover effects
  circle.addEventListener('mouseenter', () => {
    circle.setAttribute('r', type === 'excitatory' ? '6' : '4');
    circle.setAttribute('opacity', '1');
  });
  
  circle.addEventListener('mouseleave', () => {
    circle.setAttribute('r', type === 'excitatory' ? '4' : '2.5');
    circle.setAttribute('opacity', type === 'excitatory' ? '0.8' : '0.6');
  });
  
  circle.style.cursor = 'pointer';
  
  return circle;
}

// Render connections between brain regions
function renderInterRegionConnections(svg, regions) {
  const connectionPairs = [
    ['sensory-input', 'language-center'],
    ['sensory-input', 'association-cortex'],
    ['language-center', 'association-cortex'],
    ['language-center', 'motor-output'],
    ['association-cortex', 'frontal-lobe'],
    ['association-cortex', 'memory-systems'],
    ['association-cortex', 'amygdala'],
    ['frontal-lobe', 'motor-output'],
    ['amygdala', 'frontal-lobe'],
    ['memory-systems', 'association-cortex']
  ];
  
  connectionPairs.forEach(([fromId, toId]) => {
    const fromRegion = regions.find(r => r.regionId === fromId);
    const toRegion = regions.find(r => r.regionId === toId);
    
    if (fromRegion && toRegion) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', fromRegion.position.x + fromRegion.size.width / 2);
      line.setAttribute('y1', fromRegion.position.y + fromRegion.size.height / 2);
      line.setAttribute('x2', toRegion.position.x + toRegion.size.width / 2);
      line.setAttribute('y2', toRegion.position.y + toRegion.size.height / 2);
      line.setAttribute('stroke', '#2a306b');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-opacity', '0.3');
      line.setAttribute('stroke-dasharray', '5,5');
      line.classList.add('inter-region-connection');
      svg.appendChild(line);
    }
  });
}
*/


// Update neural stats
function updateNeuralStats() {
  if (!neuralState || !neuralState.metrics) return;
  
  $('#neural-total').textContent = neuralState.metrics.totalNeurons || 0;
  $('#neural-firings').textContent = neuralState.metrics.totalFirings || 0;
  $('#neural-most-active').textContent = formatRegionName(neuralState.metrics.mostActiveRegion) || '—';
  
  // Update summary
  $('#neural-summary').textContent = `Neurons: ${neuralState.metrics.totalNeurons || 0} · Regions: 7 · Firings: ${neuralState.metrics.totalFirings || 0}`;
}

// Update neural events list
function updateNeuralEvents() {
  const eventList = $('#neural-event-list');
  if (!eventList) return;

  eventList.innerHTML = '';

  if (!neuralActivityFeed.length) {
    eventList.innerHTML = '<div class="event-empty">No recent neural activity.</div>';
    return;
  }

  const recentEntries = neuralActivityFeed.slice(-10).reverse();
  recentEntries.forEach((entry) => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('event-item');
    wrapper.dataset.activityId = entry.id;

    if (entry.type === 'neuron-fire') wrapper.classList.add('event-type-fire');
    if (entry.type === 'connection-signal') wrapper.classList.add('event-type-signal');
    if (entry.type === 'neural-growth') wrapper.classList.add('event-type-growth');

    const timeLabel = formatTimeAgo(entry.timestamp);
    const typeLabel = entry.type === 'neuron-fire' ? 'Neuron Fire'
      : entry.type === 'connection-signal' ? 'Signal'
      : entry.type === 'neural-growth' ? 'Growth'
      : 'Event';

    const intensityBadge = entry.type === 'neuron-fire'
      ? `<span class="event-badge intensity">${entry.intensityIcon || '•'} ${entry.intensityLabel || 'baseline'}</span>`
      : '';

    const metaChips = [];
    if (entry.regionName) {
      metaChips.push(`<span class="event-chip region">Region: ${entry.regionName}</span>`);
    }
    if (entry.type === 'neuron-fire') {
      metaChips.push(`<span class="event-chip strength">Intensity: ${(entry.intensity ?? 0).toFixed(2)}</span>`);
    }
    if (entry.type === 'connection-signal') {
      const strength = describeIntensityLevel(entry.signal);
      metaChips.push(`<span class="event-chip strength">${strength.icon} ${strength.label}</span>`);
    }
    if (entry.connections?.length) {
      metaChips.push(`<span class="event-chip cascade">${entry.connections.length} downstream</span>`);
    }
    if (entry.type === 'neural-growth') {
      metaChips.push(`<span class="event-chip growth">+${entry.newNeurons || 0} neurons</span>`);
      metaChips.push(`<span class="event-chip level">Level ${entry.level || 0}</span>`);
    }

    let connectionsHtml = '';
    if (entry.connections?.length) {
      const preview = entry.connections.slice(0, 4).map((conn) => {
        const strength = describeIntensityLevel(conn.signal);
        const targetRegion = conn.toRegionName || formatRegionName(conn.toRegionId);
        return `<span class="connection-chip">→ ${targetRegion} <small>${strength.label}</small></span>`;
      }).join('');
      const remaining = entry.connections.length - 4;
      connectionsHtml = `
        <div class="event-connections">
          ${preview}
          ${remaining > 0 ? `<span class="connection-chip more">+${remaining} more</span>` : ''}
        </div>
      `;
    }

    const canReplay = entry.type === 'neuron-fire' || entry.type === 'connection-signal';
    const actionsHtml = canReplay
      ? `<div class="event-actions"><button type="button" class="event-replay" data-activity-id="${entry.id}">Replay</button></div>`
      : '';

    wrapper.innerHTML = `
      <div class="event-header">
        <div class="event-title">
          <span class="event-type">${typeLabel}</span>
          <span class="event-summary">${entry.summary || 'Activity detected.'}</span>
        </div>
        <div class="event-time">${timeLabel}</div>
      </div>
      <div class="event-body">
        ${intensityBadge}
        ${metaChips.length ? `<div class="event-meta">${metaChips.join('')}</div>` : ''}
        ${connectionsHtml}
      </div>
      ${actionsHtml}
    `;

    const replayBtn = wrapper.querySelector('.event-replay');
    if (replayBtn) {
      replayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = replayBtn.dataset.activityId;
        replayNeuralActivity(id);
      });
    }

    eventList.appendChild(wrapper);
  });
}

// Format region ID to readable name
function formatRegionName(regionId) {
  if (!regionId) return 'Unknown region';
  return regionId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Show detailed neuron information modal
function showNeuronDetails(neuron) {
  const modal = document.createElement('div');
  modal.className = 'neuron-modal';
  modal.innerHTML = `
    <div class="neuron-modal-content">
      <div class="neuron-modal-header">
        <h3>Neuron Details: ${neuron.id}</h3>
        <button class="neuron-modal-close">×</button>
      </div>
      <div class="neuron-modal-body">
        <div class="neuron-detail-row">
          <strong>Type:</strong> ${neuron.type || 'Unknown'}
        </div>
        <div class="neuron-detail-row">
          <strong>Activation Threshold:</strong> ${(neuron.activationThreshold || 0).toFixed(2)}
        </div>
        <div class="neuron-detail-row">
          <strong>Current Activation:</strong> ${(neuron.currentActivation || 0).toFixed(2)}
        </div>
        <div class="neuron-detail-row">
          <strong>Connections:</strong> ${neuron.connections ? neuron.connections.length : 0}
        </div>
        <div class="neuron-detail-row">
          <strong>Firing History:</strong> ${neuron.firingHistory ? neuron.firingHistory.length : 0} events
        </div>
        <div class="neuron-detail-row">
          <strong>Developed at Level:</strong> ${neuron.developedAtLevel || 0}
        </div>
        <div class="neuron-actions">
          <button class="neuron-trigger-btn" data-neuron-id="${neuron.id}">
            ⚡ Trigger (Cost: 2 CP)
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Add event listeners
  const closeBtn = modal.querySelector('.neuron-modal-close');
  const triggerBtn = modal.querySelector('.neuron-trigger-btn');
  
  closeBtn.addEventListener('click', () => modal.remove());
  triggerBtn.addEventListener('click', () => triggerNeuronManually(neuron.id));
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Select and highlight a brain region
function selectRegion(region) {
  // Remove previous selection
  document.querySelectorAll('.region-group').forEach(g => {
    g.classList.remove('selected');
  });
  
  // Highlight selected region
  const regionGroup = document.querySelector(`g[data-region="${region.regionId}"]`);
  if (regionGroup) {
    regionGroup.classList.add('selected');
    
    // Show region details
    showRegionDetails(region);
  }
}

// Show region details panel
function showRegionDetails(region) {
  const sidebar = document.querySelector('.neural-sidebar');
  if (!sidebar) return;
  
  // Create or update region details section
  let detailsSection = sidebar.querySelector('.region-details');
  if (!detailsSection) {
    detailsSection = document.createElement('div');
    detailsSection.className = 'region-details';
    sidebar.appendChild(detailsSection);
  }
  
  detailsSection.innerHTML = `
    <h4>Selected Region</h4>
    <div class="region-detail-card">
      <h5 style="color: ${region.color}">${region.regionName}</h5>
      <div class="region-stat">
        <strong>Neurons:</strong> ${region.neurons ? region.neurons.length : 0}
      </div>
      <div class="region-stat">
        <strong>Activity Level:</strong> ${(region.activityLevel || 0).toFixed(2)}
      </div>
      <div class="region-stat">
        <strong>Developed at Level:</strong> ${region.developedAtLevel || 0}
      </div>
      <div class="region-actions">
        <button class="region-trigger-btn" data-region-id="${region.regionId}">
          🧠 Activate Region (Cost: 5 CP)
        </button>
      </div>
    </div>
  `;
  
  // Add event listener to the trigger button
  const triggerBtn = detailsSection.querySelector('.region-trigger-btn');
  if (triggerBtn) {
    triggerBtn.addEventListener('click', () => triggerRegionActivity(region.regionId));
  }
}

// Manual Neural Triggering Functions
async function triggerNeuronManually(neuronId) {
  try {
    // Check if user has enough CP
    const stats = await getStats();
    if (stats.cp < 2) {
      alert('Not enough CP! You need 2 CP to trigger a neuron.');
      return;
    }
    
    // Confirm action
    if (!confirm(`Trigger neuron ${neuronId} for 2 CP?`)) {
      return;
    }
    
    // Send trigger request via WebSocket
    if (neuralSocket && neuralSocket.readyState === WebSocket.OPEN) {
      neuralSocket.send(JSON.stringify({
        action: 'triggerNeuron',
        neuronId: neuronId,
        cost: 2
      }));
      
      // Refresh stats to show CP deduction
      setTimeout(() => refreshStats(), 500);
      
      // Show feedback
      showTriggerFeedback(`Neuron ${neuronId} triggered!`);
    } else {
      alert('Neural connection not available. Please refresh the page.');
    }
  } catch (err) {
    console.error('Failed to trigger neuron:', err);
    alert('Failed to trigger neuron. Please try again.');
  }
}

async function triggerRegionActivity(regionId) {
  try {
    // Check if user has enough CP
    const stats = await getStats();
    if (stats.cp < 5) {
      alert('Not enough CP! You need 5 CP to activate a region.');
      return;
    }
    
    // Confirm action
    if (!confirm(`Activate ${formatRegionName(regionId)} region for 5 CP?`)) {
      return;
    }
    
    // Send region activation request
    if (neuralSocket && neuralSocket.readyState === WebSocket.OPEN) {
      neuralSocket.send(JSON.stringify({
        action: 'triggerRegion',
        regionId: regionId,
        cost: 5
      }));
      
      // Refresh stats to show CP deduction
      setTimeout(() => refreshStats(), 500);
      
      // Show feedback
      showTriggerFeedback(`${formatRegionName(regionId)} region activated!`);
    } else {
      alert('Neural connection not available. Please refresh the page.');
    }
  } catch (err) {
    console.error('Failed to trigger region:', err);
    alert('Failed to trigger region. Please try again.');
  }
}

// Show visual feedback for manual triggers
function showTriggerFeedback(message) {
  const feedback = document.createElement('div');
  feedback.className = 'neural-trigger-feedback';
  feedback.textContent = message;
  feedback.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #66bb6a;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: bold;
    z-index: 1000;
    animation: fadeInOut 3s ease-in-out forwards;
  `;
  
  document.body.appendChild(feedback);
  
  // Remove after animation
  setTimeout(() => {
    if (feedback.parentNode) {
      feedback.parentNode.removeChild(feedback);
    }
  }, 3000);
}

// Wire up refresh button
function setupNeuralRefresh() {
  const btn = $('#refresh-neural');
  if (btn) {
    btn.addEventListener('click', refreshNeuralNetwork);
  }
}

// Wire up neural search and filter controls
function setupNeuralSearchAndFilters() {
  const searchInput = $('#neural-search-input');
  const clearBtn = $('#neural-search-clear');
  const filterExcitatory = $('#filter-excitatory');
  const filterInhibitory = $('#filter-inhibitory');
  const regionFilter = $('#region-filter');
  
  // Store original graph data for filtering
  let originalNodes = [];
  let originalLinks = [];
  
  // Highlight matching neurons on search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      applyNeuralFilters();
    });
  }
  
  // Clear search
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        applyNeuralFilters();
        searchInput.focus();
      }
    });
  }
  
  // Filter by neuron type
  if (filterExcitatory) {
    filterExcitatory.addEventListener('change', applyNeuralFilters);
  }
  if (filterInhibitory) {
    filterInhibitory.addEventListener('change', applyNeuralFilters);
  }
  
  // Filter by region
  if (regionFilter) {
    regionFilter.addEventListener('change', applyNeuralFilters);
  }
}

function applyNeuralFilters() {
  if (!neuralGraph3D || !neuralGraphData) return;
  
  const searchInput = $('#neural-search-input');
  const filterExcitatory = $('#filter-excitatory');
  const filterInhibitory = $('#filter-inhibitory');
  const regionFilter = $('#region-filter');
  
  const query = searchInput?.value.toLowerCase().trim() || '';
  const showExcitatory = filterExcitatory?.checked ?? true;
  const showInhibitory = filterInhibitory?.checked ?? true;
  const selectedRegion = regionFilter?.value || 'all';
  
  // Filter nodes
  const filteredNodes = neuralGraphData.nodes.filter(node => {
    // Type filter
    if (node.neuronType === 'excitatory' && !showExcitatory) return false;
    if (node.neuronType === 'inhibitory' && !showInhibitory) return false;
    
    // Region filter
    if (selectedRegion !== 'all') {
      const regionMap = {
        'sensory': 'Sensory Input',
        'language': 'Language Center',
        'association': 'Association Cortex',
        'frontal': 'Frontal Lobe',
        'amygdala': 'Amygdala',
        'memory': 'Memory Systems',
        'motor': 'Motor Output'
      };
      if (node.regionName !== regionMap[selectedRegion]) return false;
    }
    
    return true;
  });
  
  // Create Set of visible node IDs
  const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
  
  // Filter links to only show connections between visible nodes
  const filteredLinks = neuralGraphData.links.filter(link => {
    return visibleNodeIds.has(link.source.id || link.source) && 
           visibleNodeIds.has(link.target.id || link.target);
  });
  
  // Apply search highlighting
  if (query) {
    filteredNodes.forEach(node => {
      const label = node.label?.toLowerCase() || '';
      const regionName = node.regionName?.toLowerCase() || '';
      const pattern = node.sourceNeuron?.pattern?.toLowerCase() || '';
      
      const matches = label.includes(query) || 
                     regionName.includes(query) || 
                     pattern.includes(query);
      
      if (matches) {
        // Highlight matching nodes
        node.color = '#ffe082'; // Bright yellow
        node.displaySize = (node.baseSize || 10) * 1.5;
        
        // Highlight connections from matching nodes
        filteredLinks.forEach(link => {
          if ((link.source.id || link.source) === node.id || 
              (link.target.id || link.target) === node.id) {
            link.highlight = true;
            link.color = 'rgba(255, 224, 130, 0.6)';
            link.width = (link.weight || 0.5) * 2;
          }
        });
      } else {
        // Dim non-matching nodes
        node.color = node.sourceNeuron?.region?.color || node.regionColor || '#888888';
        node.displaySize = (node.baseSize || 10) * 0.7;
      }
    });
    
    // Reset non-highlighted links
    filteredLinks.forEach(link => {
      if (!link.highlight) {
        link.color = 'rgba(140, 162, 255, 0.15)';
        link.width = (link.weight || 0.5) * 0.5;
      }
    });
  } else {
    // Reset all styling when no search
    filteredNodes.forEach(node => {
      const region = neuralState?.regions?.find(r => r.regionId === node.regionId);
      node.color = region?.color || '#888888';
      node.displaySize = node.baseSize || 10;
    });
    
    filteredLinks.forEach(link => {
      link.highlight = false;
      link.color = 'rgba(140, 162, 255, 0.32)';
      link.width = Math.max(0.35, (link.weight || 0.5) * 0.9);
    });
  }
  
  // Update graph with filtered data
  neuralGraph3D.graphData({ nodes: filteredNodes, links: filteredLinks });
  
  // Update summary
  const summary = $('#neural-summary');
  if (summary) {
    const totalFirings = neuralState?.regions?.reduce((sum, r) => 
      sum + (r.neurons?.reduce((s, n) => s + (n.firingCount || 0), 0) || 0), 0) || 0;
    summary.textContent = `Neurons: ${filteredNodes.length} · Regions: ${neuralState?.regions?.length || 0} · Firings: ${totalFirings}`;
  }
}

// Wire up brain graph search and filter controls
function setupBrainSearchAndFilters() {
  const searchInput = $('#brain-search-input');
  const clearBtn = $('#brain-search-clear');
  const minFreqSlider = $('#filter-min-freq');
  const freqValueDisplay = $('#filter-freq-value');
  const showIsolatedCheckbox = $('#filter-show-isolated');
  const categoryFilter = $('#concept-category-filter');
  
  // Update frequency value display
  if (minFreqSlider && freqValueDisplay) {
    minFreqSlider.addEventListener('input', (e) => {
      freqValueDisplay.textContent = e.target.value;
      applyBrainFilters();
    });
  }
  
  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', applyBrainFilters);
  }
  
  // Clear search
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        applyBrainFilters();
        searchInput.focus();
      }
    });
  }
  
  // Show isolated nodes checkbox
  if (showIsolatedCheckbox) {
    showIsolatedCheckbox.addEventListener('change', applyBrainFilters);
  }
  
  // Category filter
  if (categoryFilter) {
    categoryFilter.addEventListener('change', applyBrainFilters);
  }
}

function applyBrainFilters() {
  if (!brainGraph3D || !brainGraphData) return;
  
  const searchInput = $('#brain-search-input');
  const minFreqSlider = $('#filter-min-freq');
  const showIsolatedCheckbox = $('#filter-show-isolated');
  const categoryFilter = $('#concept-category-filter');
  
  const query = searchInput?.value.toLowerCase().trim() || '';
  const minFreq = parseInt(minFreqSlider?.value || '1', 10);
  const showIsolated = showIsolatedCheckbox?.checked ?? true;
  const category = categoryFilter?.value || 'all';
  
  // Calculate node connection counts
  const connectionCounts = new Map();
  brainGraphData.links.forEach(link => {
    const sourceId = link.source.id || link.source;
    const targetId = link.target.id || link.target;
    connectionCounts.set(sourceId, (connectionCounts.get(sourceId) || 0) + 1);
    connectionCounts.set(targetId, (connectionCounts.get(targetId) || 0) + 1);
  });
  
  // Filter nodes
  const filteredNodes = brainGraphData.nodes.filter(node => {
    // Frequency filter
    if (node.value < minFreq) return false;
    
    // Isolated nodes filter
    const connectionCount = connectionCounts.get(node.id) || 0;
    if (!showIsolated && connectionCount === 0) return false;
    
    // Category filter
    if (category === 'high-freq' && node.value < 10) return false;
    if (category === 'recent' && node.concept && !node.concept.lastMentionedAt) return false;
    if (category === 'connected' && connectionCount < 5) return false;
    
    return true;
  });
  
  // Create Set of visible node IDs
  const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
  
  // Filter links to only show connections between visible nodes
  const filteredLinks = brainGraphData.links.filter(link => {
    const sourceId = link.source.id || link.source;
    const targetId = link.target.id || link.target;
    return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
  });
  
  // Apply search highlighting
  if (query) {
    filteredNodes.forEach(node => {
      const label = node.label?.toLowerCase() || '';
      const category = node.concept?.category?.toLowerCase() || '';
      const matches = label.includes(query) || category.includes(query);
      
      if (matches) {
        // Highlight matching nodes
        node.color = '#ffe082';
        node.displaySize = (node.displaySize || 5) * 1.8;
        
        // Highlight connections from matching nodes
        filteredLinks.forEach(link => {
          const sourceId = link.source.id || link.source;
          const targetId = link.target.id || link.target;
          if (sourceId === node.id || targetId === node.id) {
            link.color = 'rgba(255, 224, 130, 0.7)';
            link.width = (link.width || 1) * 2;
          }
        });
      } else {
        // Dim non-matching nodes
        const originalColor = node.group === 'concept' 
          ? (node.concept?.sentiment?.label === 'positive' ? '#66bb6a' 
            : node.concept?.sentiment?.label === 'negative' ? '#ef5350' 
            : '#ffb74d')
          : '#6f86ff';
        node.color = originalColor;
        node.displaySize = (node.displaySize || 5) * 0.6;
      }
    });
    
    // Reset non-highlighted links
    filteredLinks.forEach(link => {
      if (link.color !== 'rgba(255, 224, 130, 0.7)') {
        link.color = link.weight >= 4 ? 'rgba(142, 166, 255, 0.3)' : 'rgba(57, 69, 128, 0.25)';
      }
    });
  } else {
    // Reset all styling when no search
    filteredNodes.forEach(node => {
      const originalColor = node.group === 'concept'
        ? (node.concept?.sentiment?.label === 'positive' ? '#66bb6a'
          : node.concept?.sentiment?.label === 'negative' ? '#ef5350'
          : '#ffb74d')
        : '#6f86ff';
      node.color = originalColor;
      node.displaySize = Math.max(3.5, Math.log((node.value || 1) + 1) * 4.5);
    });
    
    filteredLinks.forEach(link => {
      link.color = link.weight >= 4 ? '#8ea6ff' : '#394580';
      link.width = Math.max(0.4, Math.log((link.weight || 1) + 1));
    });
  }
  
  // Update graph with filtered data
  brainGraph3D.graphData({ nodes: filteredNodes, links: filteredLinks });
  
  // Update summary
  const summary = $('#brain-summary');
  if (summary) {
    const totalMemories = brainGraphData.nodes.filter(n => n.concept).length;
    summary.textContent = `Nodes: ${filteredNodes.length} · Links: ${filteredLinks.length} · Memories: ${totalMemories}`;
  }
}

// Wire up collapsible info box
function setupCollapsibleInfo() {
  const header = document.querySelector('.brain-info .collapsible-header');
  const content = document.querySelector('.brain-info .collapsible-content');
  const btn = document.querySelector('.brain-info .collapse-btn');
  
  if (header && content && btn) {
    header.addEventListener('click', () => {
      const isCollapsed = content.classList.contains('collapsed');
      if (isCollapsed) {
        content.classList.remove('collapsed');
        btn.textContent = '−';
      } else {
        content.classList.add('collapsed');
        btn.textContent = '+';
      }
    });
  }
}

// Wire up memory search
function setupMemorySearch() {
  const searchInput = $('#memory-search-input');
  const memoryList = $('#memory-list');
  
  if (searchInput && memoryList) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const memoryItems = memoryList.querySelectorAll('.memory-item');
      
      memoryItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (!query || text.includes(query)) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }
}

function setupNeuralPlaybackControls() {
  const zoomToggle = $('#neural-zoom-toggle');
  if (zoomToggle) {
    const saved = localStorage.getItem('mypal_neural_auto_zoom');
    if (saved !== null) {
      neuralPlaybackState.autoZoom = saved === '1';
    }
    zoomToggle.checked = neuralPlaybackState.autoZoom;
    zoomToggle.addEventListener('change', (e) => {
      neuralPlaybackState.autoZoom = !!e.target.checked;
      localStorage.setItem('mypal_neural_auto_zoom', neuralPlaybackState.autoZoom ? '1' : '0');
      logInfo('NEURAL', 'Auto-zoom preference updated', { enabled: neuralPlaybackState.autoZoom });
    });
  }

  const menuButton = $('#neural-playback-menu');
  const dropdown = $('#neural-playback-dropdown');
  const stopButton = $('#neural-stop-playback');

  if (menuButton && dropdown) {
    neuralPlaybackState.playbackButton = menuButton;
    const toggleDropdown = (forceHide = false) => {
      if (forceHide) {
        dropdown.classList.add('hidden');
        menuButton.classList.remove('active');
        return;
      }
      dropdown.classList.toggle('hidden');
      menuButton.classList.toggle('active', !dropdown.classList.contains('hidden'));
    };

    menuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    dropdown.querySelectorAll('button[data-playback]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.playback || 'latest';
        toggleDropdown(true);
        playNeuralTimeline(mode);
      });
    });

    stopButton?.addEventListener('click', () => {
      toggleDropdown(true);
      stopNeuralTimeline();
    });

    if (!neuralPlaybackState.dropdownListener) {
      neuralPlaybackState.dropdownListener = (event) => {
        if (dropdown.classList.contains('hidden')) return;
        const target = event.target;
        if (!dropdown.contains(target) && target !== menuButton) {
          dropdown.classList.add('hidden');
          menuButton.classList.remove('active');
        }
      };
      document.addEventListener('click', neuralPlaybackState.dropdownListener);
    }
  }
}

// ==============================================
// NEURAL NETWORK REGENERATION
// ==============================================

function showNeuralRegenModal() {
  const modal = $('#neural-regen-modal');
  if (modal) {
    modal.classList.remove('hidden');
    
    // Reset UI
    $('#neural-regen-progress').style.width = '0%';
    $('#neural-regen-percent').textContent = '0%';
    $('#neural-regen-message').textContent = 'Initializing...';
    $('#neural-regen-eta').textContent = 'Calculating time remaining...';
    $('#neural-regen-phase').textContent = 'Starting';
    $('#neural-regen-close').disabled = true;
  }
}

function hideNeuralRegenModal() {
  const modal = $('#neural-regen-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

async function startNeuralRegeneration() {
  showNeuralRegenModal();
  
  try {
    const response = await fetch(`${API_BASE}/neural/regenerate`, {
      method: 'POST',
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
    });
    
    if (!response.ok) {
      throw new Error('Failed to start regeneration');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        // Enable close button
        $('#neural-regen-close').disabled = false;
        break;
      }
      
      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            updateRegenProgress(data);
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  } catch (err) {
    console.error('Neural regeneration error:', err);
    $('#neural-regen-message').textContent = `Error: ${err.message}`;
    $('#neural-regen-eta').textContent = 'Failed to regenerate neural network';
    $('#neural-regen-close').disabled = false;
  }
}

function updateRegenProgress(data) {
  const { progress, message, phase, done } = data;
  
  // Update progress bar
  if (typeof progress === 'number') {
    $('#neural-regen-progress').style.width = `${progress}%`;
    $('#neural-regen-percent').textContent = `${Math.round(progress)}%`;
  }
  
  // Update message
  if (message) {
    $('#neural-regen-message').textContent = message;
  }
  
  // Update phase
  if (phase) {
    const phaseNames = {
      'init': 'Initialization',
      'growth': 'Network Growth',
      'memories': 'Processing Memories',
      'chatlog': 'Analyzing Conversations',
      'vocabulary': 'Learning Vocabulary',
      'pathways': 'Building Pathways',
      'finalize': 'Finalizing',
      'complete': 'Complete',
      'error': 'Error'
    };
    $('#neural-regen-phase').textContent = phaseNames[phase] || phase;
  }
  
  // Extract ETA from message if present
  const etaMatch = message?.match(/ETA:\s*(\d+)s/);
  if (etaMatch) {
    const seconds = parseInt(etaMatch[1]);
    if (seconds > 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      $('#neural-regen-eta').textContent = `Estimated time remaining: ${mins}m ${secs}s`;
    } else {
      $('#neural-regen-eta').textContent = `Estimated time remaining: ${seconds}s`;
    }
  } else if (progress >= 100 || done) {
    $('#neural-regen-eta').textContent = 'Complete!';
  }
  
  // If complete, enable close button and refresh neural view
  if (done || progress >= 100) {
    $('#neural-regen-close').disabled = false;
    
    // Auto-refresh neural network view after 1 second
    setTimeout(() => {
      refreshNeuralNetwork();
      connectNeuralSocket();
    }, 1000);
  }
}

function setupNeuralRegeneration() {
  const btn = $('#regenerate-neural');
  const closeBtn = $('#neural-regen-close');
  
  if (btn) {
    btn.addEventListener('click', () => {
      if (confirm('Regenerate neural network from existing memories and conversations?\n\nThis will rebuild the network based on your current level and history.')) {
        startNeuralRegeneration();
      }
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', hideNeuralRegenModal);
  }
}

// ==============================================
// FLOATING CHAT WINDOW
// ==============================================

let floatingChatOpen = false;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

function setupFloatingChat() {
  const floatingModal = $('#floating-chat-modal');
  const popOutBtn = $('#popout-chat-btn');
  const closeBtn = $('#close-floating-chat');
  const floatingForm = $('#floating-chat-form');
  const floatingInput = $('#floating-chat-input');
  const floatingWindow = $('#floating-chat-window');
  
  if (!floatingModal || !popOutBtn || !closeBtn) return;
  
  // Pop out button click
  popOutBtn.addEventListener('click', () => {
    floatingModal.classList.remove('hidden');
    floatingChatOpen = true;
    
    // Sync messages from main chat to floating
    syncMessagesToFloating();
    
    // Sync emotion display
    syncEmotionToFloating();
    
    // Focus the floating input
    floatingInput?.focus();
  });
  
  // Close button click
  closeBtn.addEventListener('click', () => {
    floatingModal.classList.add('hidden');
    floatingChatOpen = false;
  });
  
  // Make header draggable
  const header = $('.floating-chat-header');
  if (header) {
    header.addEventListener('mousedown', startDrag);
  }
  
  // Handle form submission from floating chat
  if (floatingForm) {
    floatingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = floatingInput.value.trim();
      if (!msg) return;
      
      lastUserMessage = msg;
      
      // Add message to both windows
      addMessage('user', msg);
      addFloatingMessage('user', msg);
      
      floatingInput.value = '';
      
      // Disable both inputs while waiting
      floatingInput.disabled = true;
      $('#chat-input').disabled = true;
      $('#chat-input').placeholder = 'Pal is thinking...';
      floatingInput.placeholder = 'Pal is thinking...';
      
      const indicator = showTyping();
      const floatingIndicator = showFloatingTyping();
      
      try {
        const res = await sendChat(msg);
        
        // Clear UI state before displaying response
        hideTyping(indicator);
        hideFloatingTyping(floatingIndicator);
        clearAllTypingIndicators();
        clearFloatingTypingIndicators();
        
        // Re-enable inputs before displaying message
        floatingInput.disabled = false;
        $('#chat-input').disabled = false;
        floatingInput.value = '';
        $('#chat-input').value = '';
        $('#chat-input').placeholder = 'Type a message...';
        floatingInput.placeholder = 'Type a message...';
        
        // NOW display the response
        const replyText = typeof res?.reply === 'string' ? res.reply : (res?.output ? String(res.output) : 'Unable to respond right now.');
        const meta = buildPalMeta(res);
        
        addMessage('pal', replyText, meta);
        addFloatingMessage('pal', replyText, meta);

        if (typeof res?.processingTimeMs === 'number') {
          logInfo('PERFORMANCE', `Floating chat response rendered`, { 
            processingTimeMs: Math.round(res.processingTimeMs)
          });
        }

        const floatingSummary = summarizeNeuralActivations(res?.neuralActivations);
        if (floatingSummary) {
          logDebug('NEURAL', 'Neural activation sequence applied (floating)', { neuralSummary: floatingSummary });
        }
        
        // Update emotion displays
        if (res?.emotion) {
          updateEmotionDisplay(res.emotion);
          updateFloatingEmotion(res.emotion);
        }
        
        const wasDirty = multiplierDirty;
        await refreshStats();
        multiplierDirty = wasDirty;
        if (journalLoaded) {
          await loadJournal(true);
        }
      } catch (e) {
        console.error('Chat error:', e);
        
        // Clear UI state before showing error
        hideTyping(indicator);
        hideFloatingTyping(floatingIndicator);
        clearAllTypingIndicators();
        clearFloatingTypingIndicators();
        
        // Re-enable inputs before error message
        floatingInput.disabled = false;
        $('#chat-input').disabled = false;
        floatingInput.value = '';
        $('#chat-input').value = '';
        $('#chat-input').placeholder = 'Type a message...';
        floatingInput.placeholder = 'Type a message...';
        
        let errorMsg = 'Sorry, I had trouble responding.';
        
        if (!backendHealthy) {
          errorMsg = 'Server not running. Please start the backend.';
          showStatusModal();
        } else if (e.message?.includes('fetch') || e.message?.includes('network')) {
          errorMsg = 'Network error. Please check your connection.';
        } else if (e.message?.includes('timeout')) {
          errorMsg = 'Response timed out. Please try again.';
        } else if (e.message?.includes('Chat failed')) {
          errorMsg = 'Unable to generate response. Please try again.';
        }
        
        addMessage('pal', errorMsg);
        addFloatingMessage('pal', errorMsg);
      } finally {
        // Final safety check
        clearAllTypingIndicators();
        clearFloatingTypingIndicators();
        floatingInput.focus();
      }
    });
  }
}

function startDrag(e) {
  isDragging = true;
  const modal = $('#floating-chat-modal');
  const rect = modal.getBoundingClientRect();
  
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  
  // Add dragging class for visual feedback
  modal.classList.add('dragging');
  
  // Use optimized event listeners
  document.addEventListener('mousemove', onDrag, { passive: true });
  document.addEventListener('mouseup', stopDrag);
  
  e.preventDefault();
}

function onDrag(e) {
  if (!isDragging) return;
  
  // Use requestAnimationFrame for smooth 60fps updates
  requestAnimationFrame(() => {
    const modal = $('#floating-chat-modal');
    if (!modal) return;
    
    let newX = e.clientX - dragOffsetX;
    let newY = e.clientY - dragOffsetY;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - modal.offsetWidth;
    const maxY = window.innerHeight - modal.offsetHeight;
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    // Use transform instead of top/left for better performance
    modal.style.transform = `translate(${newX}px, ${newY}px)`;
    modal.style.right = 'auto'; // Remove right positioning when dragging
  });
}

function stopDrag() {
  isDragging = false;
  const modal = $('#floating-chat-modal');
  if (modal) {
    modal.classList.remove('dragging');
  }
  
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

function syncMessagesToFloating() {
  const mainWindow = $('#chat-window');
  const floatingWindow = $('#floating-chat-window');
  
  if (!mainWindow || !floatingWindow) return;
  
  // Clear floating window
  floatingWindow.innerHTML = '';
  
  // Copy all messages from main to floating
  const messages = mainWindow.querySelectorAll('.msg');
  messages.forEach(msg => {
    const clone = msg.cloneNode(true);
    
    // Re-attach event listeners for feedback buttons
    const feedbackBtns = clone.querySelectorAll('.feedback-btn');
    feedbackBtns.forEach((btn, idx) => {
      const originalBtn = msg.querySelectorAll('.feedback-btn')[idx];
      const sentiment = originalBtn.classList.contains('thumbs-up') ? 'positive' : 'negative';
      const text = msg.querySelector('.bubble')?.textContent || '';
      const role = msg.classList.contains('user') ? 'user' : 'pal';
      
      btn.addEventListener('click', () => feedbackClick(btn, sentiment, text, role));
    });
    
    floatingWindow.appendChild(clone);
  });
  
  floatingWindow.scrollTop = floatingWindow.scrollHeight;
}

function syncEmotionToFloating() {
  const mainIcon = $('#emotion-icon');
  const mainMood = $('#emotion-mood');
  const floatingIcon = $('#emotion-icon-floating');
  const floatingMood = $('#emotion-mood-floating');
  
  if (mainIcon && floatingIcon) {
    floatingIcon.textContent = mainIcon.textContent;
  }
  
  if (mainMood && floatingMood) {
    floatingMood.textContent = mainMood.textContent;
  }
}

function updateFloatingEmotion(emotion) {
  if (!emotion) return;
  
  const icon = $('#emotion-icon-floating');
  const mood = $('#emotion-mood-floating');
  
  if (!icon || !mood) return;
  
  // Update icon
  icon.style.animation = 'none';
  setTimeout(() => {
    icon.textContent = emotion.expression || '😊';
    icon.style.animation = 'emotionPulse 2s ease-in-out infinite';
  }, 10);
  
  // Update mood text
  const moodText = `Pal is ${emotion.description || 'calm'}`;
  mood.textContent = moodText;
}

function addFloatingMessage(role, text, metaText) {
  const floatingWindow = $('#floating-chat-window');
  if (!floatingWindow) return;
  
  const wrap = document.createElement('div');
  wrap.className = `msg ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text && String(text).trim().length ? text : '?';
  
  // Timestamp tooltip
  try {
    const ts = new Date();
    bubble.title = ts.toLocaleString();
    wrap.dataset.ts = String(ts.getTime());
  } catch {}
  
  wrap.appendChild(bubble);
  
  if (metaText) {
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = metaText;
    wrap.appendChild(meta);
  }
  
  // Add feedback buttons
  const feedbackContainer = document.createElement('div');
  feedbackContainer.className = 'feedback-buttons';
  
  const thumbsUp = document.createElement('button');
  thumbsUp.className = 'feedback-btn thumbs-up';
  thumbsUp.title = 'Good response';
  thumbsUp.innerHTML = '👍';
  thumbsUp.addEventListener('click', () => feedbackClick(thumbsUp, 'positive', text, role));
  
  const thumbsDown = document.createElement('button');
  thumbsDown.className = 'feedback-btn thumbs-down';
  thumbsDown.title = 'Needs improvement';
  thumbsDown.innerHTML = '👎';
  thumbsDown.addEventListener('click', () => feedbackClick(thumbsDown, 'negative', text, role));
  
  feedbackContainer.appendChild(thumbsUp);
  feedbackContainer.appendChild(thumbsDown);
  wrap.appendChild(feedbackContainer);
  
  floatingWindow.appendChild(wrap);
  floatingWindow.scrollTop = floatingWindow.scrollHeight;
}

function showFloatingTyping() {
  const floatingWindow = $('#floating-chat-window');
  if (!floatingWindow) return null;
  
  // Clear any existing floating typing indicators first
  clearFloatingTypingIndicators();
  
  const wrap = document.createElement('div');
  wrap.className = 'msg pal typing';
  const bubble = document.createElement('div');
  bubble.className = 'bubble typing-bubble';
  bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  wrap.appendChild(bubble);
  
  floatingWindow.appendChild(wrap);
  floatingWindow.scrollTop = floatingWindow.scrollHeight;
  
  return wrap;
}

function hideFloatingTyping(el) {
  try { 
    if (el && el.parentElement) {
      el.parentElement.removeChild(el); 
    }
  } catch (err) {
    console.warn('Error removing floating typing indicator:', err);
  }
  
  // Additional cleanup
  clearFloatingTypingIndicators();
}

// Auto-close floating chat when Chat tab becomes active
function handleTabSwitch(tabName) {
  if (tabName === 'chat' && floatingChatOpen) {
    const floatingModal = $('#floating-chat-modal');
    if (floatingModal) {
      floatingModal.classList.add('hidden');
      floatingChatOpen = false;
    }
  }
}

// Modify switchTab function to handle floating chat
const originalSwitchTab = switchTab;
switchTab = function(name) {
  originalSwitchTab(name);
  handleTabSwitch(name);
};

// Start the application
init().then(() => {
  setupFloatingChat();
});

