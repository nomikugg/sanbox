// components/Metrics.jsx
import { Clock, MemoryStick, Cpu, Play, SquareTerminal } from "lucide-react"

export function Metrics({ metrics, isExecuting }) {
  const formatMemory = (bytes) => {
    if (bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const formatTime = (ms) => {
    if (ms === 0) return '0 ms'
    if (ms < 1000) return `${ms} ms`
    return `${(ms / 1000).toFixed(2)} s`
  }

  return (
    <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-muted/10 text-xs text-muted-foreground">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        {isExecuting ? (
          <>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-600 dark:text-green-400">Running</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span>Idle</span>
          </>
        )}
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5" title="Execution Time">
          <Play className="h-3 w-3" />
          <span>{formatTime(metrics.executionTime)}</span>
        </div>
        
        <div className="flex items-center gap-1.5" title="Memory Usage">
          <MemoryStick className="h-3 w-3" />
          <span>{formatMemory(metrics.memoryBytes)}</span>
        </div>
        
        <div className="flex items-center gap-1.5" title="CPU Time">
          <Cpu className="h-3 w-3" />
          <span>{formatTime(metrics.cpuMs)}</span>
        </div>
      </div>

      {/* Line/Col indicator */}
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground/60">Ln 1, Col 1</span>
      </div>
    </div>
  )
}