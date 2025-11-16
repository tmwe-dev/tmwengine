import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Loader2, FolderSync, AlertTriangle } from 'lucide-react';
import type { LogEntry } from '@/lib/email/strategies/DownloadStrategy';

interface EmailSyncLogsProps {
  logs: LogEntry[];
  isRunning: boolean;
}

export function EmailSyncLogs({ logs, isRunning }: EmailSyncLogsProps) {
  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'importing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'preparing':
        return <FolderSync className="h-4 w-4 text-purple-500" />;
      default:
        return <Loader2 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPhaseBadgeVariant = (phase: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (phase) {
      case 'completed':
        return 'default';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Sync Logs</h3>
        {isRunning && (
          <Badge variant="outline" className="text-xs">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            In corso...
          </Badge>
        )}
      </div>
      
      <ScrollArea className="h-[400px] rounded-md border p-4">
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nessun log disponibile. Avvia la sincronizzazione per vedere i progressi.
            </p>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="mt-0.5">
                  {getPhaseIcon(log.phase)}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getPhaseBadgeVariant(log.phase)} className="text-xs">
                      {log.phase.toUpperCase()}
                    </Badge>
                    {log.folder && (
                      <span className="text-xs text-muted-foreground">
                        📁 {log.folder}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm leading-relaxed">{log.message}</p>
                  
                  {log.count && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Progresso: {log.count.current} / {log.count.total}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${(log.count.current / log.count.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {log.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      ✉️ {log.email}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
