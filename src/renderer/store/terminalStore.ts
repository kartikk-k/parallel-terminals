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
  addTerminal: (workingDirectory?: string) => void;
  removeTerminal: (id: string) => void;
  renameTerminal: (id: string, name: string) => void;
  setDefaultDirectory: (directory: string | null) => void;
}

export const useTerminalStore = create<TerminalStore>()(
  persist(
    (set, get) => ({
      terminals: [],
      defaultDirectory: null,

      addTerminal: (workingDirectory?: string) => {
        const { terminals, defaultDirectory } = get();
        const newTerminal: Terminal = {
          id: `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          workingDirectory: workingDirectory || defaultDirectory || window.electron.homeDir || '~',
        };
        set({ terminals: [...terminals, newTerminal] });
      },

      removeTerminal: (id: string) => {
        const { terminals } = get();
        // Don't allow removing the last terminal
        if (terminals.length <= 1) return;

        set({ terminals: terminals.filter((t) => t.id !== id) });
      },

      renameTerminal: (id: string, name: string) => {
        const { terminals } = get();
        set({
          terminals: terminals.map((t) =>
            t.id === id ? { ...t, name } : t
          ),
        });
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
