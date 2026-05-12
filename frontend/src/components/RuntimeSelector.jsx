// components/RuntimeSelector.jsx
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Server, Shield, Terminal, Coffee, Egg } from "lucide-react"

const runtimeIcons = {
  deno: <Terminal className="h-3.5 w-3.5" />,
  node: <Coffee className="h-3.5 w-3.5" />,
  bun:  <Egg className="h-3.5 w-3.5" />,
}

const runtimeColors = {
  deno: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  node: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  bun:  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
}

const runtimeLabels = {
  deno: "Deno",
  node: "Node.js",
  bun:  "Bun",
}

// Install URL shown in the tooltip when a runtime is unavailable.
const runtimeInstallHint = {
  node: "Install from nodejs.org",
  deno: "Install from deno.com",
  bun:  "Install from bun.sh (coming soon)",
}

const securityStyles = {
  strict:   "destructive",
  balanced: "default",
  debug:    "outline",
}

// Optimistic default capabilities shown during the IPC probe round-trip.
const DEFAULT_CAPABILITIES = {
  node: { installed: true,  version: null, supportsPermissions: false, supportsDebugger: false },
  deno: { installed: true,  version: null, supportsPermissions: true,  supportsDebugger: false },
  bun:  { installed: false, version: null, supportsPermissions: false, supportsDebugger: false },
};

export default function RuntimeSelector({
  runtime,
  securityMode,
  onRuntimeChange,
  onSecurityModeChange,
  capabilities = DEFAULT_CAPABILITIES,
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
            const caps = capabilities[item] ?? DEFAULT_CAPABILITIES[item];
            const available = caps?.installed ?? false;

            return (
              <Tooltip key={item}>
                {/*
                  Disabled buttons block pointer events in most browsers, so
                  the tooltip trigger wraps a span that stays interactive.
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

                {/* Tooltip: version for available runtimes, install hint for unavailable */}
                {available ? (
                  caps.version && (
                    <TooltipContent side="bottom">
                      {runtimeLabels[item]} v{caps.version}
                    </TooltipContent>
                  )
                ) : (
                  <TooltipContent side="bottom">
                    <span className="font-medium">{runtimeLabels[item]} is not installed.</span>
                    <br />
                    <span className="text-muted-foreground">{runtimeInstallHint[item]}</span>
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
