// contexts/StatusBarContext.jsx
import { createContext, useContext, useState, useMemo } from 'react';

const StatusBarContext = createContext(null);

export function StatusBarProvider({ children }) {
  const [status, setStatus] = useState('idle'); // idle, running, debugging, error
  const [leftContent, setLeftContent] = useState(null);
  const [rightContent, setRightContent] = useState(null);
  const [metrics, setMetrics] = useState({
    executionTime: 0,
    memoryBytes: 0,
    cpuMs: 0,
  });

  const value = useMemo(() => ({
    status,
    setStatus,
    metrics,
    setMetrics,
    leftContent,
    setLeftContent,
    rightContent,
    setRightContent,
  }), [status, metrics, leftContent, rightContent]);

  return (
    <StatusBarContext.Provider value={value}>
      {children}
    </StatusBarContext.Provider>
  );
}

export function useStatusBar() {
  const context = useContext(StatusBarContext);
  if (!context) {
    throw new Error('useStatusBar must be used within a StatusBarProvider');
  }
  return context;
}