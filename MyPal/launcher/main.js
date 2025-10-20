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

function openLogStream(filePath, label) {
  try {
    ensureDir(path.dirname(filePath));
    const stream = fs.createWriteStream(filePath, { flags: 'a' });
    stream.write(`\n==== ${new Date().toISOString()} ${label} ====\n`);
    return stream;
  } catch (err) {
    console.warn(`Failed to open ${label} log at ${filePath}`, err);
    return null;
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
  const candidates = [
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '../..'),
    path.resolve(__dirname, '../../..')
  ];

  for (const candidate of candidates) {
    const backendEntry = path.join(candidate, 'app', 'backend', 'src', 'server.js');
    if (fs.existsSync(backendEntry)) {
      return candidate;
    }
  }

  throw new Error('Unable to locate project root containing app/backend/src/server.js');
}

async function startBackend(rootDir) {
  const backendDir = path.join(rootDir, 'app', 'backend');
  const backendEntry = path.join(backendDir, 'src', 'server.js');
  if (!fs.existsSync(backendEntry)) {
    throw new Error(`Backend entry not found at ${backendEntry}`);
  }

  const userDataDir = app.getPath('userData');
  const dataDir = process.env.MYPAL_DATA_DIR ? path.resolve(process.env.MYPAL_DATA_DIR) : path.join(userDataDir, 'backend-data');
  const logsDir = process.env.MYPAL_LOGS_DIR ? path.resolve(process.env.MYPAL_LOGS_DIR) : path.join(userDataDir, 'logs');
  const modelsDir = process.env.MYPAL_MODELS_DIR ? path.resolve(process.env.MYPAL_MODELS_DIR) : path.join(userDataDir, 'models');
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
    let outStream = null;
    let errStream = null;

    let devLogDir = null;
    try {
      const candidate = path.resolve(rootDir, '..', 'Developer Files');
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        devLogDir = candidate;
      }
    } catch (_) {}

    const outPath = devLogDir ? path.join(devLogDir, 'server_out.txt') : path.join(logsDir, 'server_out.log');
    const errPath = devLogDir ? path.join(devLogDir, 'server_err.txt') : path.join(logsDir, 'server_err.log');

    outStream = openLogStream(outPath, 'stdout');
    errStream = openLogStream(errPath, 'stderr');

    const logHint = devLogDir
      ? `\n\nReview logs:\n${outPath}\n${errPath}`
      : `\n\nReview logs in ${logsDir}`;

    const closeStreams = () => {
      [outStream, errStream].forEach((stream) => {
        if (!stream) return;
        try {
          stream.end('\n');
        } catch (_) {}
      });
      outStream = null;
      errStream = null;
    };

    const writeSafe = (stream, chunk) => {
      if (!stream) return;
      try {
        stream.write(chunk);
      } catch (_) {}
    };

    backendProcess = spawn(process.execPath, [backendEntry], {
      cwd: backendDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    backendProcess.stdout?.on('data', (chunk) => {
      writeSafe(process.stdout, chunk);
      writeSafe(outStream, chunk);
    });

    backendProcess.stderr?.on('data', (chunk) => {
      writeSafe(process.stderr, chunk);
      writeSafe(errStream || outStream, chunk);
    });

    backendProcess.once('error', (err) => {
      closeStreams();
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    backendProcess.once('exit', (code, signal) => {
      backendReady = false;
      backendProcess = null;
      closeStreams();
      if (quitting) return;
      const reason = signal ? `signal ${signal}` : `exit code ${code}`;
      const message = `The MyPal backend stopped unexpectedly (${reason}).${logHint}`;
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
      const message = `Backend failed to become ready: ${err && err.message ? err.message : err}`;
      shutdownBackend();
      if (!settled) {
        settled = true;
        reject(new Error(`${message}${logHint}`));
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
    try {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    } catch (err) {
      console.warn('Failed to open devtools', err);
    }
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
