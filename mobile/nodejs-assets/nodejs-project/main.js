const rn_bridge = require('rn-bridge');
const path = require('path');
const fs = require('fs');

// Mobile-specific data directory setup
// On mobile, we use the app's document directory which is provided by React Native
const MOBILE_DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const MOBILE_LOGS_DIR = process.env.LOGS_DIR || path.join(__dirname, 'logs');

// Ensure directories exist
if (!fs.existsSync(MOBILE_DATA_DIR)) {
  fs.mkdirSync(MOBILE_DATA_DIR, { recursive: true });
}
if (!fs.existsSync(MOBILE_LOGS_DIR)) {
  fs.mkdirSync(MOBILE_LOGS_DIR, { recursive: true });
}

console.log('MyPal Mobile Backend');
console.log('Data directory:', MOBILE_DATA_DIR);
console.log('Logs directory:', MOBILE_LOGS_DIR);

// Set environment variables for the server
process.env.DATA_DIR = MOBILE_DATA_DIR;
process.env.LOGS_DIR = MOBILE_LOGS_DIR;
process.env.PORT = '3001';
process.env.MOBILE_MODE = 'true';

// Listen for messages from React Native
rn_bridge.channel.on('message', (msg) => {
  console.log('Received message from React Native:', msg);
  
  if (msg === 'get-data-dir') {
    rn_bridge.channel.send('data-dir', MOBILE_DATA_DIR);
  }
});

// Import the main server
// NOTE: You'll need to copy server.js, profileManager.js, NeuralNetwork.js,
// and all other backend files to this directory
try {
  console.log('Starting MyPal backend server...');
  
  // Import the main server module
  // This assumes you've copied server.js to this directory
  const server = require('./server.js');
  
  console.log('MyPal server started successfully');
  rn_bridge.channel.send('server-started', { 
    port: 3001,
    dataDir: MOBILE_DATA_DIR,
    logsDir: MOBILE_LOGS_DIR
  });
  
} catch (error) {
  console.error('Failed to start server:', error);
  console.error(error.stack);
  rn_bridge.channel.send('server-error', {
    message: error.message,
    stack: error.stack
  });
  
  // Fallback minimal server for debugging
  const express = require('express');
  const app = express();
  const PORT = 3001;
  
  app.use(express.json());
  
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'error', 
      message: 'Backend not fully loaded',
      error: error.message,
      dataDir: MOBILE_DATA_DIR
    });
  });
  
  app.listen(PORT, () => {
    console.log(`Fallback server listening on port ${PORT}`);
  });
}
