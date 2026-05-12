// components/ConsolePanel.jsx
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect, useRef } from 'react';
import { Play, Terminal } from 'lucide-react';

export default function ConsolePanel({ logs, error, metrics, isExecuting, liveResults }) {
  const [activeTab, setActiveTab] = useState('live'); // 'output' | 'live'
  const [liveSessions, setLiveSessions] = useState([]); // [{ id, entries: [] }]
  const [unreadLive, setUnreadLive] = useState(false);

  // Ref kept in sync with activeTab so the liveResults effect can read the
  // current tab without listing activeTab in its own deps. Adding activeTab to
  // that effect's deps would cause the session deduplication block to re-run on
  // every tab switch, risking duplicate session entries.
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  useEffect(() => {
    if (!liveResults?.length) return;

    // Mark unread only when the user is not already on the live tab.
    // Never force a tab switch — preserving the user's selection is the fix.
    if (activeTabRef.current !== 'live') {
      setUnreadLive(true);
    }

    // Group live results by session to avoid duplicate entries.
    const sessionId =
      liveResults[0]?._session ?? liveResults[liveResults.length - 1]?._session ?? null;

    if (sessionId) {
      setLiveSessions((prev) => {
        const lastSession = prev.length > 0 ? prev[prev.length - 1] : null;

        // Same session already recorded — ignore.
        if (lastSession && lastSession.id === sessionId) return prev;

        // If last session had an error and the new one doesn't, replace it so
        // corrected code wipes the previous error result.
        const currentHasError = liveResults.some((r) => r.kind === 'error');
        if (lastSession && lastSession.entries.some((e) => e.kind === 'error') && !currentHasError) {
          return [...prev.slice(0, -1), { id: sessionId, entries: liveResults }].slice(-100);
        }

        return [...prev, { id: sessionId, entries: liveResults }].slice(-100);
      });
    } else {
      // Fallback for untagged results: deduplicate by comparing the last entry.
      setLiveSessions((prev) => {
        const lastSession = prev.length > 0 ? prev[prev.length - 1] : null;
        const currentResult = liveResults[liveResults.length - 1];

        if (lastSession) {
          const lastEntry = lastSession.entries[lastSession.entries.length - 1];
          if (lastEntry && JSON.stringify(lastEntry) === JSON.stringify(currentResult)) {
            return prev;
          }
        }

        return [...prev, { id: Date.now(), entries: liveResults }].slice(-100);
      });
    }
  }, [liveResults]);

  // Splits an error string into console entries. A multi-violation backend error
  // is formatted as "header\n• line\n• line", so each non-empty line becomes its
  // own row: bullet lines are 'error', the header line is 'warn'. Single-line
  // errors (timeouts, transpile failures) produce one 'error' entry unchanged.
  const parseErrorEntries = (err) => {
    if (!err) return [];
    const lines = err.split('\n').filter(Boolean);
    if (lines.length <= 1) return [{ kind: 'error', message: err }];
    return lines.map((line) => ({
      kind: line.startsWith('•') ? 'error' : 'warn',
      message: line,
    }));
  };

  const visibleLogs =
    activeTab === 'output'
      ? logs?.length
        ? logs
        : parseErrorEntries(error)
      : liveSessions.flatMap((s) => s.entries);

  const formatResult = (entry) => {
    if (entry.kind === 'return') return { kind: '←', message: entry.message };
    if (entry.kind === 'log')    return { kind: 'log',  message: entry.message };
    if (entry.kind === 'warn')   return { kind: 'warn', message: entry.message };
    if (entry.kind === 'error')  return { kind: 'error', message: entry.message };
    return entry;
  };

  return (
    <Card className="border-border shadow-lg rounded-none overflow-hidden flex flex-col h-full">
      <CardHeader className="py-0 px-4 border-b border-border flex flex-row items-center justify-between">
        <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5" />
          Console / REPL
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
              setUnreadLive(false);
              setLiveSessions([]);
            }}
            className={`px-2 py-0.5 text-xs rounded-md transition-colors flex items-center gap-1 ${
              activeTab === 'live'
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-muted'
            }`}
          >
            <Play className="h-3 w-3" />
            Live Eval
            {unreadLive && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
                aria-label="new live results"
              />
            )}
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="">
            {activeTab === 'live' && (
              <div className="text-xs text-muted-foreground bg-muted/20">
              </div>
            )}

            {visibleLogs.length === 0 ? (
              <div className="text-muted-foreground text-sm py-2">
              </div>
            ) : (
              visibleLogs.map((entry, index) => {
                const formatted = formatResult(entry);
                return (
                  <div
                    key={index}
                    className="grid grid-cols-[55px_minmax(0,1fr)] gap-2 py-1.5 border-b border-border/30 text-xs font-mono"
                  >
                    <div
                      className={`text-muted-foreground ${
                        formatted.kind === '←' ? 'text-accent font-bold' : ''
                      }`}
                    >
                      {formatted.kind === '←' ? '←' : formatted.kind}
                    </div>
                    <div
                      className={`
                        ${formatted.kind === 'error' ? 'text-red-500' : ''}
                        ${formatted.kind === 'warn'  ? 'text-yellow-500' : ''}
                        ${formatted.kind === '←'     ? 'text-accent' : ''}
                        break-all
                      `}
                    >
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
  );
}
