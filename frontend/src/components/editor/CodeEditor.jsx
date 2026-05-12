import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef } from 'react';
import { LiveEvaluator } from '@/lib/liveEvaluator';

const MONACO_LANGUAGE_MAP = {
  js: 'javascript',
  jsx: 'javascriptreact',
  ts: 'typescript',
  tsx: 'typescriptreact',
};

function resolveMonacoLanguage(language) {
  return MONACO_LANGUAGE_MAP[language] ?? 'javascript';
}

export default function CodeEditor({ value, language = 'js', onChange, onExecute, onLiveResults, transpileCode }) {
  const { theme } = useTheme();

  const editorRef   = useRef(null);
  const monadoRef   = useRef(null);
  const evaluatorRef = useRef(new LiveEvaluator());
  const decorationsRef = useRef(null);
  // Track last value evaluated from user input to avoid double-eval on tab switch
  const lastEvaledRef = useRef(null);

  const defineCustomThemes = (monaco) => {
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '8ea3c2', fontStyle: 'italic' },
        { token: 'keyword', foreground: '22c55e' },
        { token: 'string', foreground: '0ea5e9' },
      ],
      colors: {
        'editor.background': '#0e1525',
        'editor.foreground': '#e5eefb',
        'editorLineNumber.foreground': '#8ea3c2',
        'editor.selectionBackground': '#22c55e33',
      }
    });

    monaco.editor.defineTheme('custom-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '475569', fontStyle: 'italic' },
        { token: 'keyword', foreground: '16a34a' },
        { token: 'string', foreground: '0284c7' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#0f172a',
        'editorLineNumber.foreground': '#475569',
        'editor.selectionBackground': '#16a34a33',
      }
    });
  };

  // Apply (or replace) inline result decorations for each captured line.
  // Passing null means "code is still being typed — leave decorations alone."
  // Passing [] means "no expressions found or error — clear decorations."
  const updateInlineDecorations = useCallback((lineResults) => {
    if (lineResults === null) return;

    const editor = editorRef.current;
    const monaco = monadoRef.current;
    if (!editor || !monaco) return;

    if (!decorationsRef.current) {
      decorationsRef.current = editor.createDecorationsCollection([]);
    }

    const model = editor.getModel();
    if (!model) return;

    const totalLines = model.getLineCount();
    const decorations = lineResults
      .filter(([ln]) => ln >= 1 && ln <= totalLines)
      .map(([lineNum, valueStr]) => {
        const col = model.getLineMaxColumn(lineNum);
        return {
          range: new monaco.Range(lineNum, col, lineNum, col),
          options: {
            after: {
              content: `  // ${valueStr}`,
              inlineClassName: 'live-inline-result',
            },
          },
        };
      });

    decorationsRef.current.set(decorations);
  }, []);

  const runEval = useCallback((code) => {
    evaluatorRef.current.evaluate(
      code,
      (entries, lineResults) => {
        onLiveResults?.(entries);
        updateInlineDecorations(lineResults);
      },
      language,
      transpileCode,
    );
  }, [language, transpileCode, onLiveResults, updateInlineDecorations]);

  // User keystroke: clear stale decorations immediately, then eval
  const handleChange = (nextValue) => {
    const code = nextValue ?? '';
    lastEvaledRef.current = code;
    onChange(code);
    decorationsRef.current?.clear();
    runEval(code);
  };

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monadoRef.current = monaco;
    defineCustomThemes(monaco);
    editor.updateOptions({ theme: theme === 'dark' ? 'custom-dark' : 'custom-light' });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onExecute);

    // Initial eval — mark as evaluated so the value-change effect skips it
    const initial = editor.getValue();
    lastEvaledRef.current = initial;
    runEval(initial);
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ theme: theme === 'dark' ? 'custom-dark' : 'custom-light' });
    }
  }, [theme]);

  // Re-evaluate when value prop changes from outside (tab switch).
  // @monaco-editor/react calls editor.setValue() silently (no onChange fired),
  // so we detect the external change by comparing against the last user-typed value.
  useEffect(() => {
    if (!editorRef.current || !monadoRef.current) return;
    if (value === lastEvaledRef.current) return; // already handled by handleChange
    lastEvaledRef.current = value;
    decorationsRef.current?.clear();
    runEval(value ?? '');
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      evaluatorRef.current.destroy();
      decorationsRef.current?.clear();
    };
  }, []);

  return (
    <Editor
      height="100%"
      defaultLanguage={resolveMonacoLanguage(language)}
      language={resolveMonacoLanguage(language)}
      value={value}
      onChange={handleChange}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        overviewRulerLanes: 0,
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        wordWrap: 'on',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        tabSize: 2,
        lineNumbers: 'on',
        glyphMargin: true,
      }}
      onMount={handleMount}
    />
  );
}
