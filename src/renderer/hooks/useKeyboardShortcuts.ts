import { useEffect } from 'react';
import { KEYBOARD_SHORTCUTS } from '../constants';

interface KeyboardShortcutsConfig {
  onNewTerminal: () => void;
  onNavigateLeft: () => void;
  onNavigateRight: () => void;
  onExitFocus: () => void;
  focusedTerminalId: string | null;
}

/**
 * Custom hook to manage application-wide keyboard shortcuts
 *
 * Shortcuts:
 * - Cmd+N: Create new terminal
 * - Cmd+Option+ArrowLeft/Right: Navigate between terminals
 * - Escape: Exit focus mode
 */
export function useKeyboardShortcuts({
  onNewTerminal,
  onNavigateLeft,
  onNavigateRight,
  onExitFocus,
  focusedTerminalId,
}: KeyboardShortcutsConfig) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Exit focus mode with Escape
      if (e.key === KEYBOARD_SHORTCUTS.EXIT_FOCUS && focusedTerminalId !== null) {
        onExitFocus();
        return;
      }

      // Create new terminal with Cmd+N
      if (e.metaKey && e.key === KEYBOARD_SHORTCUTS.NEW_TERMINAL) {
        e.preventDefault();
        onNewTerminal();
        return;
      }

      // Navigate between terminals with Cmd+Option+Arrow
      if (e.metaKey && e.altKey) {
        if (e.key === KEYBOARD_SHORTCUTS.NAVIGATE_LEFT || e.key === KEYBOARD_SHORTCUTS.NAVIGATE_RIGHT) {
          e.preventDefault();

          // Blur any active input to allow terminal to receive focus
          const activeElement = document.activeElement;
          if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            (activeElement as HTMLElement).blur();
          }

          if (e.key === KEYBOARD_SHORTCUTS.NAVIGATE_LEFT) {
            onNavigateLeft();
          } else {
            onNavigateRight();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedTerminalId, onNewTerminal, onNavigateLeft, onNavigateRight, onExitFocus]);
}
