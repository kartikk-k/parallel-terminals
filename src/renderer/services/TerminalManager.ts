import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { TERMINAL_CONFIG } from '../constants';

interface TerminalInstance {
  xterm: XTerm;
  fitAddon: FitAddon;
  webglAddon?: WebglAddon;
  element: HTMLElement;
  isAttached: boolean;
  container: HTMLElement;
}

/**
 * Manages xterm.js terminal instances throughout their lifecycle
 * Handles creation, attachment, visibility, focus, resize, and cleanup
 */
class TerminalManager {
  private terminals: Map<string, TerminalInstance> = new Map();
  private dataSubscriptions: Map<string, () => void> = new Map();
  private resizeTimeouts: Map<string, number> = new Map();

  /**
   * Creates a new terminal instance
   * @param terminalId - Unique identifier for the terminal
   * @param workingDirectory - Initial working directory
   * @param container - DOM element to render the terminal into
   * @param savedContent - Optional saved content to restore from previous session
   */
  createTerminal(
    terminalId: string,
    workingDirectory: string,
    container: HTMLElement,
    savedContent?: string
  ): void {
    if (this.terminals.has(terminalId)) {
      this.attachTerminal(terminalId, container);
      return;
    }

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: TERMINAL_CONFIG.FONT_SIZE,
      fontFamily: TERMINAL_CONFIG.FONT_FAMILY,
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
      scrollback: TERMINAL_CONFIG.SCROLLBACK,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    const terminalElement = document.createElement('div');
    terminalElement.className = 'xterm-instance';
    terminalElement.style.width = '100%';
    terminalElement.style.height = '100%';
    terminalElement.style.display = 'none';
    container.appendChild(terminalElement);

    xterm.open(terminalElement);

    // Try to enable WebGL for better performance
    let webglAddon: WebglAddon | undefined;
    try {
      webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon?.dispose();
      });
      xterm.loadAddon(webglAddon);
    } catch (err) {
      // Fallback to canvas renderer
    }

    fitAddon.fit();

    this.terminals.set(terminalId, {
      xterm,
      fitAddon,
      webglAddon,
      element: terminalElement,
      isAttached: true,
      container,
    });

    // Restore saved content if available (before attaching to PTY)
    if (savedContent) {
      this.restoreContent(terminalId, savedContent);
    }

    this.setupIPCHandlers(terminalId, workingDirectory, xterm);
  }

  /**
   * Sets up IPC communication between renderer and main process
   */
  private setupIPCHandlers(
    terminalId: string,
    workingDirectory: string,
    xterm: XTerm
  ): void {
    // Handle incoming data from PTY
    const unsubscribeData = window.electron?.ipcRenderer.on(
      'terminal-data',
      (...args: unknown[]) => {
        const receivedTerminalId = args[0] as string;
        const data = args[1] as string;

        if (receivedTerminalId === terminalId) {
          xterm.write(data);
        }
      }
    );

    // Handle PTY exit
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

    // Send user input to PTY
    xterm.onData((data) => {
      window.electron?.ipcRenderer.sendMessage('terminal-input', terminalId, data);
    });

    // Store cleanup function
    this.dataSubscriptions.set(terminalId, () => {
      if (unsubscribeData) unsubscribeData();
      if (unsubscribeExit) unsubscribeExit();
    });

    // Attach to PTY process
    window.electron?.ipcRenderer.sendMessage('terminal-attach', terminalId, workingDirectory);
  }

  /**
   * Attaches an existing terminal to a new container
   */
  attachTerminal(sessionId: string, container: HTMLElement): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return;

    if (terminal.element.parentElement !== container) {
      container.appendChild(terminal.element);
      terminal.container = container;
    }
    terminal.isAttached = true;
  }

  /**
   * Detaches a terminal from its container without destroying it
   */
  detachTerminal(sessionId: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return;

    if (terminal.element.parentElement) {
      terminal.element.parentElement.removeChild(terminal.element);
    }
    terminal.isAttached = false;
  }

  /**
   * Shows a terminal and fits it to container size
   */
  showTerminal(sessionId: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return;

    terminal.element.style.display = 'block';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!terminal) return;
        terminal.fitAddon.fit();
        terminal.xterm.scrollToBottom();
        terminal.xterm.focus();

        // Notify PTY of terminal size
        if (terminal.xterm.rows && terminal.xterm.cols) {
          window.electron?.ipcRenderer.sendMessage('terminal-resize', sessionId, {
            cols: terminal.xterm.cols,
            rows: terminal.xterm.rows,
          });
        }
      });
    });
  }

  /**
   * Hides a terminal from view
   */
  hideTerminal(sessionId: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return;
    terminal.element.style.display = 'none';
  }

  /**
   * Gives keyboard focus to a terminal
   */
  focusTerminal(sessionId: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return;
    terminal.xterm.focus();
  }

  /**
   * Fits terminal to its container size
   */
  fitTerminal(sessionId: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal || !terminal.isAttached) return;

    const existingTimeout = this.resizeTimeouts.get(sessionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

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

  /**
   * Destroys a terminal instance and cleans up resources
   */
  destroyTerminal(sessionId: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return;

    // Clear pending resize timeout
    const timeout = this.resizeTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.resizeTimeouts.delete(sessionId);
    }

    // Cleanup IPC subscriptions
    const cleanup = this.dataSubscriptions.get(sessionId);
    if (cleanup) cleanup();
    this.dataSubscriptions.delete(sessionId);

    // Notify main process
    window.electron?.ipcRenderer.sendMessage('terminal-detach', sessionId);

    // Dispose WebGL addon if present
    if (terminal.webglAddon) {
      try {
        terminal.webglAddon.dispose();
      } catch (err) {
        // Ignore disposal errors
      }
    }

    // Dispose xterm instance
    terminal.xterm.dispose();

    // Remove DOM element
    if (terminal.element.parentElement) {
      terminal.element.parentElement.removeChild(terminal.element);
    }

    this.terminals.delete(sessionId);
  }

  /**
   * Checks if a terminal instance exists
   */
  hasTerminal(sessionId: string): boolean {
    return this.terminals.has(sessionId);
  }

  /**
   * Gets terminal buffer content as string
   */
  getTerminalContent(sessionId: string): string | null {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return null;

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

  /**
   * Restores previously saved content to terminal buffer
   * Writes content directly to xterm without sending to PTY
   */
  restoreContent(sessionId: string, content: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return;

    // Write the saved content to the terminal display
    // Use \r\n for proper line endings in terminal
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line || i < lines.length - 1) {
        terminal.xterm.write(line + (i < lines.length - 1 ? '\r\n' : ''));
      }
    }
  }

  /**
   * Gets all terminal IDs that have active instances
   */
  getAllTerminalIds(): string[] {
    return Array.from(this.terminals.keys());
  }
}

// Export singleton instance
export const terminalManager = new TerminalManager();
