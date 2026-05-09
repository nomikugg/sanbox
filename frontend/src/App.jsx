// App.jsx
import { CustomTitlebar } from './components/CustomTitleBar.jsx';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar.jsx';
import CodeEditor from './components/editor/CodeEditor.jsx';
import ConsolePanel from './components/ConsolePanel.jsx';
import DebuggerPanel from './components/DebuggerPanel.jsx';
import RuntimeSelector from './components/RuntimeSelector.jsx';
import { initialState, appReducer } from './state/appState.js';
import useHotkeys from './hooks/useHotkeys.js';
import useIpc from './hooks/useIpc.js';
import AppSidebar from './components/AppSidebar.jsx';
import GroupIcons from './components/GroupIcons.jsx';
import { useStatusBar } from './contexts/StatusBarContext.jsx';
import StatusBar from './components/StatusBar.jsx';
import { Metrics } from './components/Metrics.jsx';

const starterCode = `const values = [1, 2, 3, 4];
console.log('My first Sandbox...');
console.log({ sum: values.reduce((acc, value) => acc + value, 0) });
`;

export default function App() {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    code: starterCode,
  });
  const ipc = useIpc();
  const { setStatus, setMetrics } = useStatusBar();
  
  // Actualizar StatusBar cuando cambie el estado
  useEffect(() => {
    if (state.isExecuting) {
      setStatus('running');
    } else if (state.isDebugging) {
      setStatus('debugging');
    } else if (state.error) {
      setStatus('error');
    } else {
      setStatus('idle');
    }
    
    setMetrics({
      executionTime: state.metrics.executionTime,
      memoryBytes: state.metrics.memoryBytes,
      cpuMs: state.metrics.cpuMs,
    });
  }, [state.isExecuting, state.isDebugging, state.error, state.metrics, setStatus, setMetrics]);
  
  useHotkeys({
    onRun: () => handleExecute(),
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  const activeSnippet = useMemo(
    () => state.history.find((item) => item.id === state.activeHistoryId) ?? null,
    [state.activeHistoryId, state.history],
  );
  
  async function handleExecute() {
    dispatch({ type: 'execution.start' });
    const startedAt = performance.now();
    try {
      const result = await ipc.executeCode({
        code: state.code,
        runtime: state.runtime,
        mode: state.securityMode,
      });
      const duration = Math.max(0, Math.round(performance.now() - startedAt));
      const normalized = {
        ...result,
        executionId: result.executionId ?? result.execution_id,
        memoryBytes: result.memoryBytes ?? result.memory_bytes ?? 0,
        cpuMs: result.cpuMs ?? result.cpu_ms ?? 0,
      };
      dispatch({
        type: 'execution.success',
        payload: {
          ...normalized,
          executionTime: duration,
        },
      });
    } catch (error) {
      dispatch({
        type: 'execution.failure',
        payload: {
          error: error?.message ?? String(error),
          executionTime: Math.max(0, Math.round(performance.now() - startedAt)),
        },
      });
    }
  }

  async function handleDebug() {
    dispatch({ type: 'debug.start' });
    try {
      const session = await ipc.debugCode({
        code: state.code,
        runtime: state.runtime,
      });
      dispatch({ type: 'debug.success', payload: session });
    } catch (error) {
      dispatch({ type: 'debug.failure', payload: error?.message ?? String(error) });
    }
  }
  
  async function handleStop() {
    await ipc.stopExecution(state.activeExecutionId);
    dispatch({ type: 'execution.stopped' });
  }
  
  const handleNewFile = () => {
    dispatch({ type: 'code.change', payload: starterCode });
    dispatch({ type: 'history.select', payload: null });
  };

  const handleOpenFolder = async () => {
    console.log('Abrir carpeta');
  };

  const handleSave = async () => {
    console.log('Guardar archivo');
  };

  if (!mounted) return null;
  
  return (
    <>
      <CustomTitlebar
        onExecute={handleExecute}
        onDebug={handleDebug}
        onStop={handleStop}
        isExecuting={state.isExecuting}
        isDebugging={state.isDebugging}
        activeExecutionId={state.activeExecutionId}
        onNewFile={handleNewFile}
        onOpenFolder={handleOpenFolder}
        onSave={handleSave}
      />
      
      <SidebarProvider defaultOpen={true}>
        <div className="flex flex-col h-screen w-full pt-10">  {/* ← Cambiar a flex-col */}
          
          {/* Contenido principal */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Sidebar */}
            <AppSidebar 
              history={state.history}
              snippets={state.snippets}
              activeHistoryId={state.activeHistoryId}
              onOpenSnippet={(snippet) => dispatch({ type: 'snippet.open', payload: snippet })}
              onSelectHistory={(id) => dispatch({ type: 'history.select', payload: id })}
            />
            
            {/* Workspace */}
            <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
              <header className="flex justify-between items-center gap-4 p-4 px-5 backdrop-blur-sm border-b border-border flex-shrink-0">
                <RuntimeSelector
                  runtime={state.runtime}
                  securityMode={state.securityMode}
                  onRuntimeChange={(runtime) => dispatch({ type: 'runtime.change', payload: runtime })}
                  onSecurityModeChange={(mode) => dispatch({ type: 'security.change', payload: mode })}
                />
                <GroupIcons
                  onDebug={handleDebug}
                  onExecute={handleExecute}
                  onStop={handleStop}
                  isDebugging={state.isDebugging}
                  isExecuting={state.isExecuting}
                  activeExecutionId={state.activeExecutionId}
                />
              </header>

              <section className="flex-1 min-h-0 grid grid-cols-[minmax(0,1fr)_360px] gap-4 p-4">
                <div className="bg-card/80 border border-border rounded-2xl shadow-lg overflow-hidden flex flex-col min-h-0">
                  <div className="p-3 px-4 text-muted-foreground text-xs uppercase tracking-wide border-b border-border flex-shrink-0">
                    Editor
                  </div>
                  <div className="flex-1 min-h-0">
                    <CodeEditor
                      value={state.code}
                      onChange={(code) => dispatch({ type: 'code.change', payload: code })}
                      onExecute={handleExecute}
                    />
                  </div>
                </div>

                <div className="bg-card/80 border border-border rounded-2xl shadow-lg overflow-hidden flex flex-col min-h-0">
                  <div className="p-3 px-4 text-muted-foreground text-xs uppercase tracking-wide border-b border-border flex-shrink-0">
                    Debugger
                  </div>
                  <div className="flex-1 overflow-auto">
                    <DebuggerPanel
                      debuggerState={state.debugger}
                      activeSnippet={activeSnippet}
                      onStep={() => dispatch({ type: 'debug.step' })}
                      onToggleBreakpoint={(line) => dispatch({ type: 'debug.breakpoint.toggle', payload: line })}
                    />
                  </div>
                </div>
              </section>

              <section className="h-64 flex-shrink-0 p-4 pt-0">  {/* ← Altura fija para Console */}
                <div className="bg-card/80 border border-border rounded-2xl shadow-lg overflow-hidden h-full">
                  <ConsolePanel 
                    logs={state.logs}
                    error={state.error}
                    metrics={state.metrics}
                    isExecuting={state.isExecuting}
                  />
                </div>
              </section>
            </main>
          </div>
          
          {/* StatusBar */}
          <StatusBar />
        </div>
      </SidebarProvider>
    </>
  );
}