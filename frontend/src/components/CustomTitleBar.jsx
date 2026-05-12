// frontend/src/components/CustomTitlebar.jsx
import { getCurrentWindow } from '@tauri-apps/api/window';
import { 
  Minus, 
  X, 
  Maximize2, 
  Minimize2,
  Play,
  SquareStop,
  Bug,
  FolderOpen,
  Save,
  FileCode
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { ThemeToggle } from './theme/theme-toggle';

const appWindow = getCurrentWindow();

export function CustomTitlebar({ 
  onExecute, 
  onDebug, 
  onStop, 
  isExecuting, 
  isDebugging,
  activeExecutionId,
  onNewFile,
  onOpenFolder,
  onSave
}) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unlistenResize = null;

    const setup = async () => {
      try {
        const maximized = await appWindow.isMaximized();
        if (!cancelled) setIsMaximized(maximized);
      } catch {}

      try {
        unlistenResize = await appWindow.onResized(async () => {
          try {
            const maximized = await appWindow.isMaximized();
            if (!cancelled) setIsMaximized(maximized);
          } catch {}
        });
      } catch {}
    };

    setup();

    return () => {
      cancelled = true;
      unlistenResize?.();
    };
  }, []);

  return (
    <div 
      data-tauri-drag-region 
      className="h-10 bg-background/95 backdrop-blur-sm border-b border-border flex justify-between items-center px-4 fixed top-0 left-0 right-0 z-50"
    >
      {/* Left section - Logo y título */}
      <div className="flex items-center gap-3" data-tauri-drag-region>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-linear-to-br from-accent-strong to-accent flex items-center justify-center">
            <span className="text-xs font-bold text-foreground rounded-full p-1">SB</span>
          </div>
          <span data-tauri-drag-region className="text-sm font-semibold text-foreground select-none">
            SANDBOX
          </span>
        </div>
        
        {/* Menú rápido */}
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={onNewFile}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors"
            title="Nuevo archivo (Ctrl+N)"
          >
            <FileCode className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onOpenFolder}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors"
            title="Abrir carpeta"
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onSave}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors"
            title="Guardar (Ctrl+S)"
          >
            <Save className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Center section - Controles de ejecución (opcional) */}
      <div className="flex items-center gap-1">
        <button
          onClick={onDebug}
          disabled={isDebugging}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            isDebugging 
              ? 'bg-muted text-muted-foreground cursor-not-allowed' 
              : 'text-foreground hover:bg-muted'
          }`}
          title="Debug (F5)"
        >
          <Bug className="h-3.5 w-3.5 inline mr-1" />
          Debug
        </button>
        
        <button
          onClick={onExecute}
          disabled={isExecuting}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            isExecuting 
              ? 'bg-muted text-muted-foreground cursor-not-allowed' 
              : 'bg-accent text-accent-foreground hover:bg-accent/80'
          }`}
          title="Ejecutar (Ctrl+Enter)"
        >
          <Play className="h-3.5 w-3.5 inline mr-1" />
          {isExecuting ? 'Ejecutando...' : 'Run'}
        </button>
        
        <button
          onClick={onStop}
          disabled={!activeExecutionId}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            !activeExecutionId 
              ? 'bg-muted text-muted-foreground cursor-not-allowed' 
              : 'text-destructive hover:bg-destructive/10'
          }`}
          title="Detener"
        >
          <SquareStop className="h-3.5 w-3.5 inline mr-1" />
          Stop
        </button>
      </div>

      {/* Right section - Tema y ventana */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        
        <button
          onClick={() => appWindow.minimize().catch(() => {})}
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors"
          title="Minimizar"
        >
          <Minus className="h-4 w-4" />
        </button>

        <button
          onClick={() => appWindow.toggleMaximize().catch(() => {})}
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors"
          title={isMaximized ? "Restaurar" : "Maximizar"}
        >
          {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        <button
          onClick={() => appWindow.close().catch(() => {})}
          className="text-muted-foreground hover:bg-destructive hover:text-destructive-foreground rounded-md p-1.5 transition-colors"
          title="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}