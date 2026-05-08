import { useEffect, useMemo, useReducer, useState } from 'react';
import { SidebarProvider, SiderbarTrigger } from '@/components/ui/sidebar.jsx';
import CodeEditor from './components/editor/CodeEditor.jsx';
import Explorer from './components/Explorer.jsx';
import ConsolePanel from './components/ConsolePanel.jsx';
import DebuggerPanel from './components/DebuggerPanel.jsx';
import RuntimeSelector from './components/RuntimeSelector.jsx';
import { initialState, appReducer } from './state/appState.js';
import useHotkeys from './hooks/useHotkeys.js';
import useIpc from './hooks/useIpc.js';
import { ThemeToggle } from './components/theme/theme-toggle.jsx';
import AppSidebar from './components/AppSidebar.js';

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
    <div className="grid grid-cols-[320px_minmax(0,1fr)] h-full">

      {/* Sidebar */}
      <aside className="bg-sidebar border-r border-border p-5 flex flex-col gap-5 backdrop-blur-lg">
        <div className="flex gap-3.5 items-center">
          <div className="w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br from-accent-strong to-accent text-[#001018] font-extrabold shadow-lg">
            SB
          </div>
          <div>
            <div className="text-lg font-bold">Sandbox</div>
            <div className="text-muted-foreground text-xs">Secure multi-runtime lab</div>
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

      {/* Workspace */}
      <main className="grid grid-rows-[auto_minmax(0,1fr)_320px] min-w-0">
        <header className="flex justify-between items-center gap-4 p-4 px-5 bg-topbar backdrop-blur-sm border-b border-border">
          <RuntimeSelector
            runtime={state.runtime}
            securityMode={state.securityMode}
            onRuntimeChange={(runtime) => dispatch({ type: 'runtime.change', payload: runtime })}
            onSecurityModeChange={(mode) => dispatch({ type: 'security.change', payload: mode })}
          />
          <div className="flex gap-2.5">
            <ThemeToggle />
            <button className="px-4 py-2.5 rounded-xl bg-muted/10 border border-border text-foreground hover:translate-y-[-1px] transition-all" onClick={handleDebug} disabled={state.isDebugging}>
              Debug
            </button>
            <button className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-accent-strong to-accent text-[#021019] font-bold hover:translate-y-[-1px] transition-all" onClick={handleExecute} disabled={state.isExecuting}>
              {state.isExecuting ? 'Running...' : 'Run'}
            </button>
            <button className="px-4 py-2.5 rounded-xl bg-muted/10 border border-border text-foreground hover:translate-y-[-1px] transition-all" onClick={handleStop}>
              Stop
            </button>
          </div>
        </header>

        <section className="grid grid-cols-[minmax(0,1fr)_360px] min-h-0">
          <div className="bg-card/80 border border-border rounded-2xl m-4 shadow-lg overflow-hidden grid grid-rows-[auto_minmax(0,1fr)]">
            <div className="p-3 px-4 text-muted-foreground text-xs uppercase tracking-wide border-b border-border">
              Editor
            </div>
            <CodeEditor
              value={state.code}
              onChange={(code) => dispatch({ type: 'code.change', payload: code })}
              onExecute={handleExecute}
            />
          </div>

          <div className="bg-card/80 border border-border rounded-2xl m-4 shadow-lg overflow-hidden">
            <div className="p-3 px-4 text-muted-foreground text-xs uppercase tracking-wide border-b border-border">
              Debugger
            </div>
            <DebuggerPanel
              debuggerState={state.debugger}
              activeSnippet={activeSnippet}
              onStep={() => dispatch({ type: 'debug.step' })}
              onToggleBreakpoint={(line) => dispatch({ type: 'debug.breakpoint.toggle', payload: line })}
            />
          </div>
        </section>

        <section className="min-h-0">
          <div className="bg-card/80 border border-border rounded-2xl m-4 mt-0 shadow-lg overflow-hidden h-[calc(100%-16px)]">
            <div className="p-3 px-4 text-muted-foreground text-xs uppercase tracking-wide border-b border-border">
              Console
            </div>
            <ConsolePanel logs={state.logs} error={state.error} metrics={state.metrics} />
          </div>
        </section>
      </main>
    </div>
  );
}