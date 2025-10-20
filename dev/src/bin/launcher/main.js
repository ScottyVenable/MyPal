const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const treeKill = require('tree-kill');
const waitOn = require('wait-on');

const backendPort = process.env.MYPAL_BACKEND_PORT || process.env.PORT || '3001';
let backendProcess = null;
let backendReady = false;
let quitting = false;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function shutdownBackend(signal = 'SIGTERM') {
  if (backendProcess && !backendProcess.killed) {
    try {
      treeKill(backendProcess.pid, signal);
    } catch (_) {
      try { backendProcess.kill(signal); } catch (__) {}
    }
  }
}

function resolveRootDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app');
  }
  return path.resolve(__dirname, '../../../../');
}

async function startBackend(rootDir) {
  const backendDir = path.join(rootDir, 'app', 'backend');
  const backendEntry = path.join(backendDir, 'src', 'server.js');
  if (!fs.existsSync(backendEntry)) {
    throw new Error(`Backend entry not found at ${backendEntry}`);
  }

  const userDataDir = app.getPath('userData');
  const dataDir = path.join(userDataDir, 'backend-data');
  const logsDir = path.join(userDataDir, 'logs');
  const modelsDir = path.join(userDataDir, 'models');
  [dataDir, logsDir, modelsDir].forEach(ensureDir);

  const env = {
    ...process.env,
    PORT: backendPort,
    DATA_DIR: dataDir,
    LOGS_DIR: logsDir,
    MODELS_DIR: modelsDir,
    ELECTRON_RUN_AS_NODE: '1'
  };

  return new Promise((resolve, reject) => {
    let settled = false;

    backendProcess = spawn(process.execPath, [backendEntry], {
      cwd: backendDir,
      env,
      stdio: 'inherit'
    });

    backendProcess.once('error', (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    backendProcess.once('exit', (code, signal) => {
      backendReady = false;
      backendProcess = null;
      if (quitting) return;
      const reason = signal ? `signal ${signal}` : `exit code ${code}`;
      const message = `The MyPal backend stopped unexpectedly (${reason}).`;
      dialog.showErrorBox('Backend exited', message);
      if (!settled) {
        settled = true;
        reject(new Error(message));
      }
      app.quit();
    });

    waitOn({
      resources: [`http-get://localhost:${backendPort}/api/health`],
      timeout: 20000,
      interval: 500,
      tcpTimeout: 1000
    }).then(() => {
      backendReady = true;
      if (!settled) {
        settled = true;
        resolve();
      }
    }).catch((err) => {
      shutdownBackend();
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
  });
}

async function createWindow(rootDir) {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    title: 'MyPal',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const frontendEntry = path.join(rootDir, 'app', 'frontend', 'index.html');
  if (!fs.existsSync(frontendEntry)) {
    throw new Error(`Frontend index not found at ${frontendEntry}`);
  }

  await mainWindow.loadFile(frontendEntry);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' }).catch(() => {});
  }
}

async function launch() {
  try {
    const rootDir = resolveRootDir();
    await startBackend(rootDir);
    await createWindow(rootDir);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    dialog.showErrorBox('Failed to launch MyPal', message);
    app.quit();
  }
}

app.whenReady().then(launch);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  quitting = true;
  shutdownBackend('SIGTERM');
});

app.on('quit', () => {
  shutdownBackend('SIGKILL');
});
