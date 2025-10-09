import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, RefreshCw, Clock } from "lucide-react";
import { CampaignScheduler } from "@/components/email-campagne/CampaignScheduler";
import { EmailQueueList } from "@/components/email-campagne/EmailQueueList";
import { CampaignStats } from "@/components/email-campagne/CampaignStats";

interface EmailQueue {
  id: string;
  destinatario_email: string;
  destinatario_nome: string | null;
  destinatario_azienda: string | null;
  oggetto: string;
  corpo_testo: string;
  corpo_html: string | null;
  stato: string;
  data_ora_programmata: string;
  data_ora_invio: string | null;
  intervallo_minuti: number;
  campagna_nome: string;
  tentativi_invio: number;
  errore_dettaglio: string | null;
  created_at: string;
}

export default function EmailCampagne() {
  const [emailQueue, setEmailQueue] = useState<EmailQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextSchedulerRun, setNextSchedulerRun] = useState<number>(120); // 2 minuti in secondi
  const [isManualRunning, setIsManualRunning] = useState(false);

  const fetchEmailQueue = async () => {
    const { data, error } = await supabase
      .from('email_campagne_queue')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Errore nel caricamento della coda:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare la coda delle email",
        variant: "destructive"
      });
    } else {
      setEmailQueue(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmailQueue();

    // Realtime subscription per aggiornamenti automatici
    const channel = supabase
      .channel('email-queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_campagne_queue'
        },
        () => {
          fetchEmailQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Countdown per il prossimo scheduler run
  useEffect(() => {
    const interval = setInterval(() => {
      setNextSchedulerRun((prev) => {
        if (prev <= 1) return 120; // Reset a 2 minuti
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleManualRun = async () => {
    setIsManualRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('email-campagne-scheduler');
      
      if (error) throw error;
      
      toast({
        title: "Esecuzione Completata",
        description: `${data.totalSent} email inviate, ${data.totalErrors} errori`,
      });
      
      setNextSchedulerRun(120); // Reset countdown
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'esecuzione manuale",
        variant: "destructive"
      });
    } finally {
      setIsManualRunning(false);
    }
  };

  const stats = {
    totale: emailQueue.length,
    inviate: emailQueue.filter(e => e.stato === 'inviata').length,
    in_coda: emailQueue.filter(e => e.stato === 'programmata' || e.stato === 'in_coda').length,
    errori: emailQueue.filter(e => e.stato === 'errore').length,
    in_invio: emailQueue.filter(e => e.stato === 'in_invio').length,
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Caricamento...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">📧 Gestione Campagne Email</h1>
          <p className="text-muted-foreground mt-1">
            Sistema automatico di invio email programmato
          </p>
        </div>
      </div>

      {/* Scheduler Status */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Stato Scheduler Automatico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm font-medium">Scheduler Attivo (pg_cron)</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Prossima esecuzione tra: <span className="font-mono font-bold text-primary">{formatTime(nextSchedulerRun)}</span>
              </div>
            </div>
            <Button 
              onClick={handleManualRun} 
              disabled={isManualRunning}
              variant="outline"
              size="sm"
            >
              {isManualRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Esecuzione...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Esegui Subito
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Lo scheduler verifica automaticamente ogni 2 minuti se ci sono email da inviare, 
            rispettando data/ora programmata e intervallo configurato.
          </p>
        </CardContent>
      </Card>

      {/* Statistiche */}
      <CampaignStats stats={stats} />

      {/* Pianificazione (per nuove campagne) */}
      <CampaignScheduler onRefresh={fetchEmailQueue} />

      {/* Lista Email */}
      <EmailQueueList emails={emailQueue} onRefresh={fetchEmailQueue} />
    </div>
  );
}
