import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EconomyModeToggleCompactProps {
  conversationId: string | null;
}

export const EconomyModeToggleCompact = ({ conversationId }: EconomyModeToggleCompactProps) => {
  const [economyMode, setEconomyMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (conversationId) {
      loadSettings();
    }
  }, [conversationId]);

  const loadSettings = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('chat_laboratory_conversations')
        .select('economy_mode')
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      if (data) {
        setEconomyMode(data.economy_mode ?? true);
      }
    } catch (error) {
      console.error('Error loading economy settings:', error);
    }
  };

  const updateSetting = async (checked: boolean) => {
    if (!conversationId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .update({ economy_mode: checked })
        .eq('id', conversationId);

      if (error) throw error;

      setEconomyMode(checked);
      toast.success(
        checked 
          ? 'Economy Mode attivato - AI leggerà riassunti compressi' 
          : 'Economy Mode disattivato - AI leggerà tutti i messaggi'
      );
    } catch (error) {
      console.error('Error updating economy mode:', error);
      toast.error('Errore durante l\'aggiornamento delle impostazioni');
    } finally {
      setIsLoading(false);
    }
  };

  if (!conversationId) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/30 border border-border/40">
            <DollarSign className="h-4 w-4 text-green-500" />
            <Switch
              checked={economyMode}
              onCheckedChange={updateSetting}
              disabled={isLoading}
              className="scale-90"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs font-medium">
            Economy Mode: {economyMode ? 'Attivo ✓' : 'Disattivo'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {economyMode 
              ? 'AI legge riassunti compressi (risparmio token)' 
              : 'AI legge tutti i messaggi completi'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
