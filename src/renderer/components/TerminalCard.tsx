import { useState, useRef, useEffect } from 'react';
import { useTerminalStore } from '../store/terminalStore';
import Terminal from './Terminal';

interface TerminalCardProps {
  terminalId: string;
  workingDirectory: string;
  isActive: boolean;
}

export default function TerminalCard({ terminalId, workingDirectory, isActive }: TerminalCardProps) {
  const removeTerminal = useTerminalStore((state) => state.removeTerminal);
  const renameTerminal = useTerminalStore((state) => state.renameTerminal);
  const terminalName = useTerminalStore((state) =>
    state.terminals.find((t) => t.id === terminalId)?.name
  );

  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(terminalName || 'Terminal');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleClose = () => {
    // Send destroy signal to main process
    window.electron?.ipcRenderer.sendMessage('terminal-destroy', terminalId);
    removeTerminal(terminalId);
  };

  const handleRenameStart = () => {
    setNameInput(terminalName || 'Terminal');
    setIsRenaming(true);
  };

  const handleRenameSubmit = () => {
    const trimmedName = nameInput.trim();
    if (trimmedName) {
      renameTerminal(terminalId, trimmedName);
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setNameInput(terminalName || 'Terminal');
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden border-b border-r border-black/20">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-2 py-2 bg-neutral-700/40 border-b border-black/20">
        <div className="flex items-center gap-2 text-xs text-white/70">
          <svg xmlns="http://www.w3.org/2000/svg" className='size-3.5' width="18" height="18" viewBox="0 0 18 18"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" stroke="currentColor"><polyline points="2.75 14.25 8 9 2.75 3.75"></polyline><line x1="9.5" y1="14.25" x2="15.25" y2="14.25"></line></g></svg>
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleKeyDown}
              className="bg-neutral-600/50 text-white/90 px-1.5 py-0.5 rounded text-xs outline-none focus:ring-1 focus:ring-white/30"
              maxLength={30}
            />
          ) : (
            <span
              onDoubleClick={handleRenameStart}
              className="cursor-text"
              title="Double-click to rename"
            >
              {terminalName || 'Terminal'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Rename button */}
          <button
            onClick={handleRenameStart}
            className="opacity-30 hover:opacity-100"
            title="Rename terminal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" stroke="currentColor"><path d="M13.7499 2.24988L15.7499 4.24988L6.99988 13H4.99988V10.9999L13.7499 2.24988Z"></path><path d="M12.5 3.5L14.5 5.5"></path></g></svg>
          </button>

          {/* Delete button */}
          <button
            onClick={handleClose}
            className="opacity-30 hover:opacity-100 hover:text-red-500"
            title="Close terminal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" stroke="currentColor"><path d="M2.75 4.75H15.25"></path> <path d="M6.75 4.75V2.75C6.75 2.2 7.198 1.75 7.75 1.75H10.25C10.802 1.75 11.25 2.2 11.25 2.75V4.75"></path> <path d="M7.375 8.75L7.59219 13.25"></path> <path d="M10.625 8.75L10.4078 13.25"></path> <path d="M13.6977 7.75L13.35 14.35C13.294 15.4201 12.416 16.25 11.353 16.25H6.64804C5.58404 16.25 4.70703 15.42 4.65103 14.35L4.30334 7.75"></path></g></svg>
          </button>
        </div>
      </div>

{/* path */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-700/40 text-xs text-white/70 font-mono border-b border-white/40">
        <div className="flex items-center gap-3">
          <span title={workingDirectory} className="truncate max-w-xs">
            {workingDirectory.replace(window.electron.homeDir || '~', '~')}
          </span>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 relative bg-neutral-900/50">
        <div className="absolute inset-0 p-1">
          <Terminal
            terminalId={terminalId}
            workingDirectory={workingDirectory}
            isActive={isActive}
          />
        </div>
      </div>
    </div>
  );
}
