// usar /store en caso de que la app crezca mucho y queramos separar lógica de estado
// pero por ahora lo dejo simple con un reducer directo en el App.jsx


export const initialState = {
  code: '',
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
      return { ...state, code: action.payload };
    case 'runtime.change':
      return { ...state, runtime: action.payload };
    case 'security.change':
      return { ...state, securityMode: action.payload };
    case 'snippet.open':
      return { ...state, code: action.payload.code };
    case 'history.select':
      return { ...state, activeHistoryId: action.payload };
    case 'execution.start':
      return { ...state, isExecuting: true, error: null };
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
        logs: action.payload.logs ?? state.logs,
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
