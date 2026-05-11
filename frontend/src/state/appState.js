const defaultTabs = [
  { id: 'tab-1', title: 'Untitled 1', language: 'js', code: "console.log('My first Sandbox...');\nconsole.log(1 + 1);" },
];

export const initialState = {
  code: defaultTabs[0].code,
  tabs: defaultTabs,
  activeTabId: defaultTabs[0].id,
  output: null,
  error: null,
  runtime: 'node',
  securityMode: 'strict',
  isExecuting: false,
  isDebugging: false,
  activeExecutionId: null,
  activeHistoryId: null,
  history: [],
  snippets: [
    { id: 'snippet-1', name: 'HTTP fetch sample', code: "console.log('network disabled in strict mode');" },
    { id: 'snippet-2', name: 'Math benchmark', code: 'console.log(Array.from({ length: 5 }, (_, index) => index ** 2));' },
  ],
  logs: [],
  metrics: {
    executionTime: 0,
    memoryBytes: 0,
    cpuMs: 0,
  },
  debugger: {
    connected: false,
    sessionId: null,
    breakpoints: [],
    variables: [],
    paused: false,
  },
};

function createTab({ title, language = 'js', code = '' } = {}) {
  return {
    id: crypto.randomUUID(),
    title: title ?? `Untitled ${Math.floor(Math.random() * 1000)}`,
    language,
    code,
  };
}

function getActiveTab(state) {
  return state.tabs.find((tab) => tab.id === state.activeTabId) ?? state.tabs[0];
}

function updateActiveTab(state, updater) {
  const activeTab = getActiveTab(state);
  if (!activeTab) {
    return state;
  }

  const nextTabs = state.tabs.map((tab) => (tab.id === activeTab.id ? updater(tab) : tab));
  const nextActiveTab = nextTabs.find((tab) => tab.id === activeTab.id) ?? nextTabs[0];

  return {
    ...state,
    tabs: nextTabs,
    activeTabId: nextActiveTab?.id ?? state.activeTabId,
    code: nextActiveTab?.code ?? state.code,
  };
}

function appendHistory(state, payload) {
  const entry = {
    id: crypto.randomUUID(),
    runtime: state.runtime,
    timestamp: new Date().toISOString(),
    code: state.code,
    output: payload.output ?? null,
    error: payload.error ?? null,
  };
  return [entry, ...state.history].slice(0, 25);
}

export function appReducer(state, action) {
  switch (action.type) {
    case 'code.change':
      return updateActiveTab(state, (tab) => ({ ...tab, code: action.payload }));
    case 'tab.create': {
      const tab = createTab(action.payload);
      return {
        ...state,
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
        code: tab.code,
      };
    }
    case 'tab.select': {
      const tab = state.tabs.find((item) => item.id === action.payload);
      if (!tab) return state;
      return { ...state, activeTabId: tab.id, code: tab.code };
    }
    case 'tab.close': {
      if (state.tabs.length === 1) return state;
      const nextTabs = state.tabs.filter((tab) => tab.id !== action.payload);
      const nextActiveTab = nextTabs.find((tab) => tab.id === state.activeTabId) ?? nextTabs[0];
      return {
        ...state,
        tabs: nextTabs,
        activeTabId: nextActiveTab.id,
        code: nextActiveTab.code,
      };
    }
    case 'tab.language.change':
      return updateActiveTab(state, (tab) => ({ ...tab, language: action.payload }));
    case 'tab.rename': {
      const nextTitle = (action.payload?.title ?? '').trim();
      if (!nextTitle) return state;

      const targetTabId = action.payload?.id ?? state.activeTabId;
      const nextTabs = state.tabs.map((tab) => (
        tab.id === targetTabId ? { ...tab, title: nextTitle } : tab
      ));

      return {
        ...state,
        tabs: nextTabs,
      };
    }
    case 'runtime.change':
      return { ...state, runtime: action.payload };
    case 'security.change':
      return { ...state, securityMode: action.payload };
    case 'snippet.open':
      {
        const tab = createTab({ title: action.payload.name, code: action.payload.code, language: 'js' });
        return {
          ...state,
          tabs: [...state.tabs, tab],
          activeTabId: tab.id,
          code: tab.code,
        };
      }
    case 'history.select':
      return { ...state, activeHistoryId: action.payload };
    case 'execution.start':
      return { 
        ...state, 
        isExecuting: true, 
        error: null,
        logs: [],
      };
    case 'execution.success':
      return {
        ...state,
        isExecuting: false,
        output: action.payload.output,
        error: action.payload.error ?? null,
        metrics: {
          ...state.metrics,
          executionTime: action.payload.executionTime ?? 0,
          memoryBytes: action.payload.memoryBytes ?? 0,
          cpuMs: action.payload.cpuMs ?? 0,
        },
        logs: action.payload.logs ?? [],
        activeExecutionId:
          action.payload.executionId ?? action.payload.execution_id ?? state.activeExecutionId,
        history: appendHistory(state, action.payload),
      };
    case 'execution.failure':
      return {
        ...state,
        isExecuting: false,
        error: action.payload.error,
        metrics: {
          ...state.metrics,
          executionTime: action.payload.executionTime ?? 0,
        },
        history: appendHistory(state, action.payload),
      };
    case 'execution.stopped':
      return { ...state, isExecuting: false, activeExecutionId: null };
    case 'debug.start':
      return { ...state, isDebugging: true };
    case 'debug.success':
      return {
        ...state,
        isDebugging: false,
        debugger: {
          connected: true,
          sessionId: action.payload.sessionId ?? null,
          breakpoints: action.payload.breakpoints ?? [],
          variables: action.payload.variables ?? [],
          paused: action.payload.paused ?? false,
        },
      };
    case 'debug.failure':
      return { ...state, isDebugging: false, error: action.payload };
    case 'debug.step':
      return { ...state, debugger: { ...state.debugger, paused: true } };
    case 'debug.breakpoint.toggle': {
      const line = action.payload;
      const exists = state.debugger.breakpoints.includes(line);
      return {
        ...state,
        debugger: {
          ...state.debugger,
          breakpoints: exists
            ? state.debugger.breakpoints.filter((value) => value !== line)
            : [...state.debugger.breakpoints, line],
        },
      };
    }
    default:
      return state;
  }
}
