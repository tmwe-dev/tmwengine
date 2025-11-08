/**
 * Edge Function Monitor - Monitoring Edge Function crashes e reboots
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EdgeLog {
  timestamp: number;
  event_type: string;
  event_message: string;
  level: string;
}

export function EdgeFunctionMonitor() {
  const [logs, setLogs] = useState<EdgeLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRebootTime, setLastRebootTime] = useState<Date | null>(null);
  const [rebootCount, setRebootCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 10000); // Refresh ogni 10s
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      // Simulazione - In produzione usare supabase--edge-function-logs
      // Per ora mostriamo dati mock
      const mockLogs: EdgeLog[] = [
        {
          timestamp: Date.now() - 120000,
          event_type: 'Boot',
          event_message: 'booted (time: 40ms)',
          level: 'log',
        },
      ];

      setLogs(mockLogs);
      
      // Conta reboots negli ultimi 30 minuti
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      const recentReboots = mockLogs.filter(
        log => log.event_type === 'Boot' && log.timestamp > thirtyMinutesAgo
      );
      
      setRebootCount(recentReboots.length);
      
      if (recentReboots.length > 0) {
        setLastRebootTime(new Date(recentReboots[0].timestamp));
      }

    } catch (error) {
      console.error('Error loading edge function logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasRecentCrash = () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return logs.some(
      log => (log.event_type === 'Shutdown' || log.event_type === 'Boot') && 
             log.timestamp > fiveMinutesAgo
    );
  };

  const isHealthy = !hasRecentCrash() && rebootCount < 3;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            🔍 Edge Function Monitor
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={loadLogs}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Logs
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-3">
          {isHealthy ? (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              tmwe-api-proxy: ✅ Healthy
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertTriangle className="h-4 w-4 mr-1" />
              tmwe-api-proxy: ⚠️ Crashes detected
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border rounded-md">
            <p className="text-sm text-muted-foreground">Last Reboot</p>
            <p className="text-lg font-semibold">
              {lastRebootTime 
                ? lastRebootTime.toLocaleTimeString() 
                : 'N/A'}
            </p>
          </div>
          <div className="p-3 border rounded-md">
            <p className="text-sm text-muted-foreground">Reboots (30 min)</p>
            <p className="text-lg font-semibold">
              {rebootCount}
            </p>
          </div>
        </div>

        {/* Alert */}
        {hasRecentCrash() && (
          <div className="p-3 border border-orange-200 dark:border-orange-800 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-600" />
              <div className="text-sm">
                <span className="font-semibold text-orange-700 dark:text-orange-400">
                  Crash rilevato negli ultimi 5 minuti
                </span>
                <p className="text-muted-foreground mt-1">
                  Questo può indicare un sovraccarico dell'Edge Function. 
                  Considera di ridurre batch size o parallelismo nei test.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Logs */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Recent Events ({logs.length})</p>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {logs.slice(0, 10).map((log, index) => (
              <div 
                key={index} 
                className="p-2 text-xs border rounded-md font-mono"
              >
                <span className="text-muted-foreground">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                {' - '}
                <span className="font-semibold">{log.event_type}</span>
                {' - '}
                <span>{log.event_message}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
