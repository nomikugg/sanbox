// ─── Isolated Web Worker for live eval ───────────────────────────────────────
// Runs in a Worker context — no DOM, no window, no Tauri bridge.

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// Node.js-style stringify for display
function stringify(value, depth) {
  if (depth === undefined) depth = 0;
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return Object.is(value, -0) ? '-0' : String(value);
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
  if (typeof value === 'string') return depth === 0 ? value : `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (value instanceof Promise) return 'Promise { <pending> }';
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (Array.isArray(value)) {
    if (depth > 3) return '[Array]';
    if (value.length === 0) return '[]';
    const items = value.map((v) => stringify(v, depth + 1));
    const inline = `[ ${items.join(', ')} ]`;
    return inline.length <= 80 ? inline : `[\n  ${items.join(',\n  ')}\n]`;
  }
  if (typeof value === 'object') {
    if (depth > 3) return '[Object]';
    try {
      const entries = Object.entries(value);
      if (entries.length === 0) return '{}';
      const parts = entries
        .slice(0, 20)
        .map(([k, v]) => `${/^[a-zA-Z_$][\w$]*$/.test(k) ? k : `'${k}'`}: ${stringify(v, depth + 1)}`);
      const more = entries.length > 20 ? `, …${entries.length - 20} more` : '';
      const inline = `{ ${parts.join(', ')}${more} }`;
      return inline.length <= 80 ? inline : `{\n  ${parts.join(',\n  ')}${more}\n}`;
    } catch {
      return '[Object]';
    }
  }
  return String(value);
}

const makeConsole = (logs) => ({
  log:    (...a) => logs.push({ kind: 'log',   message: a.map((v) => stringify(v)).join(' ') }),
  warn:   (...a) => logs.push({ kind: 'warn',  message: a.map((v) => stringify(v)).join(' ') }),
  error:  (...a) => logs.push({ kind: 'error', message: a.map((v) => stringify(v)).join(' ') }),
  info:   (...a) => logs.push({ kind: 'info',  message: a.map((v) => stringify(v)).join(' ') }),
  dir:    (...a) => logs.push({ kind: 'log',   message: a.map((v) => stringify(v)).join(' ') }),
  table:  (d)    => logs.push({ kind: 'log',   message: stringify(d) }),
  trace:  (...a) => logs.push({ kind: 'log',   message: `Trace: ${a.map((v) => stringify(v)).join(' ')}` }),
  assert: (ok, ...a) => {
    if (!ok) logs.push({ kind: 'error', message: `Assertion failed: ${a.map((v) => stringify(v)).join(' ')}` });
  },
});

// Lines that begin keyword-statements — leave them unchanged
const DECL_RE = /^(const\b|let\b|var\b|async\s+function\b|function\s*[*(]|function\s+\w|class\b|if\s*[({]?$|else\b|for\s*[({]?$|while\s*[({]?$|do\s*[{]?$|switch\s*\(|try\s*[{]?$|catch\s*[({]?$|finally\s*[{]?$|return\b|throw\b|break\b|continue\b|import\b|export\b|debugger\b|\/\/|\/\*|\*)/;

// Lines that continue a previous expression (chain, closing bracket, etc.)
const CONT_RE = /^[.{}()\];,?:]/;

// Wraps bare expression lines with __c__(lineNum, expr) to capture their value.
// User code is placed inside an async IIFE so that:
//   • top-level await works
//   • early `return` stays scoped to the IIFE (doesn't skip the Map return)
//   • errors are caught and returned alongside partial results
function instrumentCode(code) {
  const lines = code.split('\n');

  const body = lines.map((line, idx) => {
    const t = line.trim();
    const ln = idx + 1;

    if (!t) return line;
    if (DECL_RE.test(t)) return line;
    if (CONT_RE.test(t)) return line;
    if (t.endsWith('{') || t.endsWith(',') || t.endsWith('\\')) return line;

    const expr = t.endsWith(';') ? t.slice(0, -1) : t;
    const indent = line.match(/^(\s*)/)[1];
    return `${indent}__c__(${ln},${expr});`;
  });

  return [
    'const __R__=new Map();',
    'const __c__=(n,v)=>{__R__.set(n,v);return v;};',
    'let __err__=null;',
    'try{await(async()=>{',
    ...body,
    '})();}catch(__e){__err__=__e;}',
    'return{m:__R__,e:__err__};',
  ].join('\n');
}

self.onmessage = async ({ data }) => {
  const { id, code } = data;
  const logs = [];
  const t0 = performance.now();

  try {
    const instrumented = instrumentCode(code);
    const fn = new AsyncFunction('console', `"use strict";\n${instrumented}`);
    const { m: lineMap, e: innerError } = await fn(makeConsole(logs));

    // Collect non-undefined per-line results
    const lineResults = [];
    if (lineMap instanceof Map) {
      for (const [ln, val] of lineMap) {
        if (val !== undefined) lineResults.push([ln, stringify(val)]);
      }
    }

    const errorMsg = innerError
      ? (innerError instanceof Error ? innerError.message : String(innerError))
      : null;

    self.postMessage({
      id,
      logs,
      lineResults,
      // returnValue kept for backwards-compat with ConsolePanel "←" display
      returnValue: lineResults.length > 0 ? lineResults[lineResults.length - 1][1] : undefined,
      error: errorMsg,
      durationMs: performance.now() - t0,
    });
  } catch (err) {
    // Outer catch: AsyncFunction construction failed (e.g. SyntaxError)
    self.postMessage({
      id,
      logs,
      lineResults: [],
      error: err instanceof Error ? err.message : String(err),
      durationMs: performance.now() - t0,
    });
  }
};
