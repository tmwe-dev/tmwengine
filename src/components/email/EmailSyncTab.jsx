import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
        className={`h-16 w-16 transition-colors duration-300 ${
          isReceiving ? 'text-green-500' : 'text-gray-400'
        }`}
        style={{
          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
        }}
      />
      {isReceiving && (
        <div className="absolute -top-2 -right-2">
          <div className="animate-ping absolute inline-flex h-6 w-6 rounded-full opacity-75"></div>
          <div className="relative inline-flex rounded-full h-6 w-6 items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
};

const EmailSyncTab = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStats, setSyncStats] = useState({
    emailSulServer: 0,
    emailGiaSincronizzate: 0,
    emailDaScaricare: 0
  });
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [currentEmail, setCurrentEmail] = useState(0);
  const [totalEmails, setTotalEmails] = useState(0);
  const [flyingPapers, setFlyingPapers] = useState([]);
  const [provider, setProvider] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadProvider();
    loadSyncStats();
    
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const loadProvider = async () => {
    try {
      const { data } = await supabase
        .from('email_provider')
        .select('*')
        .eq('tipo_provider', 'smtp_imap')
        .eq('attivo', true)
        .single();
      setProvider(data);
    } catch (error) {
      console.error('Error loading provider:', error);
    }
  };

  const loadSyncStats = async () => {
    try {
      const { data: emailData, count } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact' });
      
      setSyncStats(prev => ({
        ...prev,
        emailGiaSincronizzate: count || 0
      }));
    } catch (error) {
      console.error('Error loading sync stats:', error);
    }
  };

  const handlePreviewEmails = async () => {
    if (!provider) {
      toast({
        title: "Errore",
        description: "Configura prima il provider email",
        variant: "destructive",
      });
      return;
    }

    setIsPreviewLoading(true);
    try {
      const response = await fetch(`https://dlldkrzoxvjxpgkkttxu.supabase.co/functions/v1/email-imap-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGRrcnpveHZqeHBna2t0dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjA1ODQsImV4cCI6MjA3NDI5NjU4NH0.PrHXldlTqbNm63S90_Wo4bFcFeSBMVeSxjJpUxoKf5A`
        },
        body: JSON.stringify({
          provider_id: provider.id,
          preview_only: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSyncStats({
          emailSulServer: result.email_sul_server,
          emailGiaSincronizzate: result.email_gia_sincronizzate,
          emailDaScaricare: result.email_da_scaricare
        });
        toast({
          title: "Preview completato",
          description: `${result.email_da_scaricare} email da scaricare`,
        });
      } else {
        throw new Error('Errore preview');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile ottenere preview email",
        variant: "destructive",
      });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const startSyncAnimation = (totalCount) => {
    setTotalEmails(totalCount);
    setCurrentEmail(0);
    setSyncProgress(0);
    setSyncInProgress(true);
    setFlyingPapers([]);

    // Simula il progresso email per email
    intervalRef.current = setInterval(() => {
      setCurrentEmail(prev => {
        const next = prev + 1;
        const progress = (next / totalCount) * 100;
        setSyncProgress(progress);

        // Aggiungi animazione foglio volante
        if (next <= totalCount) {
          setFlyingPapers(prev => [...prev, {
            id: next,
            delay: 0,
            active: true
          }]);

          // Rimuovi il foglio dopo l'animazione
          setTimeout(() => {
            setFlyingPapers(prev => prev.filter(p => p.id !== next));
          }, 1200);
        }

        if (next >= totalCount) {
          clearInterval(intervalRef.current);
          setSyncInProgress(false);
          loadSyncStats(); // Ricarica le statistiche
        }

        return next;
      });
    }, 300); // 300ms per email
  };

  const handleStartSync = async () => {
    if (!provider) {
      toast({
        title: "Errore",
        description: "Configura prima il provider email",
        variant: "destructive",
      });
      return;
    }

    if (syncStats.emailDaScaricare === 0) {
      toast({
        title: "Info",
        description: "Nessuna email da sincronizzare",
      });
      return;
    }

    setIsLoading(true);
    
    // Avvia animazione
    startSyncAnimation(syncStats.emailDaScaricare);

    try {
      const response = await fetch(`https://dlldkrzoxvjxpgkkttxu.supabase.co/functions/v1/email-imap-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGRrcnpveHZqeHBna2t0dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjA1ODQsImV4cCI6MjA3NDI5NjU4NH0.PrHXldlTqbNm63S90_Wo4bFcFeSBMVeSxjJpUxoKf5A`
        },
        body: JSON.stringify({
          provider_id: provider.id,
          tipo_sync: 'manuale'
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Sincronizzazione completata",
          description: `${result.messaggi_nuovi} email sincronizzate`,
        });
      } else {
        throw new Error('Errore sincronizzazione');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la sincronizzazione",
        variant: "destructive",
      });
      // Ferma animazione in caso di errore
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setSyncInProgress(false);
    } finally {
      setIsLoading(false);
    }
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

      {/* Preview e statistiche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Statistiche Email
          </CardTitle>
          <CardDescription>
            Controlla quante email sono disponibili per la sincronizzazione
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">
                {syncStats.emailSulServer}
              </div>
              <div className="text-sm text-blue-600">Email sul server</div>
            </div>
            <div className="text-center p-4 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">
                {syncStats.emailGiaSincronizzate}
              </div>
              <div className="text-sm text-green-600">Già sincronizzate</div>
            </div>
            <div className="text-center p-4 rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">
                {syncStats.emailDaScaricare}
              </div>
              <div className="text-sm text-orange-600">Da scaricare</div>
            </div>
          </div>

          <Button 
            onClick={handlePreviewEmails}
            disabled={!provider || isPreviewLoading}
            variant="outline"
            className="w-full"
          >
            {isPreviewLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isPreviewLoading ? 'Controllo email...' : 'Controlla email sul server'}
          </Button>
        </CardContent>
      </Card>

      {/* Animazione sincronizzazione stile Windows 95 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className={`h-5 w-5 ${syncInProgress ? 'animate-spin' : ''}`} />
            Sincronizzazione Email
          </CardTitle>
          <CardDescription>
            Scarica le email dal server IMAP con animazioni retrò
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Area animazione Windows 95 */}
          <div className="relative border-2 border-gray-300 rounded-lg p-8 min-h-40 overflow-hidden">
            <div className="absolute inset-0"></div>
            
            {/* Fogli volanti */}
            <div className="relative z-10">
              <div className="flex justify-between items-center h-32">
                {/* Sorgente email */}
                <div className="text-center">
                  <Server className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Server IMAP</p>
                  {provider && (
                    <p className="text-xs text-gray-500">{provider.imap_server}</p>
                  )}
                </div>

                {/* Area di volo dei fogli */}
                <div className="flex-1 relative h-full mx-8">
                  {flyingPapers.map(paper => (
                    <FlyingPaper 
                      key={paper.id} 
                      isActive={paper.active} 
                      delay={paper.delay}
                    />
                  ))}
                </div>

                {/* Cartella destinazione */}
                <div className="text-center">
                  <DestinationFolder isReceiving={syncInProgress} />
                  <p className="text-xs text-gray-600 mt-2">Database</p>
                  <p className="text-xs text-gray-500">Supabase</p>
                </div>
              </div>
            </div>

            {/* Contatori stile Windows 95 */}
            {syncInProgress && (
              <div className="absolute bottom-4 left-4 border border-gray-400 shadow-lg rounded p-2">
                <div className="text-xs text-gray-700">
                  Email: {currentEmail} / {totalEmails}
                </div>
              </div>
            )}
          </div>

          {/* Barra di progresso */}
          {syncInProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso sincronizzazione</span>
                <span>{Math.round(syncProgress)}%</span>
              </div>
              <Progress value={syncProgress} className="h-3" />
              <p className="text-xs text-gray-500 text-center">
                Sincronizzazione email {currentEmail} di {totalEmails}...
              </p>
            </div>
          )}

          {/* Pulsanti di controllo */}
          <div className="flex gap-4">
            <Button 
              onClick={handleStartSync}
              disabled={!provider || isLoading || syncInProgress || syncStats.emailDaScaricare === 0}
              className="flex-1"
            >
              {syncInProgress ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {syncInProgress ? 'Sincronizzazione in corso...' : 'Avvia Sincronizzazione'}
            </Button>
          </div>

          {syncStats.emailDaScaricare === 0 && syncStats.emailSulServer > 0 && (
            <div className="text-center p-4 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-700 font-medium">Tutte le email sono sincronizzate!</p>
              <p className="text-sm text-green-600">
                {syncStats.emailGiaSincronizzate} email presenti nel database
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailSyncTab;