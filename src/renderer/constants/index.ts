/**
 * Application-wide constants and configuration
 */

/**
 * Keyboard shortcuts used throughout the application
 */
export const KEYBOARD_SHORTCUTS = {
  NEW_TERMINAL: 'n',
  NAVIGATE_LEFT: 'ArrowLeft',
  NAVIGATE_RIGHT: 'ArrowRight',
  EXIT_FOCUS: 'Escape',
} as const;

/**
 * Terminal configuration
 */
export const TERMINAL_CONFIG = {
  DEFAULT_COLS: 80,
  DEFAULT_ROWS: 30,
  FONT_SIZE: 13,
  FONT_FAMILY: 'Menlo, Monaco, "Courier New", monospace',
  SCROLLBACK: 10000,
  FOCUS_DELAY: 100,
} as const;

/**
 * Grid layout configuration based on terminal count
 */
export const GRID_LAYOUT = {
  getColumns: (count: number): number => {
    if (count === 1) return 1;
    if (count <= 2) return 2;
    if (count <= 4) return 2;
    return 4;
  },
} as const;
