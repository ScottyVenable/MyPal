const { app, BrowserWindow, dialog, Tray, Menu, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const treeKill = require('tree-kill');
const waitOn = require('wait-on');

const backendPort = process.env.MYPAL_BACKEND_PORT || process.env.PORT || '3001';
let backendProcess = null;
let backendReady = false;
let quitting = false;
let mainWindow = null;
let tray = null;

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

function createTray(rootDir) {
  // Create a native image for the tray icon
  // Electron will use a default icon if we don't provide one
  let trayIcon = nativeImage.createEmpty();
  
  const iconCandidates = [
    path.join(rootDir, 'media', 'images', 'icon.ico'),
    path.join(rootDir, 'launcher', 'icon.png'),
    path.join(rootDir, 'app', 'frontend', 'favicon.ico'),
    path.join(__dirname, 'icon.png')
  ];
  
  for (const candidate of iconCandidates) {
    if (fs.existsSync(candidate)) {
      try {
        trayIcon = nativeImage.createFromPath(candidate);
        if (!trayIcon.isEmpty()) {
          console.log('Loaded tray icon from:', candidate);
          break;
        }
      } catch (err) {
        console.warn('Failed to load icon from', candidate, err);
      }
    }
  }

  // Create tray with icon (or empty icon if none found)
  tray = new Tray(trayIcon.isEmpty() ? nativeImage.createEmpty() : trayIcon);
  
  const updateTrayMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'MyPal',
        type: 'normal',
        enabled: false
      },
      { type: 'separator' },
      {
        label: mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() ? 'Hide Window' : 'Show Window',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            if (mainWindow.isVisible()) {
              mainWindow.hide();
            } else {
              mainWindow.show();
              mainWindow.focus();
            }
            updateTrayMenu();
          }
        }
      },
      { type: 'separator' },
      {
        label: `Server: ${backendReady ? 'Running' : 'Stopped'}`,
        enabled: false
      },
      {
        label: 'Open in Browser',
        click: () => {
          shell.openExternal(`http://localhost:${backendPort}`);
        },
        enabled: backendReady
      },
      { type: 'separator' },
      {
        label: 'Quit MyPal',
        click: async () => {
          const choice = await dialog.showMessageBox({
            type: 'question',
            buttons: ['Quit', 'Cancel'],
            defaultId: 0,
            title: 'Quit MyPal',
            message: 'Do you want to shut down the MyPal server and quit?',
            detail: 'The server will be safely shut down.'
          });

          if (choice.response === 0) {
            quitting = true;
            app.quit();
          }
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
  };

  updateTrayMenu();
  
  tray.setToolTip('MyPal - AI Companion');
  
  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Update menu when window visibility changes
  if (mainWindow) {
    mainWindow.on('show', updateTrayMenu);
    mainWindow.on('hide', updateTrayMenu);
  }

  return tray;
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

    // Decide whether to show console window
    const showConsole = !app.isPackaged && !process.env.MYPAL_NO_SERVER_CONSOLE;
    
    // Spawn the backend server
    const spawnOptions = {
      cwd: backendDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      windowsHide: !showConsole // Show or hide console window on Windows
    };

    backendProcess = spawn(process.execPath, [backendEntry], spawnOptions);

    // Pipe output to log files
    if (backendProcess.stdout) {
      backendProcess.stdout.on('data', (chunk) => {
        writeSafe(process.stdout, chunk);
        writeSafe(outStream, chunk);
      });
    }

    if (backendProcess.stderr) {
      backendProcess.stderr.on('data', (chunk) => {
        writeSafe(process.stderr, chunk);
        writeSafe(errStream || outStream, chunk);
      });
    }

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
  // Set window icon
  const iconPath = path.join(rootDir, 'media', 'images', 'icon.ico');
  let icon = null;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
    console.log('Loaded window icon from:', iconPath);
  }

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    title: 'MyPal',
    icon: icon,
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

  // Handle window close with confirmation
  mainWindow.on('close', async (e) => {
    if (quitting) return;

    e.preventDefault();

    const choice = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Shut Down Server', 'Keep Server Running', 'Cancel'],
      defaultId: 2,
      title: 'Close MyPal',
      message: 'What would you like to do?',
      detail: 'You can shut down the server completely, keep it running in the background (accessible via system tray), or cancel.'
    });

    if (choice.response === 0) {
      // Shut down server and quit
      quitting = true;
      app.quit();
    } else if (choice.response === 1) {
      // Keep server running, hide to tray
      mainWindow.hide();
      
      // Show notification about system tray
      if (tray) {
        tray.displayBalloon({
          title: 'MyPal Running in Background',
          content: 'MyPal server is still running. Right-click the tray icon to manage or quit.'
        });
      }
    }
    // choice.response === 2 is cancel, do nothing
  });

  return mainWindow;
}

async function launch() {
  try {
    const rootDir = resolveRootDir();
    await startBackend(rootDir);
    await createWindow(rootDir);
    
    // Create system tray
    createTray(rootDir);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    dialog.showErrorBox('Failed to launch MyPal', message);
    app.quit();
  }
}

app.whenReady().then(launch);

app.on('window-all-closed', (e) => {
  // Don't quit when all windows are closed if we have a tray icon
  // The user can quit via the tray menu
  if (!tray) {
    app.quit();
  }
  // If tray exists, keep running in background
});

app.on('before-quit', () => {
  quitting = true;
  shutdownBackend('SIGTERM');
});

app.on('quit', () => {
  shutdownBackend('SIGKILL');
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
  }
});
