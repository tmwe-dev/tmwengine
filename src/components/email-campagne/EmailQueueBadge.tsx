import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Mail, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EmailQueueStats {
  in_coda: number;
  in_invio: number;
  errori: number;
  totale: number;
}

export function EmailQueueBadge() {
  const [stats, setStats] = useState<EmailQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from('email_campagne_queue')
      .select('stato')
      .in('stato', ['programmata', 'in_coda', 'in_invio', 'errore']);

    if (error) {
      console.error('Errore caricamento stats email:', error);
      setLoading(false);
      return;
    }

    const stats: EmailQueueStats = {
      in_coda: data.filter(e => e.stato === 'programmata' || e.stato === 'in_coda').length,
      in_invio: data.filter(e => e.stato === 'in_invio').length,
      errori: data.filter(e => e.stato === 'errore').length,
      totale: data.length
    };

    setStats(stats);
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();

    // Realtime subscription
    const channel = supabase
      .channel('email-queue-badge-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_campagne_queue'
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading || !stats || stats.totale === 0) {
    return null;
  }

  const hasActivity = stats.in_coda > 0 || stats.in_invio > 0 || stats.errori > 0;

  if (!hasActivity) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="relative gap-2 h-8 px-2"
        >
          <Mail className="h-4 w-4" />
          <Badge 
            variant={stats.errori > 0 ? "destructive" : "default"}
            className="h-5 min-w-5 px-1"
          >
            {stats.totale}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">📧 Campagne Email Attive</h4>
            <Badge variant="outline">{stats.totale} email</Badge>
          </div>
          
          <div className="space-y-2">
            {stats.in_coda > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-yellow-500" />
                  <span>In Coda</span>
                </div>
                <Badge variant="secondary">{stats.in_coda}</Badge>
              </div>
            )}
            
            {stats.in_invio > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                  <span>In Invio</span>
                </div>
                <Badge variant="secondary">{stats.in_invio}</Badge>
              </div>
            )}
            
            {stats.errori > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span>Errori</span>
                </div>
                <Badge variant="destructive">{stats.errori}</Badge>
              </div>
            )}
          </div>

          <div className="pt-2 border-t">
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => navigate('/email-campagne')}
            >
              Gestisci Campagne →
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
