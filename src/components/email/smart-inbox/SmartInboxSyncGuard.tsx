import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { syncEmailsToDatabase } from '@/lib/email-sync';
import { toast } from 'sonner';

interface SmartInboxSyncGuardProps {
  userEmail: string;
  selectedFolder: string;
  unreadOnly: boolean;
  children: React.ReactNode;
}

export const SmartInboxSyncGuard = ({ userEmail, selectedFolder, unreadOnly, children }: SmartInboxSyncGuardProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  const { data: syncStatus, isLoading, refetch } = useQuery({
    queryKey: ['smart-inbox-sync-status', userEmail, selectedFolder, unreadOnly],
    queryFn: async () => {
      // Conta email nel DB locale
      let query = supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', userEmail)
        .eq('cartella', selectedFolder);

      if (unreadOnly) {
        query = query.eq('stato', 'nuovo');
      }

      const { count: dbCount, error: dbError } = await query;

      if (dbError) {
        console.error('Error counting local emails:', dbError);
        return { dbCount: 0, serverCount: 0, isSynced: false, missing: 0 };
      }

      // Stima email sul server (potremmo fare una chiamata API qui se necessario)
      // Per ora assumiamo che se dbCount > 0, procediamo
      const estimatedServerCount = dbCount || 0;

      return {
        dbCount: dbCount || 0,
        serverCount: estimatedServerCount,
        isSynced: dbCount && dbCount > 0, // Se abbiamo email locali, consideriamo sincronizzato
        missing: 0
      };
    },
    enabled: !!userEmail,
    refetchInterval: false
  });

  const handleStartSync = async () => {
    setIsSyncing(true);
    setSyncProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      await syncEmailsToDatabase(selectedFolder, 'auto', undefined, unreadOnly);

      clearInterval(progressInterval);
      setSyncProgress(100);

      toast.success('Sincronizzazione completata!');
      
      setTimeout(() => {
        refetch();
        setIsSyncing(false);
        setSyncProgress(0);
      }, 1000);

    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(`Errore sincronizzazione: ${error.message}`);
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-white/60" />
        <span className="ml-2 text-white/60">Verifica sincronizzazione...</span>
      </div>
    );
  }

  if (!syncStatus?.isSynced && !isSyncing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6">
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <AlertDescription className="text-yellow-200">
            <div className="space-y-3">
              <p className="font-semibold">Sincronizzazione Richiesta</p>
              <p className="text-sm text-yellow-200/80">
                Per utilizzare l'Inbox Intelligente, è necessario prima sincronizzare le email dal server
                al database locale. Questo garantisce performance ottimali e coerenza dei dati.
              </p>
              {syncStatus && (
                <div className="text-sm space-y-1">
                  <p>📊 Email in DB locale: <span className="font-mono">{syncStatus.dbCount}</span></p>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handleStartSync}
          size="lg"
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          <RefreshCw className="h-5 w-5 mr-2" />
          Sincronizza Ora
        </Button>

        <p className="text-white/40 text-sm text-center max-w-md">
          La sincronizzazione scaricherà le email dalla cartella <strong>{selectedFolder}</strong> 
          {unreadOnly && ' (solo non lette)'} nel database locale.
          Questo processo può richiedere alcuni minuti in base al numero di email.
        </p>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6">
        <RefreshCw className="h-12 w-12 animate-spin text-blue-500" />
        <div className="w-full max-w-md space-y-3">
          <p className="text-center text-white/80 font-medium">
            Sincronizzazione in corso...
          </p>
          <Progress value={syncProgress} className="h-2" />
          <p className="text-center text-white/60 text-sm">
            {syncProgress}% completato
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-md">
        <CheckCircle2 className="h-4 w-4 text-green-400" />
        <span className="text-sm text-green-200">
          Database sincronizzato ({syncStatus?.dbCount} email locali)
        </span>
      </div>
      {children}
    </div>
  );
};
