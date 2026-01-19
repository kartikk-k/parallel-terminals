import { useState, useRef, useEffect } from 'react';
import { useTerminalStore, BORDER_COLOR_OPTIONS, TerminalBorderColor } from '../store/terminalStore';
import { terminalManager } from '../services/TerminalManager';
import Terminal from './Terminal';

interface TerminalCardProps {
  terminalId: string;
  workingDirectory: string;
  isActive: boolean;
}

/**
 * Terminal card component that provides a header with controls
 * (rename, focus, close) and wraps the Terminal component
 */
export default function TerminalCard({ terminalId, workingDirectory, isActive }: TerminalCardProps) {
  const removeTerminal = useTerminalStore((state) => state.removeTerminal);
  const renameTerminal = useTerminalStore((state) => state.renameTerminal);
  const setTerminalBorderColor = useTerminalStore((state) => state.setTerminalBorderColor);
  const setFocusedTerminal = useTerminalStore((state) => state.setFocusedTerminal);
  const setActiveTerminal = useTerminalStore((state) => state.setActiveTerminal);
  const focusedTerminalId = useTerminalStore((state) => state.focusedTerminalId);
  const activeTerminalId = useTerminalStore((state) => state.activeTerminalId);
  const terminal = useTerminalStore((state) =>
    state.terminals.find((t) => t.id === terminalId)
  );
  const terminalName = terminal?.name;
  const borderColor = terminal?.borderColor || 'none';

  const isFocused = focusedTerminalId === terminalId;
  const isActiveTerminal = activeTerminalId === terminalId;

  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(terminalName || 'Terminal');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Auto-focus rename input when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  const handleClose = () => {
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
    setFocusedTerminal(isFocused ? null : terminalId);
  };

  const handleColorChange = (color: TerminalBorderColor) => {
    setTerminalBorderColor(terminalId, color);
    setShowColorPicker(false);
  };

  // Get the ring class for the current border color
  const currentColorOption = BORDER_COLOR_OPTIONS.find((opt) => opt.value === borderColor);
  const ringClass = currentColorOption?.ringClass || 'ring-transparent';

  const handleCardClick = () => {
    setActiveTerminal(terminalId);
    setTimeout(() => {
      // Don't steal focus if user is interacting with an input field
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      terminalManager.focusTerminal(terminalId);
    }, 50);
  };

  return (
    <div
      className={`flex flex-col h-full overflow-hidden transition-all duration-300 border-r border-white/10 ring ring-inset ${ringClass}`}
      onClick={handleCardClick}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-2 py-2 bg-neutral-700/40 border-b border-black/20">
        <div className="flex items-center gap-2 text-xs text-white/70">
          <svg xmlns="http://www.w3.org/2000/svg" className='size-3.5' width="18" height="18" viewBox="0 0 18 18"><g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" stroke="currentColor"><polyline points="2.75 14.25 8 9 2.75 3.75"></polyline><line x1="9.5" y1="14.25" x2="15.25" y2="14.25"></line></g></svg>
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
          {/* Color picker button */}
          <div className="relative" ref={colorPickerRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="opacity-30 hover:opacity-100 flex items-center justify-center"
              title="Set border color"
            >
              <div className={`w-3 h-3 rounded-full border border-white/30 ${
                borderColor === 'none' ? 'bg-neutral-500' :
                borderColor === 'blue' ? 'bg-blue-500' :
                borderColor === 'green' ? 'bg-green-500' :
                borderColor === 'purple' ? 'bg-purple-500' :
                borderColor === 'orange' ? 'bg-orange-500' :
                'bg-pink-500'
              }`} />
            </button>

            {/* Color picker dropdown */}
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-neutral-800 rounded-lg shadow-lg border border-white/10 z-50 flex gap-1.5">
                {BORDER_COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColorChange(option.value);
                    }}
                    className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${
                      borderColor === option.value ? 'border-white' : 'border-transparent'
                    } ${
                      option.value === 'none' ? 'bg-neutral-500' :
                      option.value === 'blue' ? 'bg-blue-500' :
                      option.value === 'green' ? 'bg-green-500' :
                      option.value === 'purple' ? 'bg-purple-500' :
                      option.value === 'orange' ? 'bg-orange-500' :
                      'bg-pink-500'
                    }`}
                    title={option.label}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Rename button */}
          <button
            onClick={handleRenameStart}
            className="opacity-30 hover:opacity-100"
            title="Rename terminal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" stroke="currentColor"><path d="m10.411,1.589h0c.759.759.759,1.991,0,2.75l-5.281,5.281c-.249.249-.559.428-.899.518l-3.231.862.862-3.231c.091-.34.269-.65.518-.899L7.661,1.589c.759-.759,1.991-.759,2.75,0Z"></path><line x1="11.25" y1="10.75" x2="7.25" y2="10.75"></line></g></svg>
          </button>

          {/* Focus button */}
          <button
            onClick={handleToggleFocus}
            className={`opacity-30 hover:opacity-100 transition-all`}
            title={isFocused ? 'Exit focus mode' : 'Focus terminal'}
          >
            {isFocused ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" stroke="currentColor"><polyline points="15.25 7.25 10.75 7.25 10.75 2.75"></polyline><line x1="10.75" y1="7.25" x2="15.25" y2="2.75"></line><polyline points="7.25 15.25 7.25 10.75 2.75 10.75"></polyline><line x1="7.25" y1="10.75" x2="2.75" y2="15.25"></line></g></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" stroke="currentColor"><path d="M1.75,6.75v-2c0-1.105,.895-2,2-2h2"></path><path d="M12.25,2.75h2c1.105,0,2,.895,2,2v2"></path><path d="M16.25,11.25v2c0,1.105-.895,2-2,2h-2"></path><path d="M5.75,15.25H3.75c-1.105,0-2-.895-2-2v-2"></path></g></svg>
            )}
          </button>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="opacity-30 hover:opacity-100 hover:text-red-500"
            title="Close terminal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" stroke="currentColor"><path d="M2.75 4.75H15.25"></path> <path d="M6.75 4.75V2.75C6.75 2.2 7.198 1.75 7.75 1.75H10.25C10.802 1.75 11.25 2.2 11.25 2.75V4.75"></path> <path d="M7.375 8.75L7.59219 13.25"></path> <path d="M10.625 8.75L10.4078 13.25"></path> <path d="M13.6977 7.75L13.35 14.35C13.294 15.4201 12.416 16.25 11.353 16.25H6.64804C5.58404 16.25 4.70703 15.42 4.65103 14.35L4.30334 7.75"></path></g></svg>
          </button>
        </div>
      </div>

      {/* Working directory path */}
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
