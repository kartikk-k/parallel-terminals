import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';

interface TerminalInstance {
  xterm: XTerm;
  fitAddon: FitAddon;
  webglAddon?: WebglAddon;
  element: HTMLElement;
  isAttached: boolean;
  container: HTMLElement;
}

class TerminalManager {
  private terminals: Map<string, TerminalInstance> = new Map();
  private dataSubscriptions: Map<string, () => void> = new Map();
  private resizeTimeouts: Map<string, number> = new Map();

  createTerminal(
    terminalId: string,
    workingDirectory: string,
    container: HTMLElement,
    onStatusUpdate?: (status: any) => void
  ): void {
    if (this.terminals.has(terminalId)) {
      // Terminal already exists, just reattach it
      console.log(`[TerminalManager] Terminal ${terminalId} already exists, reattaching`);
      this.attachTerminal(terminalId, container);
      return;
    }

    console.log(`[TerminalManager] Creating terminal ${terminalId}`);

    // Create xterm instance
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a00',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      allowProposedApi: true,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    // Create dedicated element for this terminal
    const terminalElement = document.createElement('div');
    terminalElement.className = 'xterm-instance';
    terminalElement.style.width = '100%';
    terminalElement.style.height = '100%';
    terminalElement.style.display = 'none'; // Hidden by default
    container.appendChild(terminalElement);

    xterm.open(terminalElement);

    // Try WebGL
    let webglAddon: WebglAddon | undefined;
    try {
      webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        console.warn(`[TerminalManager] WebGL context lost for ${terminalId}`);
      });
      xterm.loadAddon(webglAddon);
      console.log(`[TerminalManager] WebGL enabled for ${terminalId}`);
    } catch (err) {
      console.log(`[TerminalManager] Canvas renderer for ${terminalId}`);
    }

    fitAddon.fit();

    // Store instance
    this.terminals.set(terminalId, {
      xterm,
      fitAddon,
      webglAddon,
      element: terminalElement,
      isAttached: true,
      container,
    });

    // Setup IPC handlers
    this.setupIPCHandlers(terminalId, workingDirectory, xterm, onStatusUpdate);
  }

  private setupIPCHandlers(
    terminalId: string,
    workingDirectory: string,
    xterm: XTerm,
    onStatusUpdate?: (status: any) => void
  ): void {
    let terminalContent = '';

    // Data handler
    const unsubscribeData = window.electron?.ipcRenderer.on(
      'terminal-data',
      (...args: unknown[]) => {
        const receivedTerminalId = args[0] as string;
        const data = args[1] as string;

        if (receivedTerminalId === terminalId) {
          xterm.write(data);
          terminalContent += data;
          if (terminalContent.length > 10000) {
            terminalContent = terminalContent.slice(-10000);
          }
        }
      }
    );

    // Exit handler
    const unsubscribeExit = window.electron?.ipcRenderer.on(
      'terminal-exit',
      (...args: unknown[]) => {
        const receivedTerminalId = args[0] as string;
        const exitCode = args[1] as number;
        if (receivedTerminalId === terminalId) {
          xterm.write(`\r\n\r\n[Process exited with code ${exitCode}]\r\n`);
        }
      }
    );

    // Input handler
    xterm.onData((data) => {
      window.electron?.ipcRenderer.sendMessage('terminal-input', terminalId, data);
    });

    // Store cleanup function
    this.dataSubscriptions.set(terminalId, () => {
      if (unsubscribeData) unsubscribeData();
      if (unsubscribeExit) unsubscribeExit();
    });

    // Attach to PTY with working directory
    window.electron?.ipcRenderer.sendMessage('terminal-attach', terminalId, workingDirectory);
  }

  attachTerminal(sessionId: string, container: HTMLElement): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return;

    if (terminal.element.parentElement !== container) {
      container.appendChild(terminal.element);
      terminal.container = container;
    }
    terminal.isAttached = true;
  }

  detachTerminal(sessionId: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return;

    if (terminal.element.parentElement) {
      terminal.element.parentElement.removeChild(terminal.element);
    }
    terminal.isAttached = false;
  }

  showTerminal(sessionId: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return;

    terminal.element.style.display = 'block';

    // Fit and scroll on next frames
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!terminal) return;
        terminal.fitAddon.fit();
        terminal.xterm.scrollToBottom();
        terminal.xterm.focus();

        // Send resize to PTY
        if (terminal.xterm.rows && terminal.xterm.cols) {
          window.electron?.ipcRenderer.sendMessage('terminal-resize', sessionId, {
            cols: terminal.xterm.cols,
            rows: terminal.xterm.rows,
          });
        }
      });
    });
  }

  focusTerminal(sessionId: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return;
    terminal.xterm.focus();
  }

  hideTerminal(sessionId: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return;
    terminal.element.style.display = 'none';
  }

  fitTerminal(sessionId: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal || !terminal.isAttached) return;

    // Clear any pending resize
    const existingTimeout = this.resizeTimeouts.get(sessionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Debounce resize
    const timeout = window.setTimeout(() => {
      if (!terminal) return;

      terminal.fitAddon.fit();
      if (terminal.xterm.rows && terminal.xterm.cols) {
        window.electron?.ipcRenderer.sendMessage('terminal-resize', sessionId, {
          cols: terminal.xterm.cols,
          rows: terminal.xterm.rows,
        });
      }
      this.resizeTimeouts.delete(sessionId);
    }, 50);

    this.resizeTimeouts.set(sessionId, timeout);
  }

  destroyTerminal(sessionId: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return;

    console.log(`[TerminalManager] Destroying terminal for session ${sessionId}`);

    // Clear any pending resize
    const timeout = this.resizeTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.resizeTimeouts.delete(sessionId);
    }

    // Cleanup subscriptions
    const cleanup = this.dataSubscriptions.get(sessionId);
    if (cleanup) cleanup();
    this.dataSubscriptions.delete(sessionId);

    // Detach from PTY
    window.electron?.ipcRenderer.sendMessage('terminal-detach', sessionId);

    // Dispose xterm
    if (terminal.webglAddon) {
      try {
        terminal.webglAddon.dispose();
      } catch (err) {
        console.error(`[TerminalManager] WebGL dispose error for ${sessionId}:`, err);
      }
    }

    terminal.xterm.dispose();

    // Remove element
    if (terminal.element.parentElement) {
      terminal.element.parentElement.removeChild(terminal.element);
    }

    this.terminals.delete(sessionId);
  }

  hasTerminal(sessionId: string): boolean {
    return this.terminals.has(sessionId);
  }

  getTerminalContent(sessionId: string): string | null {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return null;

    // Get buffer content from xterm
    const buffer = terminal.xterm.buffer.active;
    let content = '';
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        content += line.translateToString(true) + '\n';
      }
    }
    return content;
  }
}

// Singleton instance
export const terminalManager = new TerminalManager();
