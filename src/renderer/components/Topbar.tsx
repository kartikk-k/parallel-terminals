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
         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><g fill="currentColor"><path d="M13.25,2H4.75c-1.517,0-2.75,1.233-2.75,2.75V13.25c0,1.517,1.233,2.75,2.75,2.75H13.25c1.517,0,2.75-1.233,2.75-2.75V4.75c0-1.517-1.233-2.75-2.75-2.75ZM6.28,12.78c-.146,.146-.338,.22-.53,.22s-.384-.073-.53-.22c-.293-.293-.293-.768,0-1.061l1.97-1.97-1.97-1.97c-.293-.293-.293-.768,0-1.061s.768-.293,1.061,0l2.5,2.5c.293,.293,.293,.768,0,1.061l-2.5,2.5Zm5.97,.22h-2.5c-.414,0-.75-.336-.75-.75s.336-.75,.75-.75h2.5c.414,0,.75,.336,.75,.75s-.336,.75-.75,.75Z"></path></g></svg>
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
          title="Add new terminal (⌘N)"
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
          <span className="text-xs text-white/50">⌘N</span>
        </button>
      </div>
    </div>
  );
}
