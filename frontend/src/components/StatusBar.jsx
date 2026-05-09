// components/StatusBar.jsx
import { useStatusBar } from '@/contexts/StatusBarContext';
import { 
  Clock, MemoryStick, Cpu, Play, Bug, CheckCircle, AlertCircle, 
  GitBranch, Globe, Battery, Wifi, Volume2, Shield, Zap, 
  Cloud, Terminal, Eye, Code, FolderGit2, Info, X,
  ChevronUp, ChevronDown, Sparkles
} from 'lucide-react';
import { useState, useEffect } from 'react';

export function StatusBar() {
  const { 
    status, 
    metrics, 
    leftContent, 
    rightContent,
    branch = 'main',
    problems = 0,
    language = 'JavaScript',
    hasUpdates = false
  } = useStatusBar();
  
  const [showProblems, setShowProblems] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Reloj en tiempo real
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatMemory = (bytes) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Zap className="h-3 w-3 text-green-500 animate-pulse" />;
      case 'debugging':
        return <Bug className="h-3 w-3 text-blue-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      default:
        return <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running': return 'Running';
      case 'debugging': return 'Debugging';
      case 'error': return 'Error';
      case 'success': return 'Ready';
      default: return 'Idle';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'text-green-600 dark:text-green-400';
      case 'debugging': return 'text-blue-600 dark:text-blue-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'success': return 'text-green-600 dark:text-green-400';
      default: return 'text-muted-foreground';
    }
  };

  // Espacio libre en la status bar
  const freeSpace = "246 GB"; // Ejemplo

  return (
    <div className="flex items-center justify-between px-4 py-0.5 border-t border-border bg-background/95 text-xs text-muted-foreground h-6 flex-shrink-0">
      
      {/* Sección Izquierda */}
      <div className="flex items-center gap-4">
        {/* Status */}
        <div className="flex items-center gap-1.5">
          {getStatusIcon()}
          <span className={getStatusColor()}>{getStatusText()}</span>
        </div>

        {/* Lenguaje */}
        <div className="flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors">
          <Code className="h-3 w-3" />
          <span>{language}</span>
        </div>

        {/* Branch Git */}
        {branch && (
          <div className="flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors">
            <GitBranch className="h-3 w-3" />
            <span>{branch}</span>
          </div>
        )}

        {/* Problemas/Errores */}
        <div 
          className={`flex items-center gap-1 cursor-pointer transition-colors ${problems > 0 ? 'text-red-500 hover:text-red-600' : 'hover:text-foreground'}`}
          onClick={() => setShowProblems(!showProblems)}
        >
          <AlertCircle className="h-3 w-3" />
          <span>{problems} {problems === 1 ? 'problem' : 'problems'}</span>
        </div>

        {/* Contenido personalizado izquierdo */}
        {leftContent}
      </div>

      {/* Sección Central - Métricas */}
      <div className="flex items-center gap-4">
        {/* Tiempo de ejecución */}
        <div className="flex items-center gap-1" title="Execution Time">
          <Play className="h-3 w-3" />
          <span>{formatTime(metrics.executionTime)}</span>
        </div>

        {/* Memoria */}
        <div className="flex items-center gap-1" title="Memory Usage">
          <MemoryStick className="h-3 w-3" />
          <span>{formatMemory(metrics.memoryBytes)}</span>
        </div>

        {/* CPU */}
        <div className="flex items-center gap-1" title="CPU Time">
          <Cpu className="h-3 w-3" />
          <span>{formatTime(metrics.cpuMs)}</span>
        </div>

        {/* Espacio en disco */}
        <div className="flex items-center gap-1" title="Free Space">
          <FolderGit2 className="h-3 w-3" />
          <span>{freeSpace} free</span>
        </div>

        {/* Conexión */}
        <div className="flex items-center gap-1" title="Connection">
          <Wifi className="h-3 w-3 text-green-500" />
          <span>Online</span>
        </div>
      </div>

      {/* Sección Derecha */}
      <div className="flex items-center gap-3">
        {/* Modo */}
        <div className="flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors" title="Spell Check">
          <Eye className="h-3 w-3" />
          <span>Normal Mode</span>
        </div>

        {/* Terminal */}
        <div className="flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors" title="Toggle Terminal">
          <Terminal className="h-3 w-3" />
          <span>Terminal</span>
          <div className="flex flex-col">
            <ChevronUp className="h-2 w-2 -mb-1" />
            <ChevronDown className="h-2 w-2 -mt-1" />
          </div>
        </div>

        {/* Notificaciones */}
        {hasUpdates && (
          <div className="flex items-center gap-1 text-blue-500 cursor-pointer hover:text-blue-600 transition-colors" title="Updates Available">
            <Sparkles className="h-3 w-3" />
            <span>Updates</span>
          </div>
        )}

        {/* Reloj */}
        <div className="flex items-center gap-1" title="Current Time">
          <Clock className="h-3 w-3" />
          <span>{currentTime || '--:--'}</span>
        </div>

        {/* Contenido personalizado derecho */}
        {rightContent}
      </div>
    </div>
  );
}

export default StatusBar;