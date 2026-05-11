import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
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

  const editorRef = useRef(null);
  const monadoRef = useRef(null);
  const evaluatorRef = useRef(new LiveEvaluator());
  const [decorations, setDecorations] = useState([]);

  // Definir temas personzalidos para modo oscuro y claro
  const defineCustomThemes = (monaco) => {

    // Tema para modo oscuro
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

    // Tema claro
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


  // Evaluación en tiempo real mientras escribe
  const handleChange = (nextValue) => {
    onChange(nextValue ?? '');
    
    // Evaluar código en tiempo real
    evaluatorRef.current.evaluate(nextValue ?? '', (results) => {
      onLiveResults?.(results);
    }, language, transpileCode);
  };

  // Configuración inicial del editor
  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monadoRef.current = monaco;
    defineCustomThemes(monaco);
    // Aplicar el tema correspondiente según el modo actual
    const themeToApply = theme === 'dark' ? 'custom-dark' : 'custom-light';
    editor.updateOptions({ theme: themeToApply });

    // Atajo Ctrl+Enter para ejecutar código
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onExecute);
  };

  // Cambiar el tema dinámicamente cuando el modo cambie
  useEffect(() => {
    if (editorRef.current) {
      const newTheme = theme === 'dark' ? 'custom-dark' : 'custom-light';
      // editorRef.current.setTheme(newTheme);
      editorRef.current.updateOptions({ theme: newTheme });
    }
  }, [theme]);


  return (
    <Editor
      height="100%"
      defaultLanguage={resolveMonacoLanguage(language)}
      language={resolveMonacoLanguage(language)}
      // theme={monacoTheme}
      value={value}
      onChange={handleChange}
      options={{
        fontSize: 14,
        minimap: { 
          enabled: false,
        },
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
