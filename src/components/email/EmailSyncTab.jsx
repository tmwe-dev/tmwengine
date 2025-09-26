import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import coinEuro from '@/assets/coin-euro.png';
import { 
  RefreshCw, 
  Download, 
  FileText, 
  FolderOpen, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Pause,
  Server,
  Mail
} from 'lucide-react';

// Componente animazione foglio volante stile Windows 95
const FlyingPaper = ({ isActive, delay = 0 }) => {
  return (
    <div 
      className={`absolute transition-all duration-1000 ease-in-out ${
        isActive 
          ? 'transform translate-x-32 translate-y-8 opacity-0 rotate-12' 
          : 'transform translate-x-0 translate-y-0 opacity-100 rotate-0'
      }`}
      style={{ 
        transitionDelay: `${delay}ms`,
        zIndex: 10 - delay / 100 
      }}
    >
      <FileText 
        className="h-8 w-8 text-blue-500 drop-shadow-lg" 
        style={{
          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
        }}
      />
    </div>
  );
};

// Componente cartella di destinazione
const DestinationFolder = ({ isReceiving }) => {
  return (
    <div className={`relative transition-all duration-300 ${isReceiving ? 'scale-110' : 'scale-100'}`}>
      <FolderOpen 
        className={`h-12 w-12 ${isReceiving ? 'text-green-500' : 'text-gray-400'}`}
        style={{
          filter: isReceiving ? 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.5))' : 'none'
        }}
      />
      {isReceiving && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      )}
    </div>
  );
};

