import { useEffect, useRef } from 'react';
import { terminalManager } from '../services/TerminalManager';
import { TERMINAL_CONFIG } from '../constants';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  terminalId: string;
  workingDirectory: string;
  isActive: boolean;
  savedContent?: string;
  onContentRestored?: () => void;
}

/**
 * Terminal component that wraps xterm.js instance
 * Handles terminal lifecycle, visibility, and focus management
 */
export default function Terminal({ terminalId, workingDirectory, isActive, savedContent, onContentRestored }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // Create terminal instance once when component mounts
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    terminalManager.createTerminal(terminalId, workingDirectory, containerRef.current, savedContent);
    isInitializedRef.current = true;

    // Notify that content has been restored so it can be cleared from storage
    if (savedContent && onContentRestored) {
      onContentRestored();
    }

    // Cleanup when component unmounts
    return () => {
      terminalManager.destroyTerminal(terminalId);
    };
  }, [terminalId, workingDirectory]);

  // Show terminal once initialized
  useEffect(() => {
    if (!isInitializedRef.current) return;
    terminalManager.showTerminal(terminalId);
  }, [terminalId]);

  // Handle focus when terminal becomes active
  useEffect(() => {
    if (!isInitializedRef.current || !isActive) return;

    setTimeout(() => {
      // Don't steal focus if user is interacting with an input field
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      terminalManager.focusTerminal(terminalId);
    }, TERMINAL_CONFIG.FOCUS_DELAY);
  }, [isActive, terminalId]);

  // Handle resize when active
  useEffect(() => {
    if (!isActive || !isInitializedRef.current) return;

    const handleResize = () => {
      terminalManager.fitTerminal(terminalId);
    };

    let resizeTimeout: number;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(handleResize, 50);
    };

    window.addEventListener('resize', debouncedResize);

    const resizeObserver = new ResizeObserver(debouncedResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Initial fit when becoming active
    handleResize();

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', debouncedResize);
      resizeObserver.disconnect();
    };
  }, [isActive, terminalId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full p-2"
      style={{ position: 'absolute', inset: 0 }}
    />
  );
}
