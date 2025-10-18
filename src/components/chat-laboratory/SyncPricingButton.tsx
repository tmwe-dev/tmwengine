import { Button } from '@/components/ui/button';
import { RefreshCw, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { clearPricingCache } from '@/lib/pricing-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const SyncPricingButton = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-ai-pricing');
      
      if (error) throw error;
      
      // Clear cache pricing
      clearPricingCache();
      
      toast({
        title: "✅ Prezzi Sincronizzati",
        description: `Tasso USD/EUR: ${data.usdToEurRate.toFixed(4)} - ${data.message}`,
      });
      
      // Ricarica pagina per aggiornare componenti
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (error: any) {
      console.error('Errore sincronizzazione:', error);
      toast({
        title: "❌ Errore Sincronizzazione",
        description: error.message || "Impossibile aggiornare i prezzi",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <DollarSign className="h-4 w-4" />
            <span className="hidden md:inline">
              {isSyncing ? 'Sincronizzando...' : 'Aggiorna Prezzi'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Sincronizza prezzi AI e tasso cambio USD/EUR</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
