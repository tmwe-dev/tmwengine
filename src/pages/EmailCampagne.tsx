import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Play, RefreshCw, Clock } from "lucide-react";
import { CampaignScheduler } from "@/components/email-campagne/CampaignScheduler";
import { EmailQueueList } from "@/components/email-campagne/EmailQueueList";
import { CampaignStats } from "@/components/email-campagne/CampaignStats";
import { ContentWrapper } from "@/components/design-system/layouts/ContentWrapper";
import { GlassCard } from "@/components/design-system/cards/GlassCard";

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
  const [nextSchedulerRun, setNextSchedulerRun] = useState<number>(1800); // 30 minuti in secondi
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
        if (prev <= 1) return 1800; // Reset a 30 minuti
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
      
      setNextSchedulerRun(1800); // Reset countdown a 30 minuti
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
      <ContentWrapper maxWidth="full" spacing="md" className="min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Caricamento...</p>
          </div>
        </div>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper maxWidth="full" spacing="md" className="min-h-screen">
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            📧 Gestione Campagne Email
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Sistema automatico di invio email programmato
          </p>
        </div>

        {/* Scheduler Status */}
        <GlassCard 
          title="Stato Scheduler Automatico"
          gradient
          className="border-primary/20"
        >
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse flex-shrink-0"></div>
                  <span className="text-xs md:text-sm font-medium">Scheduler Attivo</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs md:text-sm">
                  <span className="text-muted-foreground">Prossima esecuzione tra:</span>
                  <span className="font-mono font-bold text-primary text-sm md:text-base">
                    {formatTime(nextSchedulerRun)}
                  </span>
                  <span className="text-xs text-muted-foreground">(ogni 30 min)</span>
                </div>
              </div>
              <Button 
                onClick={handleManualRun} 
                disabled={isManualRunning}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
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
            <p className="text-xs md:text-sm text-muted-foreground">
              Lo scheduler verifica automaticamente ogni 30 minuti se ci sono email da inviare, 
              rispettando data/ora programmata e intervallo configurato.
            </p>
          </div>
        </GlassCard>

        {/* Statistiche */}
        <CampaignStats stats={stats} />

        {/* Pianificazione e Lista in layout responsive */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <CampaignScheduler onRefresh={fetchEmailQueue} />
          <EmailQueueList emails={emailQueue} onRefresh={fetchEmailQueue} />
        </div>
      </div>
    </ContentWrapper>
  );
}
