import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useConversation } from '@11labs/react';

export const VoiceAgentWidget = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<{
    agentId: string;
    enabled: boolean;
  } | null>(null);

  // Carica configurazione
  useEffect(() => {
    const savedConfig = localStorage.getItem('voice_agent_config');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Error loading config:', error);
      }
    }
  }, []);

  // Inizializza conversazione con ElevenLabs
  const conversation = useConversation({
    onConnect: () => {
      console.log('Conversazione connessa');
      toast({
        title: 'Connesso',
        description: 'Agente vocale connesso.',
      });
    },
    onDisconnect: () => {
      console.log('Conversazione disconnessa');
      toast({
        title: 'Disconnesso',
        description: 'Agente vocale disconnesso.',
      });
    },
    onMessage: (message: any) => {
      console.log('Messaggio ricevuto:', message);
    },
    onError: (error: any) => {
      console.error('Errore conversazione:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante la conversazione.',
        variant: 'destructive',
      });
    },
    clientTools: {
      analyzeEmails: async (parameters: any) => {
        const { data } = await supabase.functions.invoke('ai-email-actions', {
          body: { action: 'analyze', query: parameters.query }
        });
        return data;
      },
      executeEmailAction: async (parameters: any) => {
        const { data } = await supabase.functions.invoke('ai-email-actions', {
          body: {
            action: parameters.action,
            emailId: parameters.emailId,
            folderId: parameters.folderId
          }
        });
        return data;
      },
      sendTemplatedEmail: async (parameters: any) => {
        const { data } = await supabase.functions.invoke('ai-send-templated-email', {
          body: parameters
        });
        return data;
      },
      createActivity: async (parameters: any) => {
        const { data } = await supabase.functions.invoke('ai-crm-manager', {
          body: { action: 'create_activity', ...parameters }
        });
        return data;
      },
      updateActivity: async (parameters: any) => {
        const { data } = await supabase.functions.invoke('ai-crm-manager', {
          body: { action: 'update_activity', ...parameters }
        });
        return data;
      }
    }
  });

  const handleStartConversation = async () => {
    if (!config?.agentId) {
      toast({
        title: 'Configurazione mancante',
        description: 'Configura l\'Agent ID nelle impostazioni.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Richiedi permesso microfono
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Ottieni signed URL dalla edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-conversation-token', {
        body: { agentId: config.agentId }
      });

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Nessun signed URL ricevuto');

      console.log('Signed URL ottenuto, avvio conversazione...');
      
      // Avvia la sessione con il signed URL
      await conversation.startSession({ signedUrl: data.signedUrl });
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Impossibile avviare la conversazione',
        variant: 'destructive',
      });
    }
  };

  const handleEndConversation = async () => {
    await conversation.endSession();
  };

  if (!config?.enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col items-end gap-3">
        {conversation.status === 'connected' && (
          <div className="bg-card border border-border rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-3 h-3 rounded-full',
                conversation.isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-muted'
              )} />
              <span className="text-sm text-muted-foreground">
                {conversation.isSpeaking ? 'In ascolto...' : 'Pronto'}
              </span>
            </div>
          </div>
        )}

        {conversation.status !== 'connected' ? (
          <Button
            onClick={handleStartConversation}
            size="lg"
            className="rounded-full h-16 w-16 shadow-lg"
          >
            <Phone className="h-6 w-6" />
          </Button>
        ) : (
          <Button
            onClick={handleEndConversation}
            size="lg"
            variant="destructive"
            className="rounded-full h-16 w-16 shadow-lg"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
};
