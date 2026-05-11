// components/ConsolePanel.jsx
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect } from 'react';
import { Play, Terminal } from 'lucide-react';

export default function ConsolePanel({ logs, error, metrics, isExecuting, liveResults }) {
  const [activeTab, setActiveTab] = useState('live'); // 'output' o 'live'
  const [liveLogs, setLiveLogs] = useState([]);

  // Actualizar logs en vivo
  useEffect(() => {

    // console.log("Se recibio los liveResults en ConsolePanel:", liveResults);
    if (liveResults && liveResults.length > 0) {
      setLiveLogs(prev => {
        const newLogs = [...prev, ...liveResults];
        return newLogs.slice(-100);
      });
    }
  }, [liveResults]);

  const visibleLogs = activeTab === 'output' 
    ? (logs?.length ? logs : error ? [{ kind: 'error', message: error }] : [])
    : liveLogs;

  const formatResult = (entry) => {
    if (entry.kind === 'return') {
      return { kind: '←', message: entry.message };
    }
    if (entry.kind === 'log') {
      return { kind: 'log', message: entry.message };
    }
    if (entry.kind === 'warn') {
      return { kind: 'warn', message: entry.message };
    }
    if (entry.kind === 'error') {
      return { kind: 'error', message: entry.message };
    }
    return entry;
  };

  return (
    <Card className="border-border shadow-lg overflow-hidden flex flex-col h-full rounded-t-lg">
      <CardHeader className="py-1 px-4 border-b border-border flex flex-row items-center justify-between">
        <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5" />
          Console
        </CardTitle>
        
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('output')}
            className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
              activeTab === 'output' 
                ? 'bg-accent text-accent-foreground' 
                : 'hover:bg-muted'
            }`}
          >
            Run Output
          </button>
          <button
            onClick={() => {
              setActiveTab('live');
              setLiveLogs([]);
            }}
            className={`px-2 py-0.5 text-xs rounded-md transition-colors flex items-center gap-1 ${
              activeTab === 'live' 
                ? 'bg-accent text-accent-foreground' 
                : 'hover:bg-muted'
            }`}
          >
            <Play className="h-3 w-3" />
            Live Eval
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="px-4 py-2">
            {activeTab === 'live' && (
              <div className="mb-2 text-xs text-muted-foreground bg-muted/20 p-2 rounded-md">
                💡 Results appear automatically as you type
              </div>
            )}
            
            {visibleLogs.length === 0 ? (
              <div className="text-muted-foreground text-sm py-2">
                {activeTab === 'live' 
                  ? 'Start typing to see live results...' 
                  : 'No output yet. Click Run to execute.'}
              </div>
            ) : (
              visibleLogs.map((entry, index) => {
                const formatted = formatResult(entry);
                return (
                  <div key={index} className="grid grid-cols-[55px_minmax(0,1fr)] gap-2 py-1.5 border-b border-border/30 text-xs font-mono">
                    <div className={`text-muted-foreground ${
                      formatted.kind === '←' ? 'text-accent font-bold' : ''
                    }`}>
                      {formatted.kind === '←' ? '←' : formatted.kind}
                    </div>
                    <div className={`
                      ${formatted.kind === 'error' ? 'text-red-500' : ''}
                      ${formatted.kind === 'warn' ? 'text-yellow-500' : ''}
                      ${formatted.kind === '←' ? 'text-accent' : ''}
                      break-all
                    `}>
                      {formatted.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}