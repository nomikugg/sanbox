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
import { Plus, X } from 'lucide-react';

const starterCode = `const values = [1, 2, 3, 4];`;

export default function App() {
  const [state, dispatch] = useReducer(appReducer, (() => {
    const firstTab = { ...initialState.tabs[0], code: starterCode };
    return {
      ...initialState,
      code: starterCode,
      tabs: [firstTab],
      activeTabId: firstTab.id,
    };
  })());
  const ipc = useIpc();
  const { setStatus, setMetrics } = useStatusBar();

  const [liveResults, setLiveResults] = useState([]);
  const [editingTabId, setEditingTabId] = useState(null);
  const [tabTitleDraft, setTabTitleDraft] = useState('');
  
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

  const activeTab = useMemo(
    () => state.tabs.find((tab) => tab.id === state.activeTabId) ?? state.tabs[0],
    [state.activeTabId, state.tabs],
  );

  useEffect(() => {
    setLiveResults([]);
  }, [activeTab?.id]);
  
  async function handleExecute() {
    dispatch({ type: 'execution.start' });
    const startedAt = performance.now();
    try {
      const result = await ipc.executeCode({
        code: activeTab?.code ?? state.code,
        language: activeTab?.language ?? 'js',
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
        code: activeTab?.code ?? state.code,
        language: activeTab?.language ?? 'js',
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
    dispatch({
      type: 'tab.create',
      payload: {
        title: `Untitled ${state.tabs.length + 1}`,
        language: activeTab?.language ?? 'js',
        code: starterCode,
      },
    });
    dispatch({ type: 'history.select', payload: null });
  };

  const beginRenameTab = (tab) => {
    setEditingTabId(tab.id);
    setTabTitleDraft(tab.title);
  };

  const commitRenameTab = () => {
    const trimmed = tabTitleDraft.trim();
    const active = state.tabs.find((tab) => tab.id === editingTabId);
    if (editingTabId && trimmed && active && trimmed !== active.title) {
      dispatch({
        type: 'tab.rename',
        payload: { id: editingTabId, title: trimmed },
      });
    }
    setEditingTabId(null);
    setTabTitleDraft('');
  };

  const cancelRenameTab = () => {
    setEditingTabId(null);
    setTabTitleDraft('');
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
              <header className="flex justify-between items-center gap-4 p-4 px-5 backdrop-blur-sm border-b border-border shrink-0">
                <RuntimeSelector
                  runtime={state.runtime}
                  securityMode={state.securityMode}
                  onRuntimeChange={(runtime) => dispatch({ type: 'runtime.change', payload: runtime })}
                  onSecurityModeChange={(mode) => dispatch({ type: 'security.change', payload: mode })}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Language</span>
                  <select
                    className="h-9 rounded-md border border-border bg-background px-3 text-xs"
                    value={activeTab?.language ?? 'js'}
                    onChange={(event) => dispatch({ type: 'tab.language.change', payload: event.target.value })}
                  >
                    <option value="js">JS</option>
                    <option value="jsx">JSX</option>
                    <option value="ts">TS</option>
                    <option value="tsx">TSX</option>
                    <option value="ty">TY</option>
                  </select>
                </div>
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
                  <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 shrink-0 overflow-x-auto">
                    <div className="flex items-center gap-1 min-w-0 overflow-x-auto">
                      {state.tabs.map((tab) => (
                        <div
                          key={tab.id}
                          role="button"
                          tabIndex={0}
                          className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors whitespace-nowrap ${
                            tab.id === state.activeTabId
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border bg-transparent text-muted-foreground hover:bg-muted/40'
                          }`}
                          onClick={() => dispatch({ type: 'tab.select', payload: tab.id })}
                          onDoubleClick={() => beginRenameTab(tab)}
                        >
                          {editingTabId === tab.id ? (
                            <input
                              autoFocus
                              value={tabTitleDraft}
                              onChange={(event) => setTabTitleDraft(event.target.value)}
                              onBlur={commitRenameTab}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  commitRenameTab();
                                }
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  cancelRenameTab();
                                }
                              }}
                              onClick={(event) => event.stopPropagation()}
                              className="min-w-0 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none"
                            />
                          ) : (
                            <span onDoubleClick={(event) => {
                              event.stopPropagation();
                              beginRenameTab(tab);
                            }}>
                              {tab.title}
                            </span>
                          )}
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {tab.language}
                          </span>
                          {state.tabs.length > 1 && (
                            <span
                              className="rounded-full p-0.5 text-muted-foreground hover:bg-muted"
                              onClick={(event) => {
                                event.stopPropagation();
                                dispatch({ type: 'tab.close', payload: tab.id });
                              }}
                            >
                              <X className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 text-xs text-muted-foreground hover:bg-muted"
                      onClick={handleNewFile}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New tab
                    </button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <CodeEditor
                      value={activeTab?.code ?? state.code}
                      language={activeTab?.language ?? 'js'}
                      onChange={(code) => dispatch({ type: 'code.change', payload: code })}
                      onExecute={handleExecute}
                      onLiveResults={setLiveResults}
                      transpileCode={ipc.transpileCode}
                    />
                  </div>
                </div>

                <div className="bg-card/80 border border-border rounded-2xl shadow-lg overflow-hidden flex flex-col min-h-0">
                  <div className="p-3 px-4 text-muted-foreground text-xs uppercase tracking-wide border-b border-border shrink-0">
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

              <section className="h-64 shrink-0 p-4 pt-0">  {/* ← Altura fija para Console */}
                <div className="bg-card/80 border border-border rounded-2xl shadow-lg overflow-hidden h-full">
                  <ConsolePanel 
                    logs={state.logs}
                    error={state.error}
                    metrics={state.metrics}
                    isExecuting={state.isExecuting}
                    liveResults={liveResults}
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