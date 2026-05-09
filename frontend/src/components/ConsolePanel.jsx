// components/ConsolePanel.jsx
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ConsolePanel({ logs, error, metrics, isExecuting }) {
  const visibleLogs = logs?.length ? logs : error ? [{ kind: 'error', message: error }] : [];

  return (
    <Card className="border-border shadow-lg overflow-hidden flex flex-col h-full rounded-t-lg">
      <CardHeader className="py-1 px-4 border-b border-border">
        <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <span>Console</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="px-5">
            {visibleLogs.length === 0 ? (
              <div className="text-muted-foreground text-sm py-2">No output yet.</div>
            ) : (
              visibleLogs.map((entry, index) => (
                <div key={index} className="grid grid-cols-[75px_minmax(0,1fr)] gap-2 py-1.5 border-b border-border/30 text-xs font-mono">
                  <div className="text-muted-foreground">
                    {entry.kind ?? 'log'}
                  </div>
                  <div className={`
                    ${entry.kind === 'error' ? 'text-destructive' : ''}
                    ${entry.kind === 'warn' ? 'text-yellow-600 dark:text-yellow-500' : ''}
                    break-all
                  `}>
                    {entry.message ?? String(entry)}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}