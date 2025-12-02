import { useState } from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRoomAISettings } from '@/hooks/useRoomAISettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AIChatInvokerProps {
  roomId: string;
}

export const AIChatInvoker = ({ roomId }: AIChatInvokerProps) => {
  const [isInvoking, setIsInvoking] = useState(false);
  const { settings, isLoading: isLoadingSettings } = useRoomAISettings(roomId);
  const { toast } = useToast();

  const handleInvokeAI = async () => {
    if (!settings?.enableSuggestions) {
      toast({
        title: "AI non disponibile",
        description: "I suggerimenti AI non sono abilitati per questa stanza",
        variant: "destructive",
      });
      return;
    }

    setIsInvoking(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        throw new Error('Utente non autenticato');
      }

      const { data, error } = await supabase.functions.invoke('intranet-ai-processor', {
        body: {
          roomId,
          userId: userData.user.id,
          action: 'chat_assistant'
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "Errore AI",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      // Mostra notifica di successo con invocazioni rimanenti
      const remaining = data?.invocationsRemaining ?? 0;
      toast({
        title: "🤖 Albert sta rispondendo...",
        description: `Invocazioni rimanenti: ${remaining}`,
      });

    } catch (error: any) {
      console.error('Error invoking AI:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nell'invocazione di Albert",
        variant: "destructive",
      });
    } finally {
      setIsInvoking(false);
    }
  };

  const isDisabled = isLoadingSettings || !settings?.enableSuggestions || isInvoking;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleInvokeAI}
            disabled={isDisabled}
            className={`
              ${!settings?.enableSuggestions ? 'opacity-50 cursor-not-allowed' : ''}
              ${isInvoking ? 'animate-pulse' : ''}
            `}
          >
            {isInvoking ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Brain className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {!settings?.enableSuggestions
              ? 'Albert non è disponibile per questa stanza'
              : isInvoking
              ? 'Albert sta pensando...'
              : 'Chiedi aiuto ad Albert AI'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
