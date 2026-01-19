import path from 'path';
import fs from 'fs';
import { app, BrowserWindow, shell, ipcMain, screen, dialog, Menu } from 'electron';
import * as pty from 'node-pty';
import { resolveHtmlPath } from './util';

let mainWindow: BrowserWindow | null = null;

// Map of terminal sessions by terminalId
const ptyProcesses = new Map<string, pty.IPty>();

/**
 * IPC Handler: Attach to a new terminal session
 * Creates a new PTY process with the specified working directory
 */
ipcMain.on('terminal-attach', async (event, terminalId: string, workingDir?: string) => {
  // Check if process already exists (reattach scenario)
  if (ptyProcesses.has(terminalId)) {
    return;
  }

  try {
    const workingDirectory = workingDir || process.env.HOME || '~';
    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh');
    const shellArgs = process.platform === 'win32' ? [] : ['-l'];

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
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal-exit', terminalId, exitCode);
      }
      ptyProcesses.delete(terminalId);
    });

    ptyProcesses.set(terminalId, ptyProcess);
  } catch (error) {
    console.error(`Failed to create PTY terminal ${terminalId}:`, error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal-data', terminalId, `Error creating terminal: ${error}\r\n`);
    }
  }
});

/**
 * IPC Handler: Send input data to terminal
 */
ipcMain.on('terminal-input', (event, terminalId: string, data: string) => {
  const ptyProcess = ptyProcesses.get(terminalId);
  if (ptyProcess) {
    ptyProcess.write(data);
  }
});

/**
 * IPC Handler: Resize terminal dimensions
 */
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

/**
 * IPC Handler: Detach from terminal (UI component unmounting)
 */
ipcMain.on('terminal-detach', (event, terminalId: string) => {
  // UI component is detaching, but PTY process stays alive
});

/**
 * IPC Handler: Destroy terminal and kill PTY process
 */
ipcMain.on('terminal-destroy', (event, terminalId: string) => {
  const ptyProcess = ptyProcesses.get(terminalId);
  if (ptyProcess) {
    ptyProcess.kill();
    ptyProcesses.delete(terminalId);
  }
});

/**
 * IPC Handler: Open directory picker dialog
 */
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result;
});

/**
 * IPC Handler: Show terminal context menu
 */
ipcMain.handle('terminal:showContextMenu', async (event, terminalId: string) => {
  return new Promise((resolve) => {
    const template = [
      {
        label: 'Clear',
        click: () => resolve({ action: 'clear', terminalId }),
      },
      { type: 'separator' as const },
      {
        label: 'Export as .txt',
        click: () => resolve({ action: 'export', terminalId }),
      },
      { type: 'separator' as const },
      {
        label: 'Delete',
        click: () => resolve({ action: 'delete', terminalId }),
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    menu.popup({
      window: mainWindow!,
      callback: () => {
        // Menu closed without selection
        resolve(null);
      },
    });
  });
});

/**
 * IPC Handler: Save terminal content to file
 */
ipcMain.handle('terminal:exportContent', async (event, content: string, defaultName: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: defaultName,
    filters: [{ name: 'Text Files', extensions: ['txt'] }],
  });

  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
  return { success: false, canceled: true };
});

const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

/**
 * Creates the main application window
 */
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
 * Application lifecycle event handlers
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of keeping the app in memory
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Error handlers for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  console.error('Stack trace:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// Single instance lock - prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Focus window if user tries to run a second instance
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
        // On macOS re-create window when dock icon is clicked
        if (mainWindow === null) createWindow();
      });
    })
    .catch(console.log);
}
