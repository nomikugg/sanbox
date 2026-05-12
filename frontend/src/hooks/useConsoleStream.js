import { useEffect, useRef } from 'react';
import { onExecutionStdout, onExecutionStderr } from '../ipc/client.js';

/**
 * Sets up persistent Tauri event listeners for execution streaming.
 * Listeners are mounted once and live for the component's lifetime.
 *
 * @param {{ onLog: (payload: object) => void }} options
 */
export function useConsoleStream({ onLog }) {
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  useEffect(() => {
    let unlistenOut;
    let unlistenErr;
    let cancelled = false;

    const setup = async () => {
      try {
        unlistenOut = await onExecutionStdout((payload) => {
          if (!cancelled) onLogRef.current(payload);
        });
        unlistenErr = await onExecutionStderr((payload) => {
          if (!cancelled) onLogRef.current(payload);
        });
      } catch {
        // Running outside Tauri (browser dev mode) — streaming not available
      }
    };

    setup();

    return () => {
      cancelled = true;
      unlistenOut?.();
      unlistenErr?.();
    };
  }, []); // mount once
}