const EmailSyncTab = () => {
  const { toast } = useToast();
  const [provider, setProvider] = useState(null);
  const [syncStats, setSyncStats] = useState({
    emailSulServer: 0,
    emailGiaSincronizzate: 0,
    emailDaScaricare: 0
  });
  const [currentBatch, setCurrentBatch] = useState(1);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);
  const [flyingPapers, setFlyingPapers] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadProvider();
    loadSyncStats();
  }, []);

  const loadProvider = async () => {
    try {
      const { data, error } = await supabase
        .from('email_provider')
        .select(`*, email_provider_credenziali (*)`)
        .eq('tipo_provider', 'smtp_imap')
        .eq('attivo', true)
        .maybeSingle();

      if (error) throw error;
      setProvider(data);
    } catch (error) {
      console.error('Error loading provider:', error);
    }
  };

  const loadSyncStats = async () => {
    if (!provider?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('email_messages')
        .select('id', { count: 'exact' })
        .eq('provider_id', provider.id);

      if (error) throw error;
      
      setSyncStats(prev => ({
        ...prev,
        emailGiaSincronizzate: data.length || 0
      }));
    } catch (error) {
      console.error('Error loading sync stats:', error);
    }
  };

  const loadServerPreview = async () => {
    if (!provider?.id) {
      toast({
        title: "Errore",
        description: "Configurazione provider non trovata",
        variant: "destructive",
      });
      return;
    }

    setIsPreviewLoading(true);
    setSyncStatus('Verifica configurazione server...');

    try {
      const response = await supabase.functions.invoke('email-imap-sync', {
        body: {
          provider_id: provider.id,
          tipo_sync: 'manuale',
          preview_only: true
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      setSyncStats({
        emailSulServer: result.email_sul_server,
        emailGiaSincronizzate: result.email_gia_sincronizzate || 0,
        emailDaScaricare: result.email_da_scaricare
      });

      setSyncStatus(`Pronto per sincronizzazione. ${result.email_gia_sincronizzate} email già presenti nel database.`);

      toast({
        title: "Verifica completata",
        description: `Server configurato correttamente. ${result.email_gia_sincronizzate} email già sincronizzate.`,
      });
    } catch (error) {
      console.error('Error loading server preview:', error);
      setSyncStatus(`Errore: ${error.message}`);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const startDirectSync = async (startFrom = 1) => {
    if (!provider?.id) {
      toast({
        title: "Errore", 
        description: "Configurazione provider non trovata",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    setSyncInProgress(true);
    setSyncStatus(`Avvio sincronizzazione da email ${startFrom}...`);
    
    try {
      const response = await supabase.functions.invoke('email-imap-sync', {
        body: {
          provider_id: provider.id,
          tipo_sync: 'manuale',
          preview_only: false,
          batch_size: 500,
          start_from: startFrom
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      // Aggiorna statistiche
      const newProcessed = totalProcessed + (result.messaggi_nuovi || 0);
      setTotalProcessed(newProcessed);
      setCurrentBatch(Math.ceil(startFrom / 500));
      
      // Mostra animazione per le email processate
      if (result.messaggi_nuovi > 0) {
        for (let i = 0; i < Math.min(result.messaggi_nuovi, 10); i++) {
          setTimeout(() => {
            const id = Date.now() + i;
            setFlyingPapers(prev => [...prev, {
              id,
              delay: i * 100,
              active: true
            }]);

            setTimeout(() => {
              setFlyingPapers(prev => prev.filter(p => p.id !== id));
            }, 1200);
          }, i * 200);
        }
      }

      setSyncStatus(`Batch ${currentBatch} completato: ${result.messaggi_nuovi} nuove email, ${result.messaggi_aggiornati} aggiornate`);

      // Se ci sono altri batch da processare
      if (result.batch_info?.has_more_batches) {
        toast({
          title: `Batch ${currentBatch} completato`,
          description: `${result.messaggi_nuovi} email sincronizzate. Continuare con il prossimo batch?`,
          action: (
            <Button 
              size="sm" 
              onClick={() => startDirectSync(result.batch_info.next_batch_start)}
            >
              Continua
            </Button>
          ),
        });
      } else {
        // Sincronizzazione completata
        setSyncStatus(`Sincronizzazione completata! ${newProcessed} email totali processate.`);
        toast({
          title: "Sincronizzazione completata",
          description: `${newProcessed} email totali processate`,
        });
        loadSyncStats(); // Ricarica le statistiche finali
      }

    } catch (error) {
      console.error('Error during sync:', error);
      setSyncStatus(`Errore: ${error.message}`);
      toast({
        title: "Errore sincronizzazione",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
      setSyncInProgress(false);
    }
  };

  const handlePreviewEmails = async () => {
    await loadServerPreview();
  };

  const handleStartDirectSync = () => {
    setTotalProcessed(0);
    setCurrentBatch(1);
    startDirectSync(1);
  };

  return (
    <div className="space-y-6">
      {/* Stato configurazione */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Stato Configurazione
          </CardTitle>
          <CardDescription>
            Verifica la configurazione del provider email
          </CardDescription>
        </CardHeader>
        <CardContent>
          {provider ? (
            <div className="flex items-center gap-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium">Configurazione attiva</p>
                <p className="text-sm text-muted-foreground">
                  {provider.email_username} → {provider.imap_server}:{provider.imap_porta}
                </p>
              </div>
              <Badge variant="outline" className="text-green-700">
                Connesso
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <AlertCircle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-medium">Nessuna configurazione</p>
                <p className="text-sm text-muted-foreground">
                  Configura il provider email nel tab "Email Provider"
                </p>
              </div>
              <Badge variant="outline" className="text-orange-700">
                Non configurato
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistiche veloci */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Statistiche Email
          </CardTitle>
          <CardDescription>
            Email già sincronizzate nel database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{syncStats.emailGiaSincronizzate}</p>
                <p className="text-sm text-muted-foreground">Email sincronizzate</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Download className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalProcessed}</p>
                <p className="text-sm text-muted-foreground">Elaborate questa sessione</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button 
              onClick={handlePreviewEmails}
              disabled={!provider || isPreviewLoading}
              variant="outline"
            >
              {isPreviewLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Verifica Server
            </Button>
            
            <Button 
              onClick={handleStartDirectSync}
              disabled={!provider || isSyncing}
              className="bg-primary hover:bg-primary/90"
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Inizia Importazione
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stato sincronizzazione */}
      {(syncStatus || isSyncing) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Stato Sincronizzazione
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm">{syncStatus}</p>
              
              {isSyncing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Batch corrente: {currentBatch}</span>
                    <span>Email elaborate: {totalProcessed}</span>
                  </div>
                  <Progress value={33} className="h-2" />
                </div>
              )}

              {/* Animazione trasferimento email */}
              <div className="relative h-16 flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <Server className="h-8 w-8 text-blue-500" />
                  <span className="text-sm font-medium">Server IMAP</span>
                </div>
                
                {/* Area animazione fogli volanti */}
                <div className="relative flex-1 mx-8">
                  {flyingPapers.map((paper) => (
                    <FlyingPaper 
                      key={paper.id} 
                      isActive={paper.active} 
                      delay={paper.delay} 
                    />
                  ))}
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Database</span>
                  <DestinationFolder isReceiving={syncInProgress} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailSyncTab;