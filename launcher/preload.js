const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('mypalLauncher', {
  platform: process.platform,
  env: process.env.NODE_ENV || (process.defaultApp ? 'development' : 'production')
});
