import { useEffect } from 'react';
import { useTerminalStore } from './store/terminalStore';
import Topbar from './components/Topbar';
import TerminalCard from './components/TerminalCard';
import './App.css';

export default function App() {
  const terminals = useTerminalStore((state) => state.terminals);
  const addTerminal = useTerminalStore((state) => state.addTerminal);
  const focusedTerminalId = useTerminalStore((state) => state.focusedTerminalId);
  const setFocusedTerminal = useTerminalStore((state) => state.setFocusedTerminal);
  const activeTerminalId = useTerminalStore((state) => state.activeTerminalId);
  const setActiveTerminal = useTerminalStore((state) => state.setActiveTerminal);
  const navigateTerminalUp = useTerminalStore((state) => state.navigateTerminalUp);
  const navigateTerminalDown = useTerminalStore((state) => state.navigateTerminalDown);

  // Initialize with one terminal if none exist
  useEffect(() => {
    if (terminals.length === 0) {
      addTerminal();
    }
  }, []);

  // Set initial active terminal
  useEffect(() => {
    if (terminals.length > 0 && !activeTerminalId) {
      setActiveTerminal(terminals[0].id);
    }
  }, [terminals.length, activeTerminalId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to exit focus mode
      if (e.key === 'Escape' && focusedTerminalId !== null) {
        setFocusedTerminal(null);
      }
      // Cmd+Option+ArrowUp/Down for terminal navigation
      else if (e.metaKey && e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        if (e.key === 'ArrowUp') {
          navigateTerminalUp();
        } else {
          navigateTerminalDown();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedTerminalId, setFocusedTerminal, navigateTerminalUp, navigateTerminalDown]);

  const hasFocusedTerminal = focusedTerminalId !== null;

  return (
    <div className="flex flex-col h-screen text-white">
      {/* Global invisible draggable bar at the top */}
      <div className="fixed top-0 left-0 right-0 h-3 draggable-region z-50 pointer-events-none" />

      {/* Top Bar */}
      <Topbar />

      {/* Terminal Grid */}
      <div className="flex-1 overflow-auto relative">
        {/* Backdrop for focused terminal */}
        {hasFocusedTerminal && (
          <div
            className="fixed inset-0 z-40 bg-white/10 pointer-events-auto animate-in fade-in duration-300"
            onClick={() => setFocusedTerminal(null)}
          />
        )}

        <div
          className="grid auto-rows-fr"
          style={{
            gridTemplateColumns: `repeat(${
              terminals.length === 1 ? 1 : terminals.length <= 2 ? 2 : terminals.length <= 4 ? 2 : 4
            }, minmax(0, 1fr))`,
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
                      isActive={true}
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
