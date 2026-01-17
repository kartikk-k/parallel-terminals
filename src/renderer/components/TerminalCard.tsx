import { useState, useRef, useEffect } from 'react';
import { useTerminalStore } from '../store/terminalStore';
import { terminalManager } from '../services/TerminalManager';
import Terminal from './Terminal';

interface TerminalCardProps {
  terminalId: string;
  workingDirectory: string;
  isActive: boolean;
}

export default function TerminalCard({ terminalId, workingDirectory, isActive }: TerminalCardProps) {
  const removeTerminal = useTerminalStore((state) => state.removeTerminal);
  const renameTerminal = useTerminalStore((state) => state.renameTerminal);
  const setFocusedTerminal = useTerminalStore((state) => state.setFocusedTerminal);
  const setActiveTerminal = useTerminalStore((state) => state.setActiveTerminal);
  const focusedTerminalId = useTerminalStore((state) => state.focusedTerminalId);
  const activeTerminalId = useTerminalStore((state) => state.activeTerminalId);
  const terminalName = useTerminalStore((state) =>
    state.terminals.find((t) => t.id === terminalId)?.name
  );

  const isFocused = focusedTerminalId === terminalId;
  const isActiveTerminal = activeTerminalId === terminalId;

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

  const handleToggleFocus = () => {
    if (isFocused) {
      setFocusedTerminal(null);
    } else {
      setFocusedTerminal(terminalId);
    }
  };

  const handleCardClick = () => {
    setActiveTerminal(terminalId);
    // Focus the terminal after a short delay to ensure it's active
    setTimeout(() => {
      terminalManager.focusTerminal(terminalId);
    }, 50);
  };

  return (
    <div
      className={`flex flex-col h-full overflow-hidden transition-all duration-300 border-r border-white/10 ring ring-inset ${
        isActiveTerminal ? 'ring-blue-500/80' : 'ring-transparent'

      }`}
      onClick={handleCardClick}
    >
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
              className="bg-neutral-600/50 text-white/90 px-1.5 rounded text-xs outline-none focus:ring-1 focus:ring-white/30"
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

        <div className="flex items-center gap-3">
          {/* Rename button */}
          <button
            onClick={handleRenameStart}
            className="opacity-30 hover:opacity-100"
            title="Rename terminal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" stroke="currentColor"><path d="m10.411,1.589h0c.759.759.759,1.991,0,2.75l-5.281,5.281c-.249.249-.559.428-.899.518l-3.231.862.862-3.231c.091-.34.269-.65.518-.899L7.661,1.589c.759-.759,1.991-.759,2.75,0Z"></path><line x1="11.25" y1="10.75" x2="7.25" y2="10.75"></line></g></svg>
          </button>

          {/* Focus button */}
          <button
            onClick={handleToggleFocus}
            className={`opacity-30 hover:opacity-100 transition-all`}
            title={isFocused ? 'Exit focus mode' : 'Focus terminal'}
          >
            {isFocused ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" stroke="currentColor"><polyline points="15.25 7.25 10.75 7.25 10.75 2.75"></polyline><line x1="10.75" y1="7.25" x2="15.25" y2="2.75"></line><polyline points="7.25 15.25 7.25 10.75 2.75 10.75"></polyline><line x1="7.25" y1="10.75" x2="2.75" y2="15.25"></line></g></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" stroke="currentColor"><path d="M1.75,6.75v-2c0-1.105,.895-2,2-2h2"></path><path d="M12.25,2.75h2c1.105,0,2,.895,2,2v2"></path><path d="M16.25,11.25v2c0,1.105-.895,2-2,2h-2"></path><path d="M5.75,15.25H3.75c-1.105,0-2-.895-2-2v-2"></path></g></svg>
            )}
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
