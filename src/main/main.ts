/* eslint global-require: off, no-console: off, promise/always-return: off */

import path from 'path';
import { app, BrowserWindow, shell, ipcMain, screen, dialog } from 'electron';
import * as pty from 'node-pty';
import { resolveHtmlPath } from './util';

let mainWindow: BrowserWindow | null = null;

// Map of terminal sessions by terminalId
const ptyProcesses = new Map<string, pty.IPty>();

// Terminal IPC handlers
ipcMain.on('terminal-attach', async (event, terminalId: string, workingDir?: string) => {
  // Check if process already exists (reattach scenario)
  if (ptyProcesses.has(terminalId)) {
    return;
  }

  try {
    const workingDirectory = workingDir || process.env.HOME || '~';
    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh');
    const shellArgs = process.platform === 'win32' ? [] : ['-l'];

    console.log(`Creating PTY for terminal ${terminalId} with shell:`, shell, 'in', workingDirectory);

    const ptyProcess = pty.spawn(shell, shellArgs, {
      name: 'xterm-256color',
      cols: 80,
      rows: 30,
      cwd: workingDirectory,
      env: process.env as any,
    });

    ptyProcess.onData((data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-data', terminalId, data);
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      console.log(`PTY terminal ${terminalId} exited with code:`, exitCode);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-exit', terminalId, exitCode);
      }
      ptyProcesses.delete(terminalId);
    });

    ptyProcesses.set(terminalId, ptyProcess);
    console.log(`PTY terminal ${terminalId} created successfully`);
  } catch (error) {
    console.error(`Failed to create PTY terminal ${terminalId}:`, error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-data', terminalId, `Error creating terminal: ${error}\r\n`);
    }
  }
});

ipcMain.on('terminal-input', (event, terminalId: string, data: string) => {
  const ptyProcess = ptyProcesses.get(terminalId);
  if (ptyProcess) {
    ptyProcess.write(data);
  }
});

ipcMain.on('terminal-resize', (event, terminalId: string, { cols, rows }: { cols: number; rows: number }) => {
  const ptyProcess = ptyProcesses.get(terminalId);
  if (ptyProcess) {
    try {
      ptyProcess.resize(cols, rows);
    } catch (error) {
      console.error(`Failed to resize PTY terminal ${terminalId}:`, error);
    }
  }
});

ipcMain.on('terminal-detach', (event, terminalId: string) => {
  // UI component is detaching (unmounting), but PTY process stays alive
});

ipcMain.on('terminal-destroy', (event, terminalId: string) => {
  const ptyProcess = ptyProcesses.get(terminalId);
  if (ptyProcess) {
    ptyProcess.kill();
    ptyProcesses.delete(terminalId);
    console.log(`PTY terminal ${terminalId} destroyed`);
  }
});

// Directory picker handler
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result;
});

const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

// if (isDebug) {
//   require('electron-debug').default();
// }

const createWindow = async () => {

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  // Get screen dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Calculate window dimensions and position
  const windowWidth = Math.min(1400, screenWidth - 100);
  const windowHeight = screenHeight - 100;
  const windowX = (screenWidth - windowWidth) / 2;
  const windowY = 50;

  mainWindow = new BrowserWindow({
    show: false,
    width: windowWidth,
    height: windowHeight,
    x: windowX,
    y: windowY,
    icon: getAssetPath('icon.png'),
    transparent: true,
    frame: false,
    resizable: true,
    thickFrame: true,
    opacity: 1,
    alwaysOnTop: false,
    skipTaskbar: false,
    vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
    visualEffectState: process.platform === 'darwin' ? 'active' : undefined,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      devTools: isDebug,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    mainWindow.webContents.setZoomFactor(0.9);
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open URLs in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  return mainWindow;
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Add uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  console.error('Stack trace:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// Single instance lock - prevent multiple instances from opening
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit();
} else {
  // This is the first/only instance
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app
    .whenReady()
    .then(() => {
      createWindow();
      app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (mainWindow === null) createWindow();
      });
    })
    .catch(console.log);
}
