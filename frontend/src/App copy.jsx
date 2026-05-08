import { useEffect, useMemo, useReducer, useState } from 'react';
import CodeEditor from './components/editor/CodeEditor.jsx';
import Explorer from './components/Explorer.jsx';
import ConsolePanel from './components/ConsolePanel.jsx';
import DebuggerPanel from './components/DebuggerPanel.jsx';
import RuntimeSelector from './components/RuntimeSelector.jsx';
import { initialState, appReducer } from './state/appState.js';
import useHotkeys from './hooks/useHotkeys.js';
import useIpc from './hooks/useIpc.js';
import { ThemeToggle } from './components/theme/theme-toggle.jsx';


const starterCode = `const values = [1, 2, 3, 4];
console.log('RunJS Pro ready');
console.log({ sum: values.reduce((acc, value) => acc + value, 0) });
`;

export default function App() {
  
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    code: starterCode,
  });
  const ipc = useIpc();
  
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
  
  if (!mounted) return null;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SB</div>
          <div>
            <div className="brand-title">Sandbox</div>
            <div className="brand-subtitle">Secure multi-runtime lab</div>
          </div>
        </div>
        <Explorer
          history={state.history}
          snippets={state.snippets}
          activeHistoryId={state.activeHistoryId}
          onOpenSnippet={(snippet) => dispatch({ type: 'snippet.open', payload: snippet })}
          onSelectHistory={(id) => dispatch({ type: 'history.select', payload: id })}
        />
      </aside>

      <main className="workspace">
        <header className="topbar">
          <RuntimeSelector
            runtime={state.runtime}
            securityMode={state.securityMode}
            onRuntimeChange={(runtime) => dispatch({ type: 'runtime.change', payload: runtime })}
            onSecurityModeChange={(mode) => dispatch({ type: 'security.change', payload: mode })}
          />
          <div className="topbar-actions">
            <ThemeToggle />
            <button className="ghost" onClick={handleDebug} disabled={state.isDebugging}>Debug</button>
            <button className="primary" onClick={handleExecute} disabled={state.isExecuting}>
              {state.isExecuting ? 'Running...' : 'Run'}
            </button>
            <button className="ghost" onClick={handleStop}>Stop</button>
          </div>
        </header>

        <section className="editor-grid">
          <div className="editor-pane">
            <div className="panel-header">Editor</div>
            <CodeEditor
              value={state.code}
              onChange={(code) => dispatch({ type: 'code.change', payload: code })}
              onExecute={handleExecute}
            />
          </div>

          <DebuggerPanel
            debuggerState={state.debugger}
            activeSnippet={activeSnippet}
            onStep={() => dispatch({ type: 'debug.step' })}
            onToggleBreakpoint={(line) => dispatch({ type: 'debug.breakpoint.toggle', payload: line })}
          />
        </section>

        <section className="bottom-grid">
          <ConsolePanel logs={state.logs} error={state.error} metrics={state.metrics} />
        </section>
      </main>
    </div>  
  );
}
