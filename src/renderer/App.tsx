import { useEffect } from 'react';
import { useTerminalStore } from './store/terminalStore';
import Topbar from './components/Topbar';
import TerminalCard from './components/TerminalCard';
import './App.css';

export default function App() {
  const terminals = useTerminalStore((state) => state.terminals);
  const addTerminal = useTerminalStore((state) => state.addTerminal);

  // Initialize with one terminal if none exist
  useEffect(() => {
    if (terminals.length === 0) {
      addTerminal();
    }
  }, []);

  // Calculate grid columns based on number of terminals
  const getGridColumns = () => {
    if (terminals.length === 1) return 1;
    if (terminals.length <= 2) return 2;
    if (terminals.length <= 4) return 2;
    return 4; // Max 4 columns per row
  };

  const gridColumns = getGridColumns();

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white">
      {/* Global invisible draggable bar at the top */}
      <div className="fixed top-0 left-0 right-0 h-3 draggable-region z-50 pointer-events-none" />

      {/* Top Bar */}
      <Topbar />

      {/* Terminal Grid */}
      <div className="flex-1 p-2 overflow-auto">
        <div
          className="grid gap-2 auto-rows-fr"
          style={{
            gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
            minHeight: '100%',
          }}
        >
          {terminals.map((terminal) => (
            <div key={terminal.id} className="min-h-[300px]">
              <TerminalCard
                terminalId={terminal.id}
                workingDirectory={terminal.workingDirectory}
                isActive={true}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
