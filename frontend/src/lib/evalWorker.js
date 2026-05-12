// ─── Isolated Web Worker for live eval ───────────────────────────────────────
// Runs in a Worker context — no DOM, no window, no Tauri bridge.
// User code cannot access __TAURI_INTERNALS__ or any renderer global.

const stringify = (value) => {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'function') return value.toString();
  if (typeof value === 'string') return `'${value}'`;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const makeConsole = (logs) => ({
  log: (...args) => logs.push({ kind: 'log', message: args.map(stringify).join(' ') }),
  warn: (...args) => logs.push({ kind: 'warn', message: args.map(stringify).join(' ') }),
  error: (...args) => logs.push({ kind: 'error', message: args.map(stringify).join(' ') }),
  info: (...args) => logs.push({ kind: 'info', message: args.map(stringify).join(' ') }),
});

self.onmessage = async ({ data }) => {
  const { id, code } = data;
  const logs = [];
  const t0 = performance.now();

  try {
    // new Function is safer than eval() here: it creates a function-scoped closure
    // with no access to the Worker's own module scope. The Worker itself has no
    // access to the DOM or Tauri bridge, so the attack surface is minimal.
    const fn = new Function('console', `"use strict";\n${code}`);
    const result = await fn(makeConsole(logs));
    const returnValue = result !== undefined ? stringify(result) : undefined;

    self.postMessage({ id, logs, returnValue, durationMs: performance.now() - t0 });
  } catch (err) {
    self.postMessage({
      id,
      logs,
      error: err instanceof Error ? err.message : String(err),
      durationMs: performance.now() - t0,
    });
  }
};
