import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TerminalBorderColor = 'none' | 'blue' | 'green' | 'purple' | 'orange' | 'pink';

export const BORDER_COLOR_OPTIONS: { value: TerminalBorderColor; label: string; ringClass: string }[] = [
  { value: 'none', label: 'None', ringClass: 'ring-transparent' },
  { value: 'blue', label: 'Blue', ringClass: 'ring-blue-500/80' },
  { value: 'green', label: 'Green', ringClass: 'ring-green-500/80' },
  { value: 'purple', label: 'Purple', ringClass: 'ring-purple-500/80' },
  { value: 'orange', label: 'Orange', ringClass: 'ring-orange-500/80' },
  { value: 'pink', label: 'Pink', ringClass: 'ring-pink-500/80' },
];

export interface Terminal {
  id: string;
  workingDirectory: string;
  name?: string;
  borderColor?: TerminalBorderColor;
}

interface TerminalStore {
  terminals: Terminal[];
  defaultDirectory: string | null;
  focusedTerminalId: string | null;
  activeTerminalId: string | null;
  addTerminal: (workingDirectory?: string) => void;
  removeTerminal: (id: string) => void;
  renameTerminal: (id: string, name: string) => void;
  setTerminalBorderColor: (id: string, color: TerminalBorderColor) => void;
  setFocusedTerminal: (id: string | null) => void;
  setActiveTerminal: (id: string | null) => void;
  navigateTerminalUp: () => void;
  navigateTerminalDown: () => void;
  setDefaultDirectory: (directory: string | null) => void;
}

/**
 * Zustand store for managing terminal state
 * Persists terminals and default directory to localStorage
 */
export const useTerminalStore = create<TerminalStore>()(
  persist(
    (set, get) => ({
      terminals: [],
      defaultDirectory: null,
      focusedTerminalId: null,
      activeTerminalId: null,

      /**
       * Adds a new terminal with the specified or default working directory
       * Automatically sets the new terminal as active
       */
      addTerminal: (workingDirectory?: string) => {
        const { terminals, defaultDirectory } = get();
        const newTerminal: Terminal = {
          id: `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          workingDirectory: workingDirectory || defaultDirectory || window.electron.homeDir || '~',
        };
        set({
          terminals: [...terminals, newTerminal],
          activeTerminalId: newTerminal.id,
        });
      },

      /**
       * Removes a terminal by ID
       * Prevents removing the last terminal
       */
      removeTerminal: (id: string) => {
        const { terminals, activeTerminalId } = get();
        if (terminals.length <= 1) return;

        const newTerminals = terminals.filter((t) => t.id !== id);
        const newActiveId = activeTerminalId === id ? newTerminals[0]?.id || null : activeTerminalId;
        set({ terminals: newTerminals, activeTerminalId: newActiveId });
      },

      /**
       * Renames a terminal
       */
      renameTerminal: (id: string, name: string) => {
        const { terminals } = get();
        set({
          terminals: terminals.map((t) =>
            t.id === id ? { ...t, name } : t
          ),
        });
      },

      /**
       * Sets the border color for a terminal (for visual grouping)
       */
      setTerminalBorderColor: (id: string, color: TerminalBorderColor) => {
        const { terminals } = get();
        set({
          terminals: terminals.map((t) =>
            t.id === id ? { ...t, borderColor: color } : t
          ),
        });
      },

      /**
       * Sets the focused terminal (fullscreen mode)
       */
      setFocusedTerminal: (id: string | null) => {
        set({ focusedTerminalId: id });
      },

      /**
       * Sets the active terminal (receives keyboard input)
       */
      setActiveTerminal: (id: string | null) => {
        set({ activeTerminalId: id });
      },

      /**
       * Navigates to the previous terminal
       * Does not loop - stops at the first terminal
       */
      navigateTerminalUp: () => {
        const { terminals, activeTerminalId } = get();
        if (terminals.length === 0) return;

        const currentIndex = terminals.findIndex((t) => t.id === activeTerminalId);
        if (currentIndex === -1) {
          set({ activeTerminalId: terminals[0].id });
        } else if (currentIndex > 0) {
          set({ activeTerminalId: terminals[currentIndex - 1].id });
        }
      },

      /**
       * Navigates to the next terminal
       * Does not loop - stops at the last terminal
       */
      navigateTerminalDown: () => {
        const { terminals, activeTerminalId } = get();
        if (terminals.length === 0) return;

        const currentIndex = terminals.findIndex((t) => t.id === activeTerminalId);
        if (currentIndex === -1) {
          set({ activeTerminalId: terminals[0].id });
        } else if (currentIndex < terminals.length - 1) {
          set({ activeTerminalId: terminals[currentIndex + 1].id });
        }
      },

      /**
       * Sets the default directory for new terminals
       */
      setDefaultDirectory: (directory: string | null) => {
        set({ defaultDirectory: directory });
      },
    }),
    {
      name: 'terminal-storage',
      partialize: (state) => ({
        terminals: state.terminals,
        defaultDirectory: state.defaultDirectory,
      }),
    }
  )
);
