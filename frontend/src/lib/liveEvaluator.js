// lib/liveEvaluator.js
export class LiveEvaluator {
  constructor() {
    this.timeout = null;
    this.debounceDelay = 500;
    this.consoleLogs = [];
  }

  stringify(value) {
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
  }

  evaluate(code, onResult) {
    if (this.timeout) clearTimeout(this.timeout);
    if (!code || code.trim().length < 2) {
      onResult([]);
      return;
    }

    this.timeout = setTimeout(() => {
      const results = [];
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      console.log = (...args) => {
        const msg = args.map(a => this.stringify(a)).join(' ');
        results.push({ kind: 'log', message: msg });
        originalLog(...args);
      };
      console.error = (...args) => {
        const msg = args.map(a => this.stringify(a)).join(' ');
        results.push({ kind: 'error', message: msg });
        originalError(...args);
      };
      console.warn = (...args) => {
        const msg = args.map(a => this.stringify(a)).join(' ');
        results.push({ kind: 'warn', message: msg });
        originalWarn(...args);
      };

      try {
        // ------------------ NUEVO: usar Function con ámbito compartido ------------------
        // 1. Ejecutar todo el código para que las declaraciones tengan efecto
        const runner = new Function(`
          try {
            ${code}
            return { success: true };
          } catch(e) {
            return { success: false, error: e.message };
          }
        `);
        const execResult = runner();
        if (!execResult.success) {
          results.push({ kind: 'error', message: execResult.error });
        }

        // 2. Evaluar la última expresión (si existe y no es declaración)
        const lines = code.split('\n');
        let lastExpr = null;
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line === '' || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;
          const isDecl = /^(const|let|var|function|class|if|for|while|switch|try|catch|return|import|export)\s/.test(line);
          if (!isDecl && !line.includes('console.')) {
            lastExpr = line;
            break;
          }
        }

        if (lastExpr) {
          try {
            // Evaluar la expresión en el mismo ámbito (global-ish) – pero para que vea las variables,
            // usamos eval con el contexto de la función runner? Mejor usar Function que retorna la expresión.
            const evalFn = new Function(`return (${lastExpr})`);
            const value = evalFn();
            if (value !== undefined && value !== null) {
              results.push({ kind: 'return', message: this.stringify(value) });
            }
          } catch (e) {
            if (!e.message.includes('is not defined')) {
              results.push({ kind: 'error', message: e.message });
            }
          }
        }

        onResult(results);
      } catch (err) {
        if (!err.message.includes('Unexpected')) {
          onResult([{ kind: 'error', message: err.message }]);
        } else {
          onResult([]);
        }
      } finally {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
      }
    }, this.debounceDelay);
  }
}