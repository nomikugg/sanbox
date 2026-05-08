export default function DebuggerPanel({ debuggerState, activeSnippet, onStep, onToggleBreakpoint }) {
  return (
    <aside className="debugger-pane">
      <div className="debugger-header">Debugger</div>
      <div className="debugger-body">
        <div className="debugger-summary">
          <div className="debugger-chip">Connected: {debuggerState.connected ? 'yes' : 'no'}</div>
          <div className="debugger-chip">Paused: {debuggerState.paused ? 'yes' : 'no'}</div>
          <div className="debugger-chip">Session: {debuggerState.sessionId ?? 'none'}</div>
        </div>

        <div style={{ height: 16 }} />

        <button className="ghost" onClick={onStep}>Step over</button>
        <div style={{ height: 12 }} />
        <button className="ghost" onClick={() => onToggleBreakpoint(1)}>Toggle breakpoint 1</button>

        <div style={{ height: 18 }} />
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>Active snippet</div>
        <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{activeSnippet?.code ?? 'No history selected.'}</pre>
      </div>
    </aside>
  );
}
