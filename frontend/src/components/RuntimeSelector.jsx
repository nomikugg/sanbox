// components/RuntimeSelector.jsx
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Badge } from "@/components/ui/badge"
import { Server, Shield, Terminal, Coffee, Egg, Leaf } from "lucide-react"

// Iconos para los runtimes
const runtimeIcons = {
  deno: <Terminal className="h-3.5 w-3.5" />,
  node: <Coffee className="h-3.5 w-3.5" />,
  bun: <Egg className="h-3.5 w-3.5" />,
}

// Colores para los runtimes
const runtimeColors = {
  deno: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  node: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  bun: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
}

// Estilos para modos de seguridad
const securityStyles = {
  strict: "destructive",
  balanced: "default",
  debug: "outline",
}

export default function RuntimeSelector({ runtime, securityMode, onRuntimeChange, onSecurityModeChange }) {
  return (
    <div className="flex items-center gap-6">
      {/* Runtime selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Runtime</span>
        </div>
        <ToggleGroup 
          type="single" 
          value={runtime} 
          onValueChange={onRuntimeChange}
          className="gap-1"
        >
          {['deno', 'node', 'bun'].map((item) => (
            <ToggleGroupItem
              key={item}
              value={item}
              aria-label={`Runtime ${item}`}
              className={`gap-1.5 px-3 py-1.5 text-xs font-medium ${runtimeColors[item]} ${
                runtime === item ? 'ring-2 ring-offset-1 ring-primary' : ''
              }`}
            >
              {runtimeIcons[item]}
              <span className="uppercase">{item}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Security mode selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Security</span>
        </div>
        <ToggleGroup 
          type="single" 
          value={securityMode} 
          onValueChange={onSecurityModeChange}
          className="gap-1"
        >
          {['strict', 'balanced', 'debug'].map((item) => (
            <ToggleGroupItem
              key={item}
              value={item}
              aria-label={`Security mode ${item}`}
              variant={securityStyles[item]}
              className="gap-1.5 px-3 py-1.5 text-xs font-medium capitalize"
            >
              {item}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  )
}