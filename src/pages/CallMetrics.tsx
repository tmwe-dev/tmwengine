import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Video, Clock, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CallLog {
  id: string;
  call_type: 'audio' | 'video';
  status: 'initiated' | 'ringing' | 'connected' | 'ended' | 'failed' | 'rejected';
  connection_time_ms: number | null;
  duration_seconds: number | null;
  ice_candidates_count: number | null;
  video_quality: 'low' | 'medium' | 'high' | 'auto' | null;
  error_message: string | null;
  created_at: string;
}

interface Stats {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  avg_connection_time: number;
  avg_duration: number;
  avg_ice_candidates: number;
}

export default function CallMetrics() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_calls: 0,
    successful_calls: 0,
    failed_calls: 0,
    avg_connection_time: 0,
    avg_duration: 0,
    avg_ice_candidates: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    
    // Real-time subscription
    const channel = supabase
      .channel('call-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_logs'
        },
        () => loadMetrics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setLogs((data as CallLog[]) || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const successful = data?.filter(l => l.status === 'connected' || l.status === 'ended').length || 0;
      const failed = data?.filter(l => l.status === 'failed' || l.status === 'rejected').length || 0;
      
      const connectedLogs = data?.filter(l => l.connection_time_ms) || [];
      const avgConnectionTime = connectedLogs.length > 0
        ? connectedLogs.reduce((acc, l) => acc + (l.connection_time_ms || 0), 0) / connectedLogs.length
        : 0;
      
      const endedLogs = data?.filter(l => l.duration_seconds) || [];
      const avgDuration = endedLogs.length > 0
        ? endedLogs.reduce((acc, l) => acc + (l.duration_seconds || 0), 0) / endedLogs.length
        : 0;
      
      const iceLogsWithCandidates = data?.filter(l => l.ice_candidates_count) || [];
      const avgIce = iceLogsWithCandidates.length > 0
        ? iceLogsWithCandidates.reduce((acc, l) => acc + (l.ice_candidates_count || 0), 0) / iceLogsWithCandidates.length
        : 0;

      setStats({
        total_calls: total,
        successful_calls: successful,
        failed_calls: failed,
        avg_connection_time: avgConnectionTime,
        avg_duration: avgDuration,
        avg_ice_candidates: Math.round(avgIce),
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: CallLog['status']) => {
    const variants: Record<CallLog['status'], { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      initiated: { variant: 'secondary', icon: Clock },
      ringing: { variant: 'secondary', icon: Phone },
      connected: { variant: 'default', icon: CheckCircle2 },
      ended: { variant: 'outline', icon: CheckCircle2 },
      failed: { variant: 'destructive', icon: AlertCircle },
      rejected: { variant: 'destructive', icon: AlertCircle },
    };
    
    const config = variants[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📊 Metriche Chiamate</h1>
        <p className="text-muted-foreground">
          Monitoraggio real-time delle performance audio/video
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiamate Totali</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_calls}</div>
            <p className="text-xs text-muted-foreground">
              {stats.successful_calls} riuscite • {stats.failed_calls} fallite
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Connessione Medio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avg_connection_time.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              Media tempo per stabilire connessione
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durata Media</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(stats.avg_duration / 60)}m {Math.floor(stats.avg_duration % 60)}s
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.avg_ice_candidates} ICE candidates medi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Call Logs Table */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Tutte ({logs.length})</TabsTrigger>
          <TabsTrigger value="audio">
            <Phone className="h-4 w-4 mr-2" />
            Audio ({logs.filter(l => l.call_type === 'audio').length})
          </TabsTrigger>
          <TabsTrigger value="video">
            <Video className="h-4 w-4 mr-2" />
            Video ({logs.filter(l => l.call_type === 'video').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <CallLogsTable logs={logs} getStatusBadge={getStatusBadge} />
        </TabsContent>

        <TabsContent value="audio" className="space-y-4">
          <CallLogsTable 
            logs={logs.filter(l => l.call_type === 'audio')} 
            getStatusBadge={getStatusBadge} 
          />
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <CallLogsTable 
            logs={logs.filter(l => l.call_type === 'video')} 
            getStatusBadge={getStatusBadge} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CallLogsTable({ 
  logs, 
  getStatusBadge 
}: { 
  logs: CallLog[]; 
  getStatusBadge: (status: CallLog['status']) => JSX.Element;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Log Chiamate</CardTitle>
        <CardDescription>Ultimi 50 eventi</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.map((log) => (
            <div 
              key={log.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {log.call_type === 'audio' ? (
                    <Phone className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Video className="h-5 w-5 text-purple-500" />
                  )}
                  <span className="font-medium capitalize">{log.call_type}</span>
                </div>
                
                {getStatusBadge(log.status)}
                
                {log.video_quality && (
                  <Badge variant="outline">{log.video_quality}</Badge>
                )}
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                {log.connection_time_ms && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {log.connection_time_ms}ms
                  </div>
                )}
                
                {log.duration_seconds && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {Math.floor(log.duration_seconds / 60)}m {log.duration_seconds % 60}s
                  </div>
                )}
                
                {log.ice_candidates_count && (
                  <span className="text-xs">
                    {log.ice_candidates_count} ICE
                  </span>
                )}
                
                <span className="text-xs">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          
          {logs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nessuna chiamata registrata
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
