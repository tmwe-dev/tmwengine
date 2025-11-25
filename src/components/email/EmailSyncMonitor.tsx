import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  const [syncConfig, setSyncConfig] = useState({
    folder: '',
    batchSize: 100,
    maxEmails: 10000,
    targetEmails: 50000
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
      // CONSOLIDATED: Now uses tmwe-api-proxy with internal_test_folder_info handler
      const folderInfoResponse = await fetch(
        `https://dlldkrzoxvjxpgkkttxu.supabase.co/functions/v1/tmwe-api-proxy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: '/app.php',
            data: { handler: 'internal_test_folder_info' }
          })
        }
      );

      if (folderInfoResponse.ok) {
        const folderData = await folderInfoResponse.json();
        if (folderData.folders) {
          const folders = folderData.folders.map((f: any) => ({
            name: f.name || f.folder,
            totalEmails: f.total || 0,
            unreadEmails: f.unread || 0,
            iconColor: 'text-blue-600'
          }));
          setSourceFolders(folders);
          setAvailableFolders(folders.map((f: any) => f.name));
        }
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
      }
    } catch (error) {
      console.error('Error fetching folder stats:', error);
    }
  };

  const downloadEmails = async () => {
    if (!selectedFolder) {
      toast({
        title: "Cartella non selezionata",
        description: "Seleziona una cartella prima di avviare il download",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsRunning(true);
      addLog('📥 Avvio download email...');
      addLog(`📁 Cartella: ${selectedFolder}`);
      addLog(`🎯 Limite: ${syncConfig.maxEmails || 'nessun limite'}`);
      
      const requestBody = { 
        mode: 'initial',
        folder_name: selectedFolder,
        max_emails: syncConfig.maxEmails || 5000,
        force_full: false
      };
      
      addLog('');
      addLog('========== PARAMETRI RICHIESTA ==========');
      addLog(`URL Edge Function: tmwe-email-sync-master`);
      addLog(`Body:`);
      addLog(JSON.stringify(requestBody, null, 2));
      addLog('==========================================');
      addLog('');
      addLog('⏳ Invio richiesta...');
      
      const { data, error } = await supabase.functions.invoke('tmwe-email-sync-master', {
        body: requestBody
      });

      addLog('');
      addLog('========== RISPOSTA RICEVUTA ==========');
      if (error) {
        addLog(`❌ ERRORE:`);
        addLog(JSON.stringify(error, null, 2));
        throw error;
      }
      addLog(`✅ Success: true`);
      addLog(`Dati:`);
      addLog(JSON.stringify(data, null, 2));
      addLog('=======================================');
      addLog('');

      addLog(`✅ Download completato!`);
      addLog(`📥 Email scaricate: ${data.emails_downloaded}`);
      addLog(`📚 Totale in database: ${data.total_emails_in_db}`);

      if (onSyncComplete) {
        onSyncComplete();
      }

      await fetchFolderStats();

      toast({
        title: data.emails_downloaded > 0 ? "Nuove email scaricate!" : "Nessuna nuova email",
        description: data.emails_downloaded > 0 
          ? `${data.emails_downloaded} nuove email importate` 
          : `Nessuna nuova email trovata. Database: ${data.total_emails_in_db} email`,
        action: data.emails_downloaded > 0 ? (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.href = '/gestisci-import'}
          >
            Vai a Gestisci Import
          </Button>
        ) : undefined
      });

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
      
      {/* Statistiche Real-Time */}
      {progress && isRunning && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 animate-pulse text-primary" />
              Importazione in Corso - Dati in Tempo Reale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{progress.processed_messages}</div>
                <div className="text-sm text-muted-foreground">Email Processate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">#{progress.current_batch}</div>
                <div className="text-sm text-muted-foreground">Batch Corrente</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{progress.last_offset}</div>
                <div className="text-sm text-muted-foreground">Offset Attuale</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{progress.batch_size}</div>
                <div className="text-sm text-muted-foreground">Batch Size</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Email TMWE
            {isRunning && (
              <Badge variant="secondary" className="animate-pulse">
                <Zap className="h-3 w-3 mr-1" />
                In Corso
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Scarica email dalla cartella selezionata
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium">Cartella Selezionata</label>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowFolderDialog(true)}
                disabled={isRunning}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                {selectedFolder || 'Seleziona Cartella'}
              </Button>
            </div>
            <div>
              <label className="text-sm font-medium">Max Email</label>
              <input 
                type="number" 
                className="w-full p-2 border rounded bg-transparent"
                value={syncConfig.maxEmails}
                onChange={(e) => setSyncConfig(prev => ({ ...prev, maxEmails: parseInt(e.target.value) }))}
                disabled={isRunning}
                min="0"
                max="10000"
                placeholder="0 = tutte"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button onClick={fetchFolderStats} variant="outline" disabled={isRunning}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Aggiorna Stats
            </Button>
            
            {!isRunning ? (
              <Button onClick={downloadEmails} className="bg-gradient-to-r from-primary to-blue-600" disabled={!selectedFolder}>
                <Download className="h-4 w-4 mr-2" />
                Scarica Email
              </Button>
            ) : (
              <Button onClick={stopSync} variant="destructive">
                <Pause className="h-4 w-4 mr-2" />
                Ferma Download
              </Button>
            )}
          </div>

          {/* Progress Bar con dettagli reali */}
          {progress && (
            <div className="space-y-3 bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">Sincronizzazione in corso</span>
                <div className="flex gap-4 text-xs">
                  <span>Batch: {progress.current_batch}</span>
                  <span>Offset: {progress.last_offset}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso: {progress.processed_messages} email processate</span>
                  <span className="font-mono">{percentage}%</span>
                </div>
                <Progress value={percentage} className="h-3" />
                
                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <div>
                    <div>📦 Batch Size: {progress.batch_size}</div>
                    <div>📁 Cartella: {progress.folder_name}</div>
                  </div>
                  <div>
                    <div>⏰ Avviato: {new Date(progress.started_at).toLocaleTimeString()}</div>
                    <div>🔄 Ultimo aggiornamento: {new Date(progress.updated_at).toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>
              
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

      {/* Dialog Selezione Cartella */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleziona Cartella Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scegli la cartella da cui scaricare le email
            </p>
            
            {availableFolders.length > 0 ? (
              <div className="grid gap-2">
                {availableFolders.map((folder) => (
                  <Button
                    key={folder}
                    variant={selectedFolder === folder ? "default" : "outline"}
                    onClick={() => {
                      setSelectedFolder(folder);
                      setShowFolderDialog(false);
                      toast({
                        title: "Cartella selezionata",
                        description: `Hai selezionato: ${folder}`
                      });
                    }}
                    className="justify-start"
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    {folder}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Nessuna cartella disponibile. Clicca su "Aggiorna Stats" per caricare le cartelle.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};