// components/Explorer.jsx
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderOpen, History, FileCode, Clock } from "lucide-react"

export default function Explorer({ history, snippets, activeHistoryId, onOpenSnippet, onSelectHistory }) {
  return (
    <Card className="border-border shadow-lg overflow-hidden flex flex-col h-full">
      <CardHeader className="py-3 px-4 border-b border-border">
        <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <FolderOpen className="h-3.5 w-3.5" />
          Workspace
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Snippets section */}
            {snippets.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Snippets
                  </div>
                </div>
                <div className="space-y-1">
                  {snippets.map((snippet) => (
                    <Button
                      key={snippet.id}
                      variant="ghost"
                      className="w-full justify-start text-sm font-normal h-auto py-2 px-3"
                      onClick={() => onOpenSnippet(snippet)}
                    >
                      {snippet.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* History section */}
            {history.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    History
                  </div>
                </div>
                <div className="space-y-1">
                  {history.map((entry) => (
                    <Button
                      key={entry.id}
                      variant={entry.id === activeHistoryId ? "secondary" : "ghost"}
                      className={`w-full justify-between text-sm font-normal h-auto py-2 px-3 ${
                        entry.id === activeHistoryId ? 'bg-secondary' : ''
                      }`}
                      onClick={() => onSelectHistory(entry.id)}
                    >
                      <span className="font-mono text-xs">
                        {entry.runtime}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {snippets.length === 0 && history.length === 0 && (
              <div className="text-center py-8">
                <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No items yet</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}