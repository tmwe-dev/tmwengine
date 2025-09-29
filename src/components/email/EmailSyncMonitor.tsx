import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Folder, 
  Database, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Activity,
  ArrowRight,
  Download,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSyncProgress } from '@/hooks/useSyncProgress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmailSyncMonitorProps {
  onSyncComplete?: () => void;
}

interface FolderInfo {
  name: string;
  totalEmails: number;
  unreadEmails: number;
  iconColor: string;
}

export const EmailSyncMonitor: React.FC<EmailSyncMonitorProps> = ({ onSyncComplete }) => {
  const { toast } = useToast();
  const { progress, percentage, estimatedTimeRemaining, startRealTimeTracking, stopRealTimeTracking } = useSyncProgress();
  
  const [isRunning, setIsRunning] = useState(false);
  const [sourceFolders, setSourceFolders] = useState<FolderInfo[]>([]);
  const [destinationStats, setDestinationStats] = useState<FolderInfo[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [syncConfig, setSyncConfig] = useState({
    folder: 'INBOX',
    batchSize: 100,
    maxEmails: 1000
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const fetchFolderStats = async () => {
    try {
      // Simula cartelle sorgente TMWE (dati statici per demo)
      setSourceFolders([
        { name: 'INBOX', totalEmails: 3769, unreadEmails: 250, iconColor: 'text-blue-600' },
        { name: 'Sent', totalEmails: 1250, unreadEmails: 0, iconColor: 'text-green-600' },
        { name: 'Draft', totalEmails: 45, unreadEmails: 45, iconColor: 'text-orange-600' },
        { name: 'Archive', totalEmails: 8900, unreadEmails: 0, iconColor: 'text-gray-600' }
      ]);

      // Recupera statistiche destinazione dal database
      const { data: emailData, error } = await supabase
        .from('email_messages')
        .select('cartella, stato')
        .order('cartella');

      if (!error && emailData) {
        const folderMap = new Map<string, { total: number; unread: number }>();
        
        emailData.forEach(email => {
          const folder = email.cartella || 'INBOX';
          const current = folderMap.get(folder) || { total: 0, unread: 0 };
          current.total++;
          if (email.stato === 'nuovo') current.unread++;
          folderMap.set(folder, current);
        });

        const destFolders: FolderInfo[] = Array.from(folderMap.entries()).map(([name, stats]) => ({
          name,
          totalEmails: stats.total,
          unreadEmails: stats.unread,
          iconColor: name === 'INBOX' ? 'text-blue-600' : 
                    name === 'Sent' ? 'text-green-600' : 
                    name === 'Draft' ? 'text-orange-600' : 'text-gray-600'
        }));

        setDestinationStats(destFolders);
      }
    } catch (error) {
      console.error('Error fetching folder stats:', error);
    }
  };

  const startSync = async () => {
    try {
      setIsRunning(true);
      addLog(`🚀 Avviando sincronizzazione cartella ${syncConfig.folder}`);
      addLog(`📋 Configurazione: ${syncConfig.batchSize} email per batch, max ${syncConfig.maxEmails} totali`);

      const { data, error } = await supabase.functions.invoke('tmwe-email-sync-batch', {
        body: {
          handler: 'batch_sync',
          folder_name: syncConfig.folder,
          batch_size: syncConfig.batchSize,
          start_offset: 0,
          max_total_emails: syncConfig.maxEmails
        }
      });

      if (error) throw error;

      if (data.progress_id) {
        addLog(`📊 Tracciamento avviato (ID: ${data.progress_id})`);
        startRealTimeTracking(data.progress_id);
      }

      addLog(`✅ Sincronizzazione completata: ${data.emails_downloaded} nuove email`);
      
      if (onSyncComplete) {
        onSyncComplete();
      }

      await fetchFolderStats();

    } catch (error) {
      addLog(`❌ Errore sincronizzazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
      toast({
        title: "Errore Sincronizzazione",
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const stopSync = () => {
    setIsRunning(false);
    stopRealTimeTracking();
    addLog('⏹️ Sincronizzazione interrotta dall\'utente');
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  useEffect(() => {
    fetchFolderStats();
  }, []);

  useEffect(() => {
    if (progress) {
      addLog(`📊 Batch ${progress.current_batch}: ${progress.processed_messages}/${progress.total_messages} email processate`);
      
      if (progress.status === 'completed') {
        addLog('🎉 Sincronizzazione completata con successo!');
        setIsRunning(false);
        fetchFolderStats();
      }
      
      if (progress.status === 'error') {
        addLog('❌ Errore durante la sincronizzazione');
        setIsRunning(false);
      }
    }
  }, [progress]);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Monitor Sincronizzazione Email
            {isRunning && (
              <Badge variant="secondary" className="animate-pulse">
                <Zap className="h-3 w-3 mr-1" />
                In Esecuzione
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium">Cartella</label>
              <select 
                className="w-full p-2 border rounded"
                value={syncConfig.folder}
                onChange={(e) => setSyncConfig(prev => ({ ...prev, folder: e.target.value }))}
                disabled={isRunning}
              >
                <option value="INBOX">INBOX</option>
                <option value="Sent">Sent</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Batch Size</label>
              <input 
                type="number" 
                className="w-full p-2 border rounded"
                value={syncConfig.batchSize}
                onChange={(e) => setSyncConfig(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                disabled={isRunning}
                min="10"
                max="500"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Max Email</label>
              <input 
                type="number" 
                className="w-full p-2 border rounded"
                value={syncConfig.maxEmails}
                onChange={(e) => setSyncConfig(prev => ({ ...prev, maxEmails: parseInt(e.target.value) }))}
                disabled={isRunning}
                min="100"
                max="10000"
              />
            </div>
            <div className="flex items-end">
              {!isRunning ? (
                <Button onClick={startSync} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Avvia Sync
                </Button>
              ) : (
                <Button onClick={stopSync} variant="destructive" className="w-full">
                  <Pause className="h-4 w-4 mr-2" />
                  Ferma Sync
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso Batch {progress.current_batch}</span>
                <span>{percentage}% - {progress.processed_messages}/{progress.total_messages}</span>
              </div>
              <Progress value={percentage} className="h-3" />
              {estimatedTimeRemaining > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Tempo rimanente stimato: {formatTime(estimatedTimeRemaining)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Folders Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Folders (TMWE Server) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Cartelle Sorgente (Server TMWE)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sourceFolders.map((folder) => (
                <div key={folder.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Folder className={cn("h-5 w-5", folder.iconColor)} />
                    <div>
                      <div className="font-medium">{folder.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {folder.totalEmails.toLocaleString()} email
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">
                      {folder.totalEmails.toLocaleString()}
                    </Badge>
                    {folder.unreadEmails > 0 && (
                      <div>
                        <Badge variant="destructive" className="text-xs">
                          {folder.unreadEmails} non lette
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Destination Folders (Local Database) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-600" />
              Cartelle Destinazione (Database Locale)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {destinationStats.length > 0 ? destinationStats.map((folder) => (
                <div key={folder.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className={cn("h-5 w-5", folder.iconColor)} />
                    <div>
                      <div className="font-medium">{folder.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {folder.totalEmails.toLocaleString()} email
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="default" className="mb-1">
                      {folder.totalEmails.toLocaleString()}
                    </Badge>
                    {folder.unreadEmails > 0 && (
                      <div>
                        <Badge variant="secondary" className="text-xs">
                          {folder.unreadEmails} non lette
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center text-muted-foreground py-8">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna email nel database locale</p>
                  <p className="text-sm">Avvia una sincronizzazione per importare le email</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Log Real-Time
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLogs([])}
            >
              <RotateCcw className="h-4 w-4" />
              Pulisci
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 w-full border rounded-md p-4">
            {logs.length > 0 ? (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nessun log disponibile</p>
                <p className="text-xs">I log appariranno qui durante la sincronizzazione</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};