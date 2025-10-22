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
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create profile');
    }
    
    return await res.json();
  } catch (err) {
    console.error('Error creating profile:', err);
    throw err;
  }
}

async function loadProfile(profileId) {
  try {
    const res = await apiFetch(`/profiles/${profileId}/load`, {
      method: 'POST'
    });
    
    if (!res.ok) throw new Error('Failed to load profile');
    
    const profile = await res.json();
    currentProfileId = profileId;
    localStorage.setItem('mypal_current_profile', profileId);
    
    // Update profile badge in header
    const profileBadge = $('#current-profile-name');
    if (profileBadge) {
      profileBadge.textContent = profile.name;
    }
    
    return profile;
  } catch (err) {
    console.error('Error loading profile:', err);
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

function renderProfileCards(profiles) {
  const container = $('#profile-cards');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!profiles || profiles.length === 0) {
    container.classList.add('hidden');
    return;
  }
  
  container.classList.remove('hidden');
  
  profiles.forEach(profile => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    
    const lastPlayed = profile.lastPlayedAt ? new Date(profile.lastPlayedAt).toLocaleDateString() : 'Never';
    
    card.innerHTML = `
      <div class="profile-card-header">
        <h3 class="profile-card-name">${profile.name}</h3>
        <button class="profile-card-delete" data-profile-id="${profile.id}" title="Delete profile">🗑️</button>
      </div>
      <div class="profile-card-stats">
        <div class="profile-stat">Level: <span class="profile-stat-value">${profile.level || 0}</span></div>
        <div class="profile-stat">XP: <span class="profile-stat-value">${profile.xp || 0}</span></div>
        <div class="profile-stat">Messages: <span class="profile-stat-value">${profile.messageCount || 0}</span></div>
        <div class="profile-stat">Memories: <span class="profile-stat-value">${profile.memoryCount || 0}</span></div>
      </div>
      <div class="profile-card-footer">Last played: ${lastPlayed}</div>
    `;
    
    // Click card to load profile
    card.addEventListener('click', async (e) => {
      if (e.target.classList.contains('profile-card-delete')) return;
      
      try {
        await loadProfile(profile.id);
        hideProfileMenu();
        await refreshStats();
      } catch (err) {
        alert(`Failed to load profile: ${err.message}`);
      }
    });
    
    // Delete button
    const deleteBtn = card.querySelector('.profile-card-delete');
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      if (!confirm(`Delete "${profile.name}"? This cannot be undone.`)) return;
      
      try {
        await deleteProfile(profile.id);
        await initProfileMenu();
      } catch (err) {
        alert(`Failed to delete profile: ${err.message}`);
      }
    });
    
    container.appendChild(card);
  });
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
  
  if (lastUsedId && profiles.length > 0) {
    const lastProfile = profiles.find(p => p.id === lastUsedId);
    if (lastProfile) {
      continueSection.classList.remove('hidden');
      continueName.textContent = lastProfile.name;
      
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
    }
  } else {
    continueSection.classList.add('hidden');
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
  
  renderProfileCards(profiles);
}

