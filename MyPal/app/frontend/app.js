const API_BASE = 'http://localhost:3001/api';
let backendHealthy = false;
let authToken = localStorage.getItem('mypal_token') || null;

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
  bubble.textContent = text && String(text).trim().length ? text : '…';
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
  $('#xp-multiplier').value = multiplier;
  setMultiplierDisplay(multiplier);
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

function renderBrain(data) {
  const container = document.getElementById('brain-graph');
  if (!container || typeof vis === 'undefined' || !vis.Network) return;
  const nodes = new vis.DataSet(data.nodes.map(n => ({ id: n.id, label: n.label, value: n.value })));
  const edges = new vis.DataSet(data.links.map(e => ({ from: e.from, to: e.to, value: e.value })));
  const options = {
    nodes: {
      shape: 'dot',
      scaling: { min: 4, max: 24 },
      color: { background: '#2a306b', border: '#9ab4ff', highlight: { background: '#3240a8', border: '#dfe3ff' } },
      font: { color: '#dfe3ff' }
    },
    edges: { color: { color: '#2a306b', highlight: '#9ab4ff' } },
    physics: { stabilization: true }
  };
  new vis.Network(container, { nodes, edges }, options);
}

function wireTabs() {
  $$('nav button').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
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
      await refreshStats();
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
    await refreshStats();
  });
  $('#reset-pal').addEventListener('click', async () => {
    const ok = confirm('Reset Pal to Level 0 and wipe memory? Type RESET to confirm.');
    if (!ok) return;
    const word = prompt('Type RESET to confirm');
    if (word !== 'RESET') return;
    await doReset();
    $('#chat-window').innerHTML = '';
    await refreshStats();
  });
  $('#export-memory').addEventListener('click', doExport);

  const multiplierInput = $('#xp-multiplier');
  multiplierInput?.addEventListener('input', (e) => {
    setMultiplierDisplay(e.target.value);
  });
}

async function init() {
  wireTabs();
  wireChat();
  wireSettings();
  await checkHealth();
  if (backendHealthy) {
    await refreshStats();
    try { const brain = await fetchBrain(); renderBrain(brain); } catch {}
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
      try { const brain = await fetchBrain(); renderBrain(brain); } catch {}
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
    const data = await fetchBrain();
    renderBrain(data);
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
