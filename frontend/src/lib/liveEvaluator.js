// ─── LiveEvaluator — worker-based, no eval() in renderer ─────────────────────

const EVAL_TIMEOUT_MS = 5_000;

export class LiveEvaluator {
  constructor() {
    this._debounceHandle = null;
    this._debounceDelay = 300;
    this._requestId = 0;
    this._worker = null;
    this._pending = new Map(); // id → resolve
    this._initWorker();
  }

  // ── Worker lifecycle ────────────────────────────────────────────────────────

  _initWorker() {
    try {
      this._worker = new Worker(new URL('./evalWorker.js', import.meta.url), {
        type: 'module',
      });
      this._worker.onmessage = ({ data }) => {
        const resolve = this._pending.get(data.id);
        if (resolve) {
          this._pending.delete(data.id);
          resolve(data);
        }
      };
      this._worker.onerror = () => this._restartWorker();
    } catch {
      this._worker = null;
    }
  }

  _restartWorker() {
    this._worker?.terminate();
    this._pending.clear();
    this._initWorker();
  }

  _evalInWorker(id, code) {
    return new Promise((resolve) => {
      this._pending.set(id, resolve);
      this._worker.postMessage({ id, code });

      setTimeout(() => {
        if (this._pending.has(id)) {
          this._pending.delete(id);
          this._restartWorker();
          resolve({ id, logs: [], error: 'evaluation timed out' });
        }
      }, EVAL_TIMEOUT_MS);
    });
  }

  // ── Code completeness heuristic ─────────────────────────────────────────────

  looksIncomplete(code) {
    const t = code.trimEnd();
    if (!t) return true;
    if (t.endsWith('\\')) return true;

    const count = (ch) => (t.match(new RegExp(`\\${ch}`, 'g')) ?? []).length;
    if (count('(') > count(')') || count('{') > count('}') || count('[') > count(']')) return true;
    if (/[=:+\-*/,&|?!]$/.test(t)) return true;
    if (/\b(const|let|var|function|class|if|for|while|switch|try|catch|return|import|export)\s*$/.test(t)) return true;

    return false;
  }

  // ── Stringify helper (kept for backwards compat with ConsolePanel) ──────────

  stringify(value) {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'function') return value.toString();
    if (typeof value === 'string') return `'${value}'`;
    if (typeof value === 'object') {
      try { return JSON.stringify(value, null, 2); } catch { return String(value); }
    }
    return String(value);
  }

  // ── Public evaluate ─────────────────────────────────────────────────────────

  /**
   * @param {string} code
   * @param {(entries: object[]) => void} onResult
   * @param {string} language
   * @param {(payload: { code: string, language: string }) => Promise<{ code: string }>} transpileCode
   */
  evaluate(code, onResult, language, transpileCode) {
    if (this._debounceHandle) clearTimeout(this._debounceHandle);
    if (!code || code.trim().length < 2) { onResult([]); return; }
    if (this.looksIncomplete(code)) { onResult([]); return; }

    const reqId = ++this._requestId;

    this._debounceHandle = setTimeout(async () => {
      try {
        const compiled = typeof transpileCode === 'function'
          ? await transpileCode({ code, language })
          : { code };

        if (reqId !== this._requestId) return;

        const compiledCode = compiled?.code ?? code;

        if (!this._worker) {
          onResult([{
            kind: 'warn',
            message: 'Live eval unavailable (Worker not supported in this environment)',
            _session: reqId,
          }]);
          return;
        }

        const result = await this._evalInWorker(String(reqId), compiledCode);
        if (reqId !== this._requestId) return;

        const entries = [...(result.logs ?? [])];
        if (result.returnValue !== undefined) {
          entries.push({ kind: 'return', message: result.returnValue });
        }
        if (result.error) {
          entries.push({ kind: 'error', message: result.error });
        }
        entries.forEach((r) => { r._session = reqId; });
        onResult(entries);
      } catch (err) {
        if (reqId === this._requestId) {
          onResult([{ kind: 'error', message: err?.message ?? String(err), _session: reqId }]);
        }
      }
    }, this._debounceDelay);
  }

  destroy() {
    if (this._debounceHandle) clearTimeout(this._debounceHandle);
    this._worker?.terminate();
    this._pending.clear();
  }
}
