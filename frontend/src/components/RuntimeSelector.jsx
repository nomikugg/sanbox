// components/RuntimeSelector.jsx
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Server, Shield, Terminal, Coffee, Egg } from "lucide-react"

const runtimeIcons = {
  deno: <Terminal className="h-3.5 w-3.5" />,
  node: <Coffee className="h-3.5 w-3.5" />,
  bun: <Egg className="h-3.5 w-3.5" />,
}

const runtimeColors = {
  deno: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  node: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  bun: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
}

const runtimeLabels = {
  deno: "Deno",
  node: "Node.js",
  bun: "Bun",
}

const securityStyles = {
  strict: "destructive",
  balanced: "default",
  debug: "outline",
}

const DEFAULT_AVAILABILITY = { node: true, deno: true, bun: false };

export default function RuntimeSelector({
  runtime,
  securityMode,
  onRuntimeChange,
  onSecurityModeChange,
  availability = DEFAULT_AVAILABILITY,
}) {
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
          {['deno', 'node', 'bun'].map((item) => {
            const available = availability[item] ?? false;
            return (
              <Tooltip key={item}>
                {/*
                  Wrap in a span so the tooltip trigger receives pointer events
                  even when the ToggleGroupItem is disabled (disabled elements
                  do not fire pointer events in most browsers).
                */}
                <TooltipTrigger asChild>
                  <span className="inline-flex" tabIndex={available ? undefined : -1}>
                    <ToggleGroupItem
                      value={item}
                      aria-label={`Runtime ${item}`}
                      disabled={!available}
                      className={`gap-1.5 px-3 py-1.5 text-xs font-medium ${runtimeColors[item]} ${
                        runtime === item ? 'ring-2 ring-offset-1 ring-primary' : ''
                      } ${!available ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {runtimeIcons[item]}
                      <span className="uppercase">{item}</span>
                    </ToggleGroupItem>
                  </span>
                </TooltipTrigger>
                {!available && (
                  <TooltipContent side="bottom">
                    {runtimeLabels[item]} is not installed
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
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