function wireProfileManagement() {
  const newPalBtn = $('#new-pal-btn');
  const loadPalBtn = $('#load-pal-btn');
  const newPalModal = $('#new-pal-modal');
  const newPalForm = $('#new-pal-form');
  const newPalCancel = $('#new-pal-cancel');
  const newPalName = $('#new-pal-name');
  const newPalError = $('#new-pal-error');
  
  newPalBtn?.addEventListener('click', () => {
    newPalModal.classList.remove('hidden');
    newPalName.value = '';
    // Ensure input is editable and focusable
    newPalName.removeAttribute('readonly');
    newPalName.removeAttribute('aria-disabled');
    newPalName.readOnly = false;
    newPalName.disabled = false;
    newPalError.classList.add('hidden');
    // Delay focus to ensure modal is rendered
    setTimeout(() => {
      try {
        // Prefer requestAnimationFrame for reliable caret placement
        requestAnimationFrame(() => {
          newPalName.focus({ preventScroll: true });
          // Select to ensure caret visibility
          newPalName.select();
        });
      } catch {
        newPalName.focus();
      }
    }, 50);
  });
  
  loadPalBtn?.addEventListener('click', async () => {
    const profileCards = $('#profile-cards');
    if (profileCards.classList.contains('hidden')) {
      // Show profile cards - reload to ensure fresh data
      const data = await loadProfilesList();
      if (data && data.profiles.length > 0) {
        renderProfileCards(data.profiles);
        setTimeout(() => {
          profileCards.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    } else {
      // Hide profile cards
      profileCards.classList.add('hidden');
    }
  });
  
  newPalCancel?.addEventListener('click', () => {
    newPalModal.classList.add('hidden');
  });
  
  newPalForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
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
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return res;
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
}

function switchTab(name) {
  const target = document.getElementById(`tab-${name}`);
  if (!target) {
    console.warn(`Tab "${name}" not found; ignoring switch request.`);
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
        const replyText = typeof res?.reply === 'string' ? res.reply : (res?.output ?? '�?�');
        const meta = 'Regenerated' + (res?.kind ? ` | Mode: ${res.kind}` : '');
        addMessage('pal', replyText, meta);
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
  if (typingEl && typingEl.isConnected) return typingEl;
  const wrap = document.createElement('div');
  wrap.className = 'msg pal typing';
  const bubble = document.createElement('div');
  bubble.className = 'bubble typing-bubble';
  bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  wrap.appendChild(bubble);
  const win = document.getElementById('chat-window');
  if (win) {
    win.appendChild(wrap);
    win.scrollTop = win.scrollHeight;
  }
  typingEl = wrap;
  return wrap;
}

function hideTyping(el = typingEl) {
  try { if (el && el.parentElement) el.parentElement.removeChild(el); } catch {}
  if (el === typingEl) typingEl = null;
}

async function sendChat(message) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const res = await apiFetch(`/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error('Chat failed');
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out after 30 seconds');
    }
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

function connectNeuralSocket() {
  if (neuralSocket && neuralSocket.readyState === WebSocket.OPEN) return;
  try {
    // Use localhost:3001 directly since we might be running in Electron with file:// protocol
    // Use secure WebSocket (wss://) when on HTTPS to prevent mixed content issues
    const wsUrl = window.location.protocol === 'file:' 
      ? 'ws://localhost:3001/neural-stream'
      : (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host.replace(/:\d+$/, ':3001') + '/neural-stream';
    neuralSocket = new WebSocket(wsUrl);
  } catch (e) {
    console.error('WebSocket connect error', e);
    return;
  }

  neuralSocket.addEventListener('open', () => {
    console.log('Neural socket open');
  });

  neuralSocket.addEventListener('message', (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (!data) return;
      if (data.type === 'neural-snapshot') {
        renderNeuralNetwork(data.payload);
        const summary = document.getElementById('neural-summary');
        if (summary) summary.textContent = `Neurons: ${data.payload.metrics.totalNeurons} · Regions: ${data.payload.regions.length} · Firings: ${data.payload.metrics.totalFirings}`;
      } else if (data.type === 'neural-event') {
        handleNeuralEvent(data.payload);
      }
    } catch (e) { console.error('Neural message error', e); }
  });

  neuralSocket.addEventListener('close', () => {
    console.log('Neural socket closed');
    neuralSocket = null;
  });
}

function handleNeuralEvent(event) {
  if (!event || !event.type) return;
  
  if (event.type === 'neuron-fire') {
    const neuronId = event.neuronId;
    // Extract region ID from neuron ID (format: region-xxx-neuron-yyy)
    const regionMatch = neuronId.match(/^(.+?)-neuron-\d+$/);
    const regionId = regionMatch ? regionMatch[1] : null;
    
    if (regionId) {
      // Find all neurons in this region and flash them
      const regionGroup = document.querySelector(`g[data-region='${regionId}']`);
      if (regionGroup) {
        const neurons = regionGroup.querySelectorAll('.neuron-node');
        neurons.forEach(neuron => {
          const origR = neuron.getAttribute('r') || '3';
          const origOpacity = neuron.getAttribute('opacity') || '0.6';
          neuron.setAttribute('r', parseFloat(origR) * 1.5);
          neuron.setAttribute('opacity', '1');
          setTimeout(() => {
            neuron.setAttribute('r', origR);
            neuron.setAttribute('opacity', origOpacity);
          }, 300);
        });
        
        // Also pulse the region background
        const rect = regionGroup.querySelector('rect');
        if (rect) {
          const origOpacity = rect.getAttribute('opacity') || '0.1';
          rect.setAttribute('opacity', '0.3');
          setTimeout(() => {
            rect.setAttribute('opacity', origOpacity);
          }, 300);
        }
      }
    }
  } else if (event.type === 'neural-growth') {
    // Handle neural growth animation
    showNeuralGrowthAnimation(event);
  }
}

// Show neural growth animation when leveling up
function showNeuralGrowthAnimation(growthEvent) {
  const { regionId, newNeurons, level } = growthEvent;
  
  // Show celebration notification
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
  
  // Animate the specific region
  const regionGroup = document.querySelector(`g[data-region='${regionId}']`);
  if (regionGroup) {
    // Pulse the region with growth effect
    const rect = regionGroup.querySelector('.region-background');
    if (rect) {
      rect.style.animation = 'neuralGrowthPulse 2s ease-out';
      rect.addEventListener('animationend', () => {
        rect.style.animation = '';
      });
    }
    
    // Animate new neurons appearing
    const neurons = regionGroup.querySelectorAll('.neuron-node');
    const lastNeurons = Array.from(neurons).slice(-newNeurons);
    
    lastNeurons.forEach((neuron, index) => {
      neuron.style.opacity = '0';
      neuron.style.transform = 'scale(0)';
      setTimeout(() => {
        neuron.style.transition = 'all 0.5s ease-out';
        neuron.style.opacity = '0.8';
        neuron.style.transform = 'scale(1)';
      }, index * 100 + 500);
    });
  }
  
  // Remove celebration after animation
  setTimeout(() => {
    if (celebration.parentNode) {
      celebration.parentNode.removeChild(celebration);
    }
  }, 4000);
  
  // Refresh neural visualization to show new structure
  setTimeout(() => {
    fetchNeuralSnapshot().then(snapshot => {
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
  const ctx = document.getElementById('personalityChart').getContext('2d');
  if (radarChart) radarChart.destroy();
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
  if (!container || typeof vis === 'undefined' || !vis.Network) return;
  const desc = document.getElementById('brain-description');
  if (!defaultBrainDescription && desc) {
    defaultBrainDescription = desc.textContent || '';
  }
  
  // Show loading placeholder
  container.innerHTML = '<div class="graph-loading"><div class="loading-spinner"></div><p>Loading knowledge graph...</p></div>';
  
  const nodes = new vis.DataSet((data.nodes || []).map((n) => ({
    id: n.id,
    label: n.label,
    value: n.value || 1,
    group: n.group || 'language',
  })));
  const edges = new vis.DataSet((data.links || []).map((e) => ({
    from: e.from,
    to: e.to,
    value: e.value || 1,
  })));
  const conceptCount = Array.isArray(data.concepts) ? data.concepts.length : 0;
  updateBrainSummary({ nodeCount: nodes.length, edgeCount: edges.length, conceptCount });

  if (!nodes.length) {
    container.innerHTML = '<div class="graph-empty">Teach Pal new ideas to grow this graph.</div>';
    if (desc) {
      desc.textContent = defaultBrainDescription || 'Nodes represent the words and concepts Pal hears most often. Links connect words that commonly appear together.';
    }
    return;
  }

  // Use setTimeout to allow loading UI to render before heavy computation
  setTimeout(() => {
    // Clear container completely to prevent duplicates
    container.innerHTML = '';
    
    const options = {
      layout: { improvedLayout: true },
      nodes: {
        shape: 'dot',
        scaling: { min: 4, max: 24 },
        color: {
          background: '#2a306b',
          border: '#9ab4ff',
          highlight: { background: '#3240a8', border: '#dfe3ff' }
        },
        font: { color: '#dfe3ff', size: 12 },
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.35)',
          size: 8,
          x: 2,
          y: 2
        }
      },
      edges: {
        color: { color: '#2a306b', highlight: '#9ab4ff' },
        smooth: { type: 'continuous', roundness: 0.15 },
        width: 1
      },
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 200,
          springConstant: 0.04,
          avoidOverlap: 0.5
        },
        maxVelocity: 30,
        minVelocity: 0.5,
        timestep: 0.35,
        stabilization: { 
          enabled: true,
          iterations: 200,
          updateInterval: 50,
          fit: true 
        }
      },
      interaction: {
        hover: true,
        zoomView: true,
        dragNodes: true,
        tooltipDelay: 200,
        hideEdgesOnDrag: true,
        hideEdgesOnZoom: false
      },
      groups: {
        concept: {
          shape: 'diamond',
          color: {
            background: '#642d91',
            border: '#d6b7ff',
            highlight: { background: '#8044b0', border: '#ffffff' }
          },
          font: { color: '#f3e9ff' }
        }
      }
    };
    
    // Create canvas element for network
    const canvas = document.createElement('div');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);
    
    const network = new vis.Network(canvas, { nodes, edges }, options);
    
    // Network is ready after stabilization
    network.once('stabilizationIterationsDone', () => {
      // Network is now stable and visible
    });

    if (desc) {
      if (conceptCount && data.concepts?.length) {
        const sorted = [...data.concepts].sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0) || (b.totalMentions || 0) - (a.totalMentions || 0));
        const top = sorted[0];
        if (top) {
          const topKeywords = top.keywords?.slice(0, 3).map((k) => k.word).filter(Boolean);
          const keywordText = topKeywords && topKeywords.length ? `Keywords: ${topKeywords.join(', ')}` : '';
          desc.textContent = `Dominant concept: ${top.name} (${top.category}). ${keywordText}`.trim();
          return;
        }
      }
      desc.textContent = defaultBrainDescription || 'Nodes represent the words and concepts Pal hears most often. Links connect words that commonly appear together.';
    }
  }, 10); // Small delay to let loading UI render
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
    renderBrain(graph);
    renderMemories(memories);
  } catch (err) {
    console.error('Failed to load brain insights', err);
  }
}

function wireTabs() {
  $$('nav button').forEach(btn => btn.addEventListener('click', async () => {
    const tab = btn.dataset.tab;
    switchTab(tab);
    if (tab === 'journal') {
      await loadJournal(true);
    } else if (tab === 'brain') {
      await loadBrainInsights();
    } else if (tab === 'stats') {
      await renderProgressDashboard();
    }
  }));
}

function wireChat() {
  const form = $('#chat-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#chat-input');
    const floatingInput = $('#floating-chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    
    lastUserMessage = msg;
    addMessage('user', msg);
    
    // If floating chat is open, sync the message there too
    if (floatingChatOpen) {
      addFloatingMessage('user', msg);
    }
    
    input.value = '';
    
    // Disable both inputs while waiting for response
    input.disabled = true;
    input.placeholder = 'Pal is thinking...';
    if (floatingInput) {
      floatingInput.disabled = true;
      floatingInput.placeholder = 'Pal is thinking...';
    }
    
    const indicator = showTyping();
    const floatingIndicator = floatingChatOpen ? showFloatingTyping() : null;
    
    try {
      const res = await sendChat(msg);
      const replyText = typeof res?.reply === 'string' ? res.reply : (res?.output ?? '…');
      const meta = res?.kind ? `Mode: ${res.kind}` : undefined;
      addMessage('pal', replyText, meta);
      
      // If floating chat is open, sync the response there too
      if (floatingChatOpen) {
        addFloatingMessage('pal', replyText, meta);
      }
      
      // Update emotion display if emotion data is present
      if (res?.emotion) {
        updateEmotionDisplay(res.emotion);
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
    } catch (e) {
      console.error('Chat error:', e);
      let errorMsg = 'Sorry, I had trouble responding.';
      
      // Provide more specific error messages
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
      if (floatingChatOpen) {
        addFloatingMessage('pal', errorMsg);
      }
    } finally {
      hideTyping(indicator);
      if (floatingIndicator) {
        hideFloatingTyping(floatingIndicator);
      }
      
      // Re-enable both inputs
      input.disabled = false;
      input.placeholder = 'Type a message...';
      if (floatingInput) {
        floatingInput.disabled = false;
        floatingInput.placeholder = 'Type a message...';
      }
      input.focus();
    }
  });
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
      saveBtn.textContent = '✓ Saved!';
      setTimeout(() => {
        saveBtn.textContent = originalText;
      }, 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      saveBtn.textContent = '✗ Failed';
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
      
      resetBtn.textContent = '✓ Reset complete';
      setTimeout(() => {
        resetBtn.textContent = originalText;
        resetBtn.disabled = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to reset Pal:', err);
      alert('Unable to reset Pal. Please ensure you are logged in if authentication is required.');
      resetBtn.textContent = '✗ Failed';
      setTimeout(() => {
        resetBtn.textContent = originalText;
        resetBtn.disabled = false;
      }, 2000);
    }

    multiplierDirty = false;
    await refreshStats();
    await loadBrainInsights();
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
  // Wire up profile management first
  wireProfileManagement();
  
  await checkHealth();
  
  if (backendHealthy) {
    // Always show profile menu on startup - let user choose their profile
    showProfileMenu();
    await initProfileMenu();
  } else {
    showStatusModal();
    showProfileMenu();
  }
  
  wireTabs();
  wireChat();
  wireChatSearch();
  wireSettings();
  setupBrainSubTabs();
  setupJournalSubTabs();
  setupNeuralRefresh();
  setupNeuralRegeneration();
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

  // Dev tools
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      toggleDevPanel();
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

// --- Progress dashboard (stats tab) ---
let xpChartEl = null;
let convoChartEl = null;
async function renderProgressDashboard() {
  let payload;
  try {
    payload = await fetchMemories(400);
  } catch { return; }
  const memories = payload?.memories || [];
  if (!memories.length) return;

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

  const xpCtx = document.getElementById('xpChart')?.getContext('2d');
  if (xpCtx) {
    if (xpChartEl) xpChartEl.destroy();
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
  const convoCtx = document.getElementById('convoChart')?.getContext('2d');
  if (convoCtx) {
    if (convoChartEl) convoChartEl.destroy();
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
  updateNeuralStats();
  updateNeuralEvents();
  
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Refresh';
  }
}

// Enhanced Neural Network Visualization
function renderNeuralNetwork(networkData) {
  const data = networkData || neuralState;
  if (!data || !data.regions) return;
  
  const svg = document.getElementById('neural-canvas');
  if (!svg) return;
  
  // Clear existing content
  svg.innerHTML = '';
  
  // Create gradient definitions for firing effects
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  
  // Pulsing gradient for active neurons
  const pulseGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
  pulseGradient.setAttribute('id', 'pulse-gradient');
  pulseGradient.innerHTML = `
    <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.8" />
    <stop offset="50%" style="stop-color:#64b5f6;stop-opacity:0.6" />
    <stop offset="100%" style="stop-color:#1976d2;stop-opacity:0.3" />
    <animateTransform attributeName="gradientTransform" type="scale" 
      values="1;1.5;1" dur="0.5s" repeatCount="indefinite" />
  `;
  defs.appendChild(pulseGradient);
  svg.appendChild(defs);
  
  // Store current data globally for access by other functions
  neuralState = data;
  
  // Create inter-region connections first (so they appear behind regions)
  if (data.regions && data.regions.length > 1) {
    renderInterRegionConnections(svg, data.regions);
  }
  
  // Create SVG groups for each region
  data.regions.forEach(region => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('region-group');
    g.setAttribute('data-region', region.regionId);
    g.setAttribute('transform', `translate(${region.position.x}, ${region.position.y})`);
    
    // Draw region background with rounded corners and subtle shadow
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', 0);
    rect.setAttribute('y', 0);
    rect.setAttribute('width', region.size.width);
    rect.setAttribute('height', region.size.height);
    rect.setAttribute('fill', region.color);
    rect.setAttribute('opacity', '0.15');
    rect.setAttribute('rx', '12');
    rect.setAttribute('ry', '12');
    rect.setAttribute('stroke', region.color);
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('stroke-opacity', '0.3');
    rect.classList.add('region-background');
    g.appendChild(rect);
    
    // Draw region label with better styling
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', region.size.width / 2);
    label.setAttribute('y', -8);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', '#dfe3ff');
    label.setAttribute('font-size', '14');
    label.setAttribute('font-weight', 'bold');
    label.classList.add('region-label');
    label.textContent = region.regionName;
    g.appendChild(label);
    
    // Draw individual neurons with better positioning and interaction
    if (region.neurons && region.neurons.length > 0) {
      renderNeuronsInRegion(g, region);
    }
    
    // Add region click handler for selection
    rect.addEventListener('click', () => selectRegion(region));
    rect.style.cursor = 'pointer';
    
    svg.appendChild(g);
  });
  
  // Update stats display
  updateNeuralStats();
}

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
  if (!neuralState || !neuralState.events) return;
  
  const eventList = $('#neural-event-list');
  if (!eventList) return;
  
  eventList.innerHTML = '';
  
  const events = neuralState.events.slice(-20).reverse(); // Show last 20, newest first
  
  if (events.length === 0) {
    eventList.innerHTML = '<div class="event-item">No recent activity</div>';
    return;
  }
  
  events.forEach(event => {
    const item = document.createElement('div');
    item.classList.add('event-item');
    
    if (event.type === 'neuron-fire') {
      item.classList.add('firing');
      const time = new Date(event.timestamp).toLocaleTimeString();
      item.innerHTML = `
        <div><strong>${formatRegionName(event.regionId)}</strong> fired</div>
        <div class="event-time">${time}</div>
      `;
    }
    
    eventList.appendChild(item);
  });
}

// Format region ID to readable name
function formatRegionName(regionId) {
  if (!regionId) return '';
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
        const replyText = typeof res?.reply === 'string' ? res.reply : (res?.output ?? '…');
        const meta = res?.kind ? `Mode: ${res.kind}` : undefined;
        
        // Add response to both windows
        addMessage('pal', replyText, meta);
        addFloatingMessage('pal', replyText, meta);
        
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
        hideTyping(indicator);
        hideFloatingTyping(floatingIndicator);
        
        // Re-enable both inputs
        floatingInput.disabled = false;
        $('#chat-input').disabled = false;
        $('#chat-input').placeholder = 'Type a message...';
        floatingInput.placeholder = 'Type a message...';
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
  try { if (el && el.parentElement) el.parentElement.removeChild(el); } catch {}
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
