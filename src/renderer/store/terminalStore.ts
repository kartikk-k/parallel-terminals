import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Terminal {
  id: string;
  workingDirectory: string;
  name?: string;
}

interface TerminalStore {
  terminals: Terminal[];
  defaultDirectory: string | null;
  focusedTerminalId: string | null;
  activeTerminalId: string | null;
  addTerminal: (workingDirectory?: string) => void;
  removeTerminal: (id: string) => void;
  renameTerminal: (id: string, name: string) => void;
  setFocusedTerminal: (id: string | null) => void;
  setActiveTerminal: (id: string | null) => void;
  navigateTerminalUp: () => void;
  navigateTerminalDown: () => void;
  setDefaultDirectory: (directory: string | null) => void;
}

export const useTerminalStore = create<TerminalStore>()(
  persist(
    (set, get) => ({
      terminals: [],
      defaultDirectory: null,
      focusedTerminalId: null,
      activeTerminalId: null,

      addTerminal: (workingDirectory?: string) => {
        const { terminals, defaultDirectory } = get();
        const newTerminal: Terminal = {
          id: `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          workingDirectory: workingDirectory || defaultDirectory || window.electron.homeDir || '~',
        };
        const newTerminals = [...terminals, newTerminal];
        set({
          terminals: newTerminals,
          activeTerminalId: newTerminal.id
        });
      },

      removeTerminal: (id: string) => {
        const { terminals, activeTerminalId } = get();
        // Don't allow removing the last terminal
        if (terminals.length <= 1) return;

        const newTerminals = terminals.filter((t) => t.id !== id);
        // If the active terminal was removed, set the active to the first one
        const newActiveId = activeTerminalId === id ? newTerminals[0]?.id || null : activeTerminalId;
        set({ terminals: newTerminals, activeTerminalId: newActiveId });
      },

      renameTerminal: (id: string, name: string) => {
        const { terminals } = get();
        set({
          terminals: terminals.map((t) =>
            t.id === id ? { ...t, name } : t
          ),
        });
      },

      setFocusedTerminal: (id: string | null) => {
        set({ focusedTerminalId: id });
      },

      setActiveTerminal: (id: string | null) => {
        set({ activeTerminalId: id });
      },

      navigateTerminalUp: () => {
        const { terminals, activeTerminalId } = get();
        if (terminals.length === 0) return;

        const currentIndex = terminals.findIndex((t) => t.id === activeTerminalId);
        if (currentIndex === -1) {
          // If no active terminal, go to first terminal
          set({ activeTerminalId: terminals[0].id });
        } else if (currentIndex > 0) {
          // Move to previous terminal (only if not at the start)
          set({ activeTerminalId: terminals[currentIndex - 1].id });
        }
        // Do nothing if already at the first terminal (currentIndex === 0)
      },

      navigateTerminalDown: () => {
        const { terminals, activeTerminalId } = get();
        if (terminals.length === 0) return;

        const currentIndex = terminals.findIndex((t) => t.id === activeTerminalId);
        if (currentIndex === -1) {
          // If no active terminal, go to first terminal
          set({ activeTerminalId: terminals[0].id });
        } else if (currentIndex < terminals.length - 1) {
          // Move to next terminal (only if not at the end)
          set({ activeTerminalId: terminals[currentIndex + 1].id });
        }
        // Do nothing if already at the last terminal (currentIndex === terminals.length - 1)
      },

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
