const API_BASE = 'http://localhost:3001/api';
let backendHealthy = false;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function switchTab(name) {
  $$('.tab').forEach(t => t.classList.remove('active'));
  $$('#tab-' + name).classList.add('active');
  $$('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
}

async function reinforceClick(btn) {
  btn.disabled = true;
  try {
    await fetch(`${API_BASE}/reinforce`, { method: 'POST' });
    await refreshStats();
  } catch {}
}

function addMessage(role, text) {
  const wrap = document.createElement('div');
  wrap.className = `msg ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  wrap.appendChild(bubble);
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
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('Chat failed');
  return res.json();
}

async function getStats() {
  const res = await fetch(`${API_BASE}/stats`);
  return res.json();
}

async function saveSettings(xpMultiplier, apiProvider, apiKey) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xpMultiplier, apiProvider, apiKey })
  });
  return res.json();
}

async function doReset() {
  const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
  return res.json();
}

async function doExport() {
  const res = await fetch(`${API_BASE}/export`);
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
  $('#xp-multiplier').value = s.settings?.xpMultiplier ?? 1;

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
      addMessage('pal', res.reply);
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
    await saveSettings(mult, provider, keyRaw ? keyRaw : undefined);
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
}

async function init() {
  wireTabs();
  wireChat();
  wireSettings();
  await checkHealth();
  if (backendHealthy) {
    await refreshStats();
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
