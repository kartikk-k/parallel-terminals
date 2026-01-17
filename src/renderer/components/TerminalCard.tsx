import { useTerminalStore } from '../store/terminalStore';
import Terminal from './Terminal';

interface TerminalCardProps {
  terminalId: string;
  workingDirectory: string;
  isActive: boolean;
}

export default function TerminalCard({ terminalId, workingDirectory, isActive }: TerminalCardProps) {
  const removeTerminal = useTerminalStore((state) => state.removeTerminal);

  const handleClose = () => {
    // Send destroy signal to main process
    window.electron?.ipcRenderer.sendMessage('terminal-destroy', terminalId);
    removeTerminal(terminalId);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-800/40 rounded-lg overflow-hidden border border-white/10">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-900/60 border-b border-white/20">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
          </svg>
          <span>Terminal</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Split button */}
          <button
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="Split terminal"
          >
            <svg
              className="w-4 h-4 text-white/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 4h6v16H9V4z" />
            </svg>
          </button>

          {/* Delete button */}
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
            title="Close terminal"
          >
            <svg
              className="w-4 h-4 text-white/70 hover:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          {/* More options */}
          <button
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="More options"
          >
            <svg
              className="w-4 h-4 text-white/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="1" fill="currentColor" />
              <circle cx="12" cy="5" r="1" fill="currentColor" />
              <circle cx="12" cy="19" r="1" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 bg-neutral-900/60 relative">
        <div className="absolute inset-0">
          <Terminal
            terminalId={terminalId}
            workingDirectory={workingDirectory}
            isActive={isActive}
          />
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900/60 border-t border-white/20 text-xs text-white/50">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Terminal
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span title={workingDirectory} className="truncate max-w-xs">
            {workingDirectory.replace(window.electron.homeDir || '~', '~')}
          </span>
        </div>
      </div>
    </div>
  );
}
