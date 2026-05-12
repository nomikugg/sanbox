// components/DebuggerPanel.jsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bug, Play, Pause, SkipForward } from "lucide-react"

export default function DebuggerPanel({ debuggerState, activeSnippet, onStep, onToggleBreakpoint }) {
  return (
    <Card className="flex flex-col h-full rounded-none border-border shadow-xs">
      <CardHeader className="py-0 px-4 border-b border-border flex flex-row items-center justify-between">
        <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
          <Bug className="h-3.5 w-3.5" />
          Debugger
        </CardTitle>
        {debuggerState.connected && (
          <Badge variant="outline" className="gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 animate-pulse" />
            Connected
          </Badge>
        )}
      </CardHeader>
      
      <CardContent className="p-0 m-0 flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="flex flex-row items-center  px-1 space-y-4">


            {/* Status cards */}
            <div className="flex-1 flex-col gap-2 mx-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 border border-border">
                <span className="text-xs text-muted-foreground">Status</span>
                <Badge variant={debuggerState.paused ? "destructive" : "default"}>
                  {debuggerState.paused ? 'Paused' : 'Running'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 border border-border">
                <span className="text-xs text-muted-foreground">Session</span>
                <code className="text-xs font-mono text-foreground">
                  {debuggerState.sessionId?.slice(0, 8) ?? 'none'}
                </code>
              </div>
            </div>

            {/* Debug actions */}
            <div className="flex-1 flex-col gap-2 mx-4">
              <div className="text-xs text-muted-foreground">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onStep}
                  disabled={!debuggerState.connected}
                  className="flex-1 mx-2"
                >
                  <SkipForward className="h-3.5 w-3.5 mr-1" />
                  Step over
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onToggleBreakpoint(1)}
                  className="flex-1 mx-2"
                >
                  <Pause className="h-3.5 w-3.5 mr-1" />
                  Breakpoint
                </Button>
              </div>

              {/* Breakpoints list */}
              {debuggerState.breakpoints?.length > 0 && (
                <div className="mt-4 mx-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Breakpoints
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {debuggerState.breakpoints.map((line) => (
                      <Badge 
                        key={line} 
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => onToggleBreakpoint(line)}
                      >
                        Line {line} ✕
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div> 

            {/* Active snippet */}
            <div className="flex-1 flex-col gap-2 mx-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Active Snippet
              </div>
              <pre className="p-3 bg-muted/30 border border-border text-xs font-mono text-foreground whitespace-pre-wrap overflow-x-auto">
                {activeSnippet?.code ?? 'No history selected.'}
              </pre>
            </div>

            {/* Variables (si hay) para un futuro */}
            {debuggerState.variables?.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Variables
                </div>
                <div className="space-y-1">
                  {debuggerState.variables.map((variable, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-1 border-b border-border/50">
                      <span className="font-mono text-foreground">{variable.name}</span>
                      <span className="font-mono text-muted-foreground">{variable.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}