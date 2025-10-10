import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Folder, 
  FolderOpen,
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
import { useSyncSmart } from '@/hooks/useSyncSmart';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { emailFolderApi } from '@/lib/tmwe-api-integrated';

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
  
  const [sourceFolders, setSourceFolders] = useState<FolderInfo[]>([]);
  const [destinationStats, setDestinationStats] = useState<FolderInfo[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [syncConfig, setSyncConfig] = useState({
    folder: 'INBOX',
    batchSize: 100,
    maxEmails: 10000,
    targetEmails: 50000  // Target per importazione completa
  });
  const [totalEmailsInFolder, setTotalEmailsInFolder] = useState(0);

  const { 
    isSyncing,
    isPaused,
    syncedCount, 
    syncError, 
    startSync,
    pause,
    resume,
    stop,
    reset 
  } = useSyncSmart({ 
    folder: syncConfig.folder, 
    totalEmails: totalEmailsInFolder 
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const discoverFolders = async () => {
    addLog('⚠️ Funzione ricerca cartelle non disponibile - funzione eliminata');
    toast({
      title: "Funzione non disponibile",
      description: "La ricerca cartelle è stata rimossa",
      variant: "destructive"
    });
  };

  const fetchFolderStats = async () => {
    try {
      addLog('📊 Caricamento statistiche cartelle...');
      
      // Recupera dati reali dalle API TMWE
      const foldersResponse = await emailFolderApi.getFolders();
      const folders = foldersResponse?.folders || [];
      
      const sourceFoldersData: FolderInfo[] = folders.map((f: any) => ({
        name: f.name,
        totalEmails: f.total || 0,
        unreadEmails: f.unseen || 0,
        iconColor: f.name === 'INBOX' ? 'text-blue-600' : 
                  f.name === 'Sent' ? 'text-green-600' : 
                  f.name === 'Draft' || f.name === 'Drafts' ? 'text-orange-600' : 'text-gray-600'
      }));
      
      setSourceFolders(sourceFoldersData);
      
      // Imposta il totale per la cartella corrente
      const currentFolderInfo = sourceFoldersData.find(f => f.name === syncConfig.folder);
      if (currentFolderInfo) {
        setTotalEmailsInFolder(currentFolderInfo.totalEmails);
        addLog(`📁 ${syncConfig.folder}: ${currentFolderInfo.totalEmails} email totali`);
      }

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
        addLog(`✅ Statistiche caricate: ${destFolders.length} cartelle nel database`);
      }
    } catch (error) {
      console.error('Error fetching folder stats:', error);
      addLog(`❌ Errore caricamento statistiche: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  };

  const downloadEmails = async () => {
    try {
      addLog('🚀 Avvio Smart Sync a 2 fasi...');
      addLog(`📁 Cartella: ${syncConfig.folder}`);
      addLog(`📊 Email totali nella cartella: ${totalEmailsInFolder}`);
      addLog('');
      addLog('⭐ FASE 1: Controllo email esistenti nel database...');
      addLog('⭐ FASE 2: Download contenuto completo solo nuove email...');
      addLog('');
      
      await startSync();
      
      addLog('');
      addLog('✅ Smart Sync completato!');
      
      if (onSyncComplete) {
        onSyncComplete();
      }

      await fetchFolderStats();

    } catch (error) {
      addLog('');
      addLog('========== ERRORE ==========');
      addLog(`❌ ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
      if (error instanceof Error && error.stack) {
        addLog(`Stack: ${error.stack}`);
      }
      addLog('============================');
      
      toast({
        title: "Errore Download",
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
        variant: "destructive"
      });
    }
  };

  const handlePause = () => {
    pause();
    addLog('⏸️ Sincronizzazione in pausa');
  };

  const handleResume = () => {
    resume();
    addLog('▶️ Sincronizzazione ripresa');
  };

  const handleStop = () => {
    stop();
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
        fetchFolderStats();
      }
      
      if (progress.status === 'error') {
        addLog('❌ Errore durante la sincronizzazione');
      }
    }
  }, [progress]);

  useEffect(() => {
    if (syncedCount > 0) {
      addLog(`✅ Email scaricate: ${syncedCount}`);
    }
  }, [syncedCount]);

  useEffect(() => {
    if (syncError) {
      addLog(`❌ Errore: ${syncError}`);
    }
  }, [syncError]);

  return (
    <div className="space-y-6">
      
      {/* Statistiche Real-Time */}
      {isSyncing && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 animate-pulse text-primary" />
              Smart Sync a 2 Fasi in Corso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{syncedCount}</div>
                <div className="text-sm text-muted-foreground">Nuove Email Scaricate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalEmailsInFolder}</div>
                <div className="text-sm text-muted-foreground">Totale in Cartella</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {totalEmailsInFolder > 0 ? Math.round((syncedCount / totalEmailsInFolder) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Progresso</div>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={totalEmailsInFolder > 0 ? (syncedCount / totalEmailsInFolder) * 100 : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Smart Sync Email (2 Fasi)
            {isSyncing && (
              <Badge variant="secondary" className="animate-pulse">
                <Zap className="h-3 w-3 mr-1" />
                In Corso
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Sistema intelligente: scarica solo email nuove con contenuto completo
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium">Cartella</label>
              <select 
                className="w-full p-2 border rounded bg-transparent"
                value={syncConfig.folder}
                onChange={(e) => {
                  setSyncConfig(prev => ({ ...prev, folder: e.target.value }));
                  // Aggiorna il totale quando cambia la cartella
                  const folderInfo = sourceFolders.find(f => f.name === e.target.value);
                  if (folderInfo) {
                    setTotalEmailsInFolder(folderInfo.totalEmails);
                  }
                }}
                disabled={isSyncing}
              >
                <option value="INBOX">INBOX</option>
                <option value="Sent">Sent</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Max Email</label>
              <input 
                type="number" 
                className="w-full p-2 border rounded bg-transparent"
                value={syncConfig.maxEmails}
                onChange={(e) => setSyncConfig(prev => ({ ...prev, maxEmails: parseInt(e.target.value) }))}
                disabled={isSyncing}
                min="0"
                max="10000"
                placeholder="0 = tutte"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={fetchFolderStats} variant="outline" disabled={isSyncing}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Aggiorna Statistiche
            </Button>
            
            {!isSyncing ? (
              <Button onClick={downloadEmails} className="bg-gradient-to-r from-primary to-blue-600">
                <Download className="h-4 w-4 mr-2" />
                Scarica Email (Smart Sync)
              </Button>
            ) : (
              <div className="flex gap-2">
                {!isPaused ? (
                  <Button onClick={handlePause} variant="outline" className="flex-1">
                    <Pause className="h-4 w-4 mr-2" />
                    Pausa
                  </Button>
                ) : (
                  <Button onClick={handleResume} variant="outline" className="flex-1">
                    <Play className="h-4 w-4 mr-2" />
                    Riprendi
                  </Button>
                )}
                <Button onClick={handleStop} variant="destructive" className="flex-1">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Ferma
                </Button>
              </div>
            )}
          </div>

          {/* Progress Bar Smart Sync */}
          {isSyncing && (
            <div className="space-y-3 bg-muted p-4 rounded-lg mt-4">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium flex items-center gap-2">
                  Smart Sync a 2 Fasi
                  {isPaused && (
                    <Badge variant="secondary" className="animate-pulse">
                      ⏸️ IN PAUSA
                    </Badge>
                  )}
                </span>
                <span className="text-xs">
                  {syncedCount} / {totalEmailsInFolder} email
                </span>
              </div>
              
              <div className="space-y-2">
                <Progress 
                  value={totalEmailsInFolder > 0 ? (syncedCount / totalEmailsInFolder) * 100 : 0} 
                  className="h-3" 
                />
                
                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div>
                    <div>📁 Cartella: {syncConfig.folder}</div>
                    <div>📊 Email totali: {totalEmailsInFolder}</div>
                  </div>
                  <div>
                    <div>✅ Nuove scaricate: {syncedCount}</div>
                    <div>⏰ In corso...</div>
                  </div>
                </div>
              </div>
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
                <div key={folder.name} className="flex items-center justify-between p-3 border rounded-lg bg-transparent">
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
                <div key={folder.name} className="flex items-center justify-between p-3 border rounded-lg bg-transparent">
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
          <ScrollArea className="h-64 w-full border rounded-md p-4 bg-transparent">
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