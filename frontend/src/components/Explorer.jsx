export default function Explorer({ history, snippets, activeHistoryId, onOpenSnippet, onSelectHistory }) {
  return (
    <div className="explorer-card">
      <div className="explorer-header">Workspace</div>
      <div className="explorer-body">
        <div className="list">
          {snippets.map((snippet) => (
            <button key={snippet.id} className="list-item" onClick={() => onOpenSnippet(snippet)}>
              {snippet.name}
            </button>
          ))}
        </div>

        <div style={{ height: 20 }} />

        <div className="list">
          {history.map((entry) => (
            <button
              key={entry.id}
              className={`list-item ${entry.id === activeHistoryId ? 'active' : ''}`}
              onClick={() => onSelectHistory(entry.id)}
            >
              <div>{entry.runtime}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(entry.timestamp).toLocaleTimeString()}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
