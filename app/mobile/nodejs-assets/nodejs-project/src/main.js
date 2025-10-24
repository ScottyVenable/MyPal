// Simplified backend server for mobile
// This is a lightweight version of the desktop backend adapted for mobile devices

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for mobile (simplified)
let profiles = [];
let currentProfile = null;
let messages = [];
let stats = {
  level: 1,
  xp: 0,
  nextLevelXP: 100,
  totalMessages: 0,
  wordsLearned: 0,
  personality: {
    curious: 50,
    logical: 50,
    social: 50,
    agreeable: 50,
    cautious: 50,
  },
  cognitivePoints: 0,
  lobes: {
    language: 1,
    logic: 1,
    emotion: 1,
    memory: 1,
  },
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Profile endpoints
app.get('/api/profiles', (req, res) => {
  res.json(profiles);
});

app.post('/api/profiles', (req, res) => {
  const { name } = req.body;
  const profile = {
    id: Date.now().toString(),
    name,
    level: 1,
    xp: 0,
    created: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };
  profiles.push(profile);
  res.json(profile);
});

app.post('/api/profiles/:id/load', (req, res) => {
  const profile = profiles.find(p => p.id === req.params.id);
  if (profile) {
    currentProfile = profile;
    profile.lastActive = new Date().toISOString();
    res.json(profile);
  } else {
    res.status(404).json({ error: 'Profile not found' });
  }
});

app.delete('/api/profiles/:id', (req, res) => {
  profiles = profiles.filter(p => p.id !== req.params.id);
  if (currentProfile?.id === req.params.id) {
    currentProfile = null;
  }
  res.json({ success: true });
});

// Chat endpoint
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  
  if (!currentProfile) {
    return res.status(400).json({ error: 'No profile loaded' });
  }

  // Simple response logic (placeholder for real AI)
  let reply = '';
  const level = stats.level;

  if (level === 1) {
    // Babbling stage
    const babbles = ['ba', 'ga', 'ma', 'da', 'pa'];
    reply = babbles[Math.floor(Math.random() * babbles.length)];
  } else if (level < 4) {
    // Single word stage
    const words = ['hi', 'yes', 'no', 'good', 'happy'];
    reply = words[Math.floor(Math.random() * words.length)];
  } else {
    // Simple sentences
    const responses = [
      'I understand.',
      'Tell me more.',
      'That is interesting.',
      'I am learning.',
      'Thank you for teaching me.',
    ];
    reply = responses[Math.floor(Math.random() * responses.length)];
  }

  // Update stats
  stats.xp += 10;
  stats.totalMessages += 1;
  let leveledUp = false;
  let newLevel = stats.level;

  if (stats.xp >= stats.nextLevelXP) {
    stats.level += 1;
    newLevel = stats.level;
    stats.nextLevelXP = Math.floor(stats.nextLevelXP * 1.5);
    leveledUp = true;
  }

  // Store messages
  messages.push({
    id: Date.now().toString(),
    sender: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  });

  messages.push({
    id: (Date.now() + 1).toString(),
    sender: 'pal',
    content: reply,
    timestamp: new Date().toISOString(),
  });

  res.json({
    reply,
    xpGained: 10,
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
  });
});

// Chat log
app.get('/api/chatlog', (req, res) => {
  res.json(messages);
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json(stats);
});

// Neural network endpoint (simplified)
app.get('/api/neural-network', (req, res) => {
  const nodes = [
    { id: '1', label: 'hello', group: 'word' },
    { id: '2', label: 'world', group: 'word' },
    { id: '3', label: 'learning', group: 'concept' },
  ];
  const edges = [
    { from: '1', to: '2' },
    { from: '2', to: '3' },
  ];
  res.json({ nodes, edges });
});

app.post('/api/neural/regenerate', (req, res) => {
  // Return same structure for now
  const nodes = [
    { id: '1', label: 'hello', group: 'word' },
    { id: '2', label: 'world', group: 'word' },
    { id: '3', label: 'learning', group: 'concept' },
  ];
  const edges = [
    { from: '1', to: '2' },
    { from: '2', to: '3' },
  ];
  res.json({ nodes, edges });
});

// Settings endpoint
app.post('/api/settings', (req, res) => {
  res.json({ success: true });
});

// Export endpoint
app.get('/api/export', (req, res) => {
  const data = {
    profiles,
    currentProfile,
    messages,
    stats,
  };
  res.json(data);
});

// Reset endpoint
app.post('/api/reset', (req, res) => {
  messages = [];
  stats = {
    level: 1,
    xp: 0,
    nextLevelXP: 100,
    totalMessages: 0,
    wordsLearned: 0,
    personality: {
      curious: 50,
      logical: 50,
      social: 50,
      agreeable: 50,
      cautious: 50,
    },
    cognitivePoints: 0,
    lobes: {
      language: 1,
      logic: 1,
      emotion: 1,
      memory: 1,
    },
  };
  res.json({ success: true });
});

// Reinforce endpoint
app.post('/api/reinforce', (req, res) => {
  stats.xp += 25;
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`MyPal Mobile Backend running on port ${PORT}`);
});

module.exports = app;
