/**
 * SINGLE FAST LOG VIEWER - Componente log real-time
 */

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LogEntry } from '@/lib/email/strategies/DownloadStrategy';
import { Loader2, CheckCircle, XCircle, Download, AlertTriangle } from 'lucide-react';

interface SingleFastLogViewerProps {
  logs: LogEntry[];
}

export function SingleFastLogViewer({ logs }: SingleFastLogViewerProps) {
  const getPhaseIcon = (phase: LogEntry['phase']) => {
    switch (phase) {
      case 'preparing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
      case 'importing':
        return <Download className="h-4 w-4 text-green-400" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skip':
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getPhaseColor = (phase: LogEntry['phase']) => {
    switch (phase) {
      case 'preparing':
        return 'text-blue-400';
      case 'importing':
        return 'text-green-400';
      case 'completed':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'skip':
      case 'warning':
        return 'text-yellow-500';
    }
  };

  return (
    <Card className="bg-black border-green-500/20">
      <CardHeader>
        <CardTitle className="text-green-400 font-mono flex items-center gap-2">
          <span className="animate-pulse">█</span>
          📋 LOG TEMPO REALE
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {logs.length === 0 && (
            <div className="text-gray-500 font-mono text-sm">
              Attendi... Il log apparirà qui durante l'esecuzione
            </div>
          )}
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-3 mb-3 text-sm font-mono border-b border-gray-800 pb-2">
              <span className="text-gray-600 shrink-0 w-[80px]">
                {log.timestamp.toLocaleTimeString()}
              </span>
              <div className="shrink-0">
                {getPhaseIcon(log.phase)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={getPhaseColor(log.phase)}>
                    {log.message}
                  </span>
                  {log.count && (
                    <span className="text-blue-400">
                      [{log.count.current}/{log.count.total}]
                    </span>
                  )}
                </div>
                
                {log.email && (
                  <div className="text-gray-400 text-xs mt-1">
                    📧 {log.email}
                  </div>
                )}
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
