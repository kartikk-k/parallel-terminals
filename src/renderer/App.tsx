import { useEffect } from 'react';
import { useTerminalStore } from './store/terminalStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { GRID_LAYOUT } from './constants';
import { terminalManager } from './services/TerminalManager';
import Topbar from './components/Topbar';
import TerminalCard from './components/TerminalCard';
import './App.css';

/**
 * Main application component that manages the terminal grid layout
 * and global keyboard shortcuts
 */
export default function App() {
  const terminals = useTerminalStore((state) => state.terminals);
  const addTerminal = useTerminalStore((state) => state.addTerminal);
  const focusedTerminalId = useTerminalStore((state) => state.focusedTerminalId);
  const setFocusedTerminal = useTerminalStore((state) => state.setFocusedTerminal);
  const activeTerminalId = useTerminalStore((state) => state.activeTerminalId);
  const setActiveTerminal = useTerminalStore((state) => state.setActiveTerminal);
  const navigateTerminalUp = useTerminalStore((state) => state.navigateTerminalUp);
  const navigateTerminalDown = useTerminalStore((state) => state.navigateTerminalDown);
  const saveTerminalContent = useTerminalStore((state) => state.saveTerminalContent);

  // Initialize with one terminal if none exist
  useEffect(() => {
    if (terminals.length === 0) {
      addTerminal();
    }
  }, [terminals.length, addTerminal]);

  // Set initial active terminal
  useEffect(() => {
    if (terminals.length > 0 && !activeTerminalId) {
      setActiveTerminal(terminals[0].id);
    }
  }, [terminals.length, activeTerminalId, setActiveTerminal, terminals]);

  // Save terminal content before app quits
  useEffect(() => {
    const handleBeforeQuit = () => {
      // Save all terminal content to persistent storage
      terminals.forEach((terminal) => {
        const content = terminalManager.getTerminalContent(terminal.id);
        if (content) {
          saveTerminalContent(terminal.id, content);
        }
      });
    };

    const unsubscribe = window.electron?.ipcRenderer.on('app-before-quit', handleBeforeQuit);

    // Also save on browser beforeunload (covers edge cases)
    window.addEventListener('beforeunload', handleBeforeQuit);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeQuit);
    };
  }, [terminals, saveTerminalContent]);

  // Setup global keyboard shortcuts
  useKeyboardShortcuts({
    onNewTerminal: addTerminal,
    onNavigateLeft: navigateTerminalUp,
    onNavigateRight: navigateTerminalDown,
    onExitFocus: () => setFocusedTerminal(null),
    focusedTerminalId,
  });

  const hasFocusedTerminal = focusedTerminalId !== null;

  return (
    <div className="flex flex-col h-screen text-white">
      {/* Global draggable region for window movement */}
      <div className="fixed top-0 left-0 right-0 h-3 draggable-region z-50 pointer-events-none" />

      <Topbar />

      {/* Terminal Grid */}
      <div className="flex-1 overflow-auto relative">
        {/* Backdrop overlay when a terminal is focused */}
        {hasFocusedTerminal && (
          <div
            className="fixed inset-0 z-40 bg-white/10 pointer-events-auto animate-in fade-in duration-300"
            onClick={() => setFocusedTerminal(null)}
          />
        )}

        <div
          className="grid auto-rows-fr"
          style={{
            gridTemplateColumns: `repeat(${GRID_LAYOUT.getColumns(terminals.length)}, minmax(0, 1fr))`,
            minHeight: '100%',
          }}
        >
          {terminals.map((terminal) => {
            const isFocused = terminal.id === focusedTerminalId;

            return (
              <div
                key={terminal.id}
                className="min-h-[300px] relative"
                style={{
                  gridColumn: isFocused ? '1 / -1' : undefined,
                  gridRow: isFocused ? '1 / -1' : undefined,
                }}
              >
                <div
                  className={`h-full ${
                    isFocused
                      ? 'fixed inset-0 z-50 p-8 flex items-center justify-center pointer-events-auto'
                      : 'relative'
                  }`}
                >
                  <div
                    className={`h-full ${
                      isFocused
                        ? 'w-[90%] h-[90%] shadow-2xl rounded-lg overflow-hidden bg-neutral-900/80 backdrop-blur-sm'
                        : 'w-full'
                    }`}
                  >
                    <TerminalCard
                      terminalId={terminal.id}
                      workingDirectory={terminal.workingDirectory}
                      isActive={terminal.id === activeTerminalId}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
