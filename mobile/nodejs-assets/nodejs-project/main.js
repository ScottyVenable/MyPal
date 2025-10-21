const rn_bridge = require('rn-bridge');

// Listen for messages from React Native
rn_bridge.channel.on('message', (msg) => {
  console.log('Received message from React Native:', msg);
});

// Start the Express server
console.log('Starting MyPal backend server...');

// Import and start the server
// NOTE: You'll need to copy your server.js and dependencies here
// For now, this is a placeholder that needs to be populated

const express = require('express');
const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MyPal server is running' });
});

// TODO: Copy all routes from app/backend/src/server.js
// TODO: Copy profileManager and other required modules
// TODO: Set up data directory for mobile storage

app.listen(PORT, () => {
  console.log(`MyPal server listening on port ${PORT}`);
  rn_bridge.channel.send('server-started');
});

app.on('error', (error) => {
  console.error('Server error:', error);
  rn_bridge.channel.send('server-error', error.message);
});
