export default function RuntimeSelector({ runtime, securityMode, onRuntimeChange, onSecurityModeChange }) {
  return (
    <div className="runtime-selector">
      <div>
        <div className="label">Runtime</div>
        <div className="runtime-pills">
          {['deno', 'node', 'bun'].map((item) => (
            <button
              key={item}
              //default node
              className={`runtime-button ${runtime === item ? 'active' : ''}`}
              onClick={() => onRuntimeChange(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="label">Security</div>
        <div className="runtime-pills">
          {['strict', 'balanced', 'debug'].map((item) => (
            <button
              key={item}
              className={`runtime-button ${securityMode === item ? 'active' : ''}`}
              onClick={() => onSecurityModeChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
