import { useState } from 'react';
import { useTerminalStore } from '../store/terminalStore';

export default function Topbar() {
  const { addTerminal, defaultDirectory, setDefaultDirectory } = useTerminalStore();
  const [isSelectingDirectory, setIsSelectingDirectory] = useState(false);

  const handleAddTerminal = () => {
    addTerminal();
  };

  const handleSelectDirectory = async () => {
    setIsSelectingDirectory(true);
    try {
      // Use electron dialog to select directory
      const result = await window.electron.ipcRenderer.invoke('dialog:openDirectory');
      if (result && !result.canceled && result.filePaths.length > 0) {
        setDefaultDirectory(result.filePaths[0]);
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    } finally {
      setIsSelectingDirectory(false);
    }
  };

  const handleClearDirectory = () => {
    setDefaultDirectory(null);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-neutral-800/40 border-b border-white/20">
      {/* Left: App Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-white/80"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10l3 3 3-3" />
          </svg>
          <h1 className="text-lg font-semibold text-white/90">Parallel Terminals</h1>
        </div>
      </div>

      {/* Center: Directory Selector */}
      <div className="flex items-center gap-2">
        {defaultDirectory ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700/40 rounded-lg border border-white/10">
            <svg
              className="w-4 h-4 text-white/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <span className="text-sm text-white/70 max-w-xs truncate" title={defaultDirectory}>
              {defaultDirectory.replace(window.electron.homeDir || '~', '~')}
            </span>
            <button
              onClick={handleClearDirectory}
              className="p-0.5 hover:bg-white/10 rounded transition-colors"
              title="Clear default directory"
            >
              <svg
                className="w-3.5 h-3.5 text-white/60 hover:text-white/90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={handleSelectDirectory}
            disabled={isSelectingDirectory}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700/40 hover:bg-neutral-700/60 rounded-lg border border-white/10 transition-colors text-sm text-white/70 hover:text-white/90"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <span>{isSelectingDirectory ? 'Selecting...' : 'Set Starting Directory'}</span>
          </button>
        )}
      </div>

      {/* Right: Add Terminal Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleAddTerminal}
          className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white/90"
          title="Add new terminal"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium">New Terminal</span>
        </button>
      </div>
    </div>
  );
}
