import { useEffect, useRef } from 'react';
import { terminalManager } from '../services/TerminalManager';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  terminalId: string;
  workingDirectory: string;
  isActive: boolean;
}

export default function Terminal({ terminalId, workingDirectory, isActive }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // Create terminal once when component mounts
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    console.log(`[Terminal ${terminalId}] Component mounted, creating terminal`);

    // Create terminal through manager
    terminalManager.createTerminal(terminalId, workingDirectory, containerRef.current);

    isInitializedRef.current = true;

    // Cleanup only when component truly unmounts (terminal deleted)
    return () => {
      console.log(`[Terminal ${terminalId}] Component unmounting, destroying terminal`);
      terminalManager.destroyTerminal(terminalId);
    };
  }, [terminalId]);

  // Handle visibility changes
  useEffect(() => {
    if (!isInitializedRef.current) return;

    if (isActive) {
      console.log(`[Terminal ${terminalId}] Showing terminal`);
      terminalManager.showTerminal(terminalId);
    } else {
      console.log(`[Terminal ${terminalId}] Hiding terminal`);
      terminalManager.hideTerminal(terminalId);
    }
  }, [isActive, terminalId]);

  // Handle resize when active
  useEffect(() => {
    if (!isActive || !isInitializedRef.current) return;

    const handleResize = () => {
      terminalManager.fitTerminal(terminalId);
    };

    // Debounced resize
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
      className={`w-full h-full p-2 ${isActive ? 'block' : 'hidden'}`}
      style={{ position: 'absolute', inset: 0 }}
    />
  );
}
