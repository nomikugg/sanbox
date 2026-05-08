export default function ConsolePanel({ logs, error, metrics }) {
  const visibleLogs = logs?.length ? logs : error ? [{ kind: 'error', message: error }] : [];

  return (
    <div className="console-pane">
      <div className="console-header">Console</div>
      <div className="console-body">
        {visibleLogs.length === 0 ? (
          <div style={{ color: 'var(--muted)' }}>No output yet.</div>
        ) : (
          visibleLogs.map((entry, index) => (
            <div className="log-row" key={index}>
              <div className="log-kind">{entry.kind ?? 'log'}</div>
              <div className={`log-message ${entry.kind ?? 'log'}`}>{entry.message ?? String(entry)}</div>
            </div>
          ))
        )}

        <div className="metrics">
          <div className="metric">
            <div className="metric-value">{metrics.executionTime} ms</div>
            <div className="metric-label">Execution</div>
          </div>
          <div className="metric">
            <div className="metric-value">{metrics.memoryBytes} B</div>
            <div className="metric-label">Memory</div>
          </div>
          <div className="metric">
            <div className="metric-value">{metrics.cpuMs} ms</div>
            <div className="metric-label">CPU</div>
          </div>
        </div>
      </div>
    </div>
  );
}
