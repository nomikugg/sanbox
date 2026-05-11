export class LiveEvaluator {
  constructor() {
    this.timeout = null;
    this.debounceDelay = 300;
    this.requestId = 0;
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

  looksIncomplete(code) {
    const trimmed = code.trimEnd();
    if (!trimmed) return true;

    if (trimmed.endsWith('\\')) {
      return true;
    }

    const openParens = (trimmed.match(/\(/g) || []).length;
    const closeParens = (trimmed.match(/\)/g) || []).length;
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    const openBrackets = (trimmed.match(/\[/g) || []).length;
    const closeBrackets = (trimmed.match(/\]/g) || []).length;

    if (openParens > closeParens || openBraces > closeBraces || openBrackets > closeBrackets) {
      return true;
    }

    if (/[=:+\-*/,&|?!]$/.test(trimmed)) {
      return true;
    }

    // Keywords that shouldn't be evaluated as incomplete (only full keywords)
    if (/\b(const|let|var|function|class|if|for|while|switch|try|catch|return|import|export)\s*$/.test(trimmed)) {
      return true;
    }

    return false;
  }

//   evaluate(code, onResult, language = 'js', transpileCode) {
//     if (this.timeout) clearTimeout(this.timeout);
//     if (!code || code.trim().length < 2) {
//       onResult([]);
//       return;
//     }

//     if (this.looksIncomplete(code)) {
//       onResult([]);
//       return;
//     }

//     const currentRequestId = ++this.requestId;

//     this.timeout = setTimeout(async () => {
//       const originalLog = console.log;
//       const originalError = console.error;
//       const originalWarn = console.warn;

//       try {
//         const compiled = typeof transpileCode === 'function'
//           ? await transpileCode({ code, language })
//           : { code, language };

//         if (currentRequestId !== this.requestId) {
//           return;
//         }

//         const results = [];
//         const compiledCode = compiled?.code ?? code;

//         console.log = (...args) => {
//           const message = args.map((value) => this.stringify(value)).join(' ');
//           results.push({ kind: 'log', message });
//           originalLog(...args);
//         };
//         console.error = (...args) => {
//           const message = args.map((value) => this.stringify(value)).join(' ');
//           results.push({ kind: 'error', message });
//           originalError(...args);
//         };
//         console.warn = (...args) => {
//           const message = args.map((value) => this.stringify(value)).join(' ');
//           results.push({ kind: 'warn', message });
//           originalWarn(...args);
//         };

//         try {
//           // Execute the entire buffer so previous declarations are in scope,
//           // but only return the value of the last statement/expression.
//           const lines = compiledCode.split('\n');
//           let lastIdx = -1;
//           for (let i = lines.length - 1; i >= 0; i--) {
//             if (lines[i].trim()) { lastIdx = i; break; }
//           }

//           let wrapperCode = compiledCode;
//           if (lastIdx >= 0) {
//             const prefix = lines.slice(0, lastIdx).join('\n');
//             let lastLine = lines[lastIdx].trim();
//             // Remove trailing semicolon for safe wrapping
//             lastLine = lastLine.replace(/;\s*$/, '');

//             // If the last line is a declaration, just execute full code (no return)
//             if (/^\s*(const|let|var|function|class)\b/.test(lastLine)) {
//               wrapperCode = `(async () => { ${compiledCode}; return undefined; })()`;
//             } else {
//               // Wrap so we can await top-level await and return the last expression
//               const prefixed = prefix ? `${prefix}\n` : '';
//               // If lastLine already starts with 'await', keep it as-is
//               const retExpr = /^\s*await\b/.test(lastLine) ? lastLine : `(${lastLine})`;
//               wrapperCode = `(async () => { ${prefixed}try { return ${retExpr}; } catch (e) { throw e; } })()`;
//             }
//           }

//           const value = await eval(wrapperCode);
//           if (value !== undefined && value !== null) {
//             results.push({ kind: 'return', message: this.stringify(value) });
//           }

//           // Tag results with the session id so the UI can group/replace them
//           results.forEach((r) => { r._session = currentRequestId; });
//           onResult(results);
//         } catch (error) {
//           const err = { kind: 'error', message: error.message, _session: currentRequestId };
//           onResult([err]);
//         } finally {
//           console.log = originalLog;
//           console.error = originalError;
//           console.warn = originalWarn;
//         }
//       } catch (error) {
//         if (currentRequestId === this.requestId) {
//           onResult([{ kind: 'error', message: error?.message ?? String(error) }]);
//         }
//         console.log = originalLog;
//         console.error = originalError;
//         console.warn = originalWarn;
//       }
//     }, this.debounceDelay);
//   }
    evaluate(code, onResult, language, transpileCode) {
        if (this.timeout) clearTimeout(this.timeout);
        if (!code || code.trim().length < 2) {
            onResult([]);
            return;
        }
        if (this.looksIncomplete(code)) {
            onResult([]);
            return;
        }

        const currentRequestId = ++this.requestId;

        this.timeout = setTimeout(async () => {
            const originalLog = console.log;
            const originalError = console.error;
            const originalWarn = console.warn;
            try {
            const compiled = typeof transpileCode === 'function'
                ? await transpileCode({ code, language })
                : { code };

            // ⬇️ Cancelar si ya no es la última petición
            if (currentRequestId !== this.requestId) return;

            const compiledCode = compiled?.code ?? code;
            const results = [];

            console.log = (...args) => {
                const message = args.map(v => this.stringify(v)).join(' ');
                results.push({ kind: 'log', message });
                originalLog(...args);
            };
            console.error = (...args) => {
                const message = args.map(v => this.stringify(v)).join(' ');
                results.push({ kind: 'error', message });
                originalError(...args);
            };
            console.warn = (...args) => {
                const message = args.map(v => this.stringify(v)).join(' ');
                results.push({ kind: 'warn', message });
                originalWarn(...args);
            };

            try {
                // Execute the entire buffer so previous declarations are in scope,
                // but only return the value of the last statement/expression.
                const lines = compiledCode.split('\n');
                let lastIdx = -1;
                for (let i = lines.length - 1; i >= 0; i--) {
                    if (lines[i].trim()) { lastIdx = i; break; }
                }

                let wrapperCode = compiledCode;
                if (lastIdx >= 0) {
                    const prefix = lines.slice(0, lastIdx).join('\n');
                    let lastLine = lines[lastIdx].trim();
                    // Remove trailing semicolon for safe wrapping
                    lastLine = lastLine.replace(/;\s*$/, '');

                    // If the last line is a declaration, just execute full code (no return)
                    if (/^\s*(const|let|var|function|class)\b/.test(lastLine)) {
                    wrapperCode = `(async () => { ${compiledCode}; return undefined; })()`;
                    } else {
                    // Wrap so we can await top-level await and return the last expression
                    const prefixed = prefix ? `${prefix}\n` : '';
                    // If lastLine already starts with 'await', keep it as-is
                    const retExpr = /^\s*await\b/.test(lastLine) ? lastLine : `(${lastLine})`;
                    wrapperCode = `(async () => { ${prefixed}try { return ${retExpr}; } catch (e) { throw e; } })()`;
                    }
                }
                const value = await eval(wrapperCode);
                if (value !== undefined && value !== null) {
                results.push({ kind: 'return', message: this.stringify(value) });
                }
                results.forEach(r => { r._session = currentRequestId; });
                onResult(results);
            } catch (evalError) {
                const err = { kind: 'error', message: evalError.message, _session: currentRequestId };
                onResult([err]);
            } finally {
                console.log = originalLog;
                console.error = originalError;
                console.warn = originalWarn;
            }
            } catch (transpileError) {
            // ⬇️ Solo notificar si sigue siendo la petición actual
            if (currentRequestId === this.requestId) {
                onResult([{ kind: 'error', message: transpileError?.message ?? String(transpileError) }]);
            }
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
            }
        }, this.debounceDelay);
    }
}
