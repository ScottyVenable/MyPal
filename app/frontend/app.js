const API_BASE = 'http://localhost:3001/api';
let backendHealthy = false;
let authToken = localStorage.getItem('mypal_token') || null;
let latestMemoryTotal = 0;
let defaultBrainDescription = '';
let latestJournalTotal = 0;
let journalLoaded = false;
let journalLoading = false;
let multiplierDirty = false;

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

function addMessage(role, text, metaText) {
  const wrap = document.createElement('div');
  wrap.className = `msg ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text && String(text).trim().length ? text : '?';
  wrap.appendChild(bubble);
  if (metaText) {
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = metaText;
    wrap.appendChild(meta);
  }
  if (role === 'pal') {
    const star = document.createElement('button');
    star.className = 'reinforce';
    star.title = 'Reinforce';
    star.textContent = '★';
    star.addEventListener('click', () => reinforceClick(star));
    wrap.appendChild(star);
  }
  $('#chat-window').appendChild(wrap);
  $('#chat-window').scrollTop = $('#chat-window').scrollHeight;
}

async function sendChat(message) {
  const res = await apiFetch(`/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('Chat failed');
  return res.json();
}

async function getStats() {
  const res = await apiFetch(`/stats`);
  return res.json();
}

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
        backgroundColor: 'rgba(154, 180, 255, 0.2)'
      }]
    },
    options: {
      scales: {
        r: { suggestedMin: 0, suggestedMax: 100, grid: { color: '#2a306b' }, angleLines: { color: '#2a306b' }, pointLabels: { color: '#dfe3ff' } }
      },
      plugins: { legend: { labels: { color: '#dfe3ff' } } }
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

function renderBrain(data) {
  const container = document.getElementById('brain-graph');
  if (!container || typeof vis === 'undefined' || !vis.Network) return;
  const desc = document.getElementById('brain-description');
  if (!defaultBrainDescription && desc) {
    defaultBrainDescription = desc.textContent || '';
  }
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
      font: { color: '#dfe3ff' },
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
      smooth: { type: 'continuous', roundness: 0.15 }
    },
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: -45,
        centralGravity: 0.012,
        springLength: 180,
        springConstant: 0.055,
        avoidOverlap: 0.6
      },
      maxVelocity: 20,
      minVelocity: 0.4,
      timestep: 0.4,
      stabilization: { iterations: 250, updateInterval: 25, fit: true }
    },
    interaction: {
      hover: true,
      zoomView: true,
      dragNodes: true
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
  new vis.Network(container, { nodes, edges }, options);

  if (!desc) return;
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

    const keywords = document.createElement('div');
    keywords.className = 'keywords';
    if (memory.keywords?.length) {
      keywords.textContent = `Keywords: ${memory.keywords.join(', ')}`;
    } else {
      keywords.textContent = 'Keywords: —';
    }

    item.appendChild(header);
    item.appendChild(text);
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
  if (!journalLoaded) {
    container.innerHTML = '<p class="memory-empty">Loading thoughts…</p>';
  }
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
    }
  }));
}

function wireChat() {
  const form = $('#chat-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    addMessage('user', msg);
    input.value = '';
    try {
      const res = await sendChat(msg);
      const replyText = typeof res?.reply === 'string' ? res.reply : (res?.output ?? '…');
      const meta = res?.kind ? `Mode: ${res.kind}` : undefined;
      addMessage('pal', replyText, meta);
      const wasDirty = multiplierDirty;
      await refreshStats();
      multiplierDirty = wasDirty;
      if (journalLoaded) {
        await loadJournal(true);
      }
    } catch (e) {
      addMessage('pal', backendHealthy ? 'Sorry, I had trouble responding.' : 'Server not running. Please start backend.');
      if (!backendHealthy) showStatusModal();
    }
  });
}

function wireSettings() {
  $('#save-settings').addEventListener('click', async () => {
    const mult = parseInt($('#xp-multiplier').value, 10) || 1;
    const provider = ($('#api-provider').value || 'local');
    const keyRaw = ($('#api-key').value || '').trim();
    const telemetry = !!$('#telemetry').checked;
    const authRequired = !!$('#auth-required').checked;
    await saveSettings(mult, provider, keyRaw ? keyRaw : undefined, telemetry, authRequired);
    if (keyRaw) $('#api-key').value = '';
    multiplierDirty = false;
    await refreshStats();
  });
  $('#reset-pal').addEventListener('click', async () => {
    const confirmed = confirm('Are you sure? Doing this will wipe your Pal forever.');
    if (!confirmed) return;
    try {
      await doReset();
    } catch (err) {
      console.error('Failed to reset Pal', err);
      alert('Unable to reset Pal. Please ensure you are logged in if authentication is required.');
      return;
    }

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
  wireTabs();
  wireChat();
  wireSettings();
  await checkHealth();
  if (backendHealthy) {
    await refreshStats();
    await loadBrainInsights();
  } else {
    showStatusModal();
  }
  const retry = document.getElementById('retry-connection');
  const dismiss = document.getElementById('dismiss-connection');
  retry?.addEventListener('click', async () => {
    const ok = await checkHealth();
    if (ok) {
      hideStatusModal();
      await refreshStats();
      await loadBrainInsights();
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
