import { useState, useEffect } from 'react';
import { useConversation } from '@11labs/react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export const VoiceAgentWidget = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<{
    elevenLabsApiKey: string;
    agentId: string;
    enabled: boolean;
  } | null>(null);

  // Carica configurazione da localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('voice_agent_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
      } catch (error) {
        console.error('Error loading voice agent config:', error);
      }
    }
  }, []);

  // Client Tools mappati alle edge functions
  const conversation = useConversation({
    clientTools: {
      // Analizza email
      analyzeEmails: async (parameters: { query: string }) => {
        console.log('analyzeEmails called with:', parameters);
        
        try {
          const { data, error } = await supabase.functions.invoke('ai-email-actions', {
            body: {
              action: 'analyze',
              query: parameters.query
            }
          });

          if (error) throw error;
          
          return JSON.stringify({
            success: true,
            results: data
          });
        } catch (error) {
          console.error('analyzeEmails error:', error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Errore nell\'analisi delle email'
          });
        }
      },

      // Esegui azione su email
      executeEmailAction: async (parameters: {
        emailId: string;
        action: 'mark_read' | 'delete' | 'move_folder';
        folderId?: string;
      }) => {
        console.log('executeEmailAction called with:', parameters);
        
        try {
          const { data, error } = await supabase.functions.invoke('ai-email-actions', {
            body: {
              action: parameters.action,
              emailId: parameters.emailId,
              folderId: parameters.folderId
            }
          });

          if (error) throw error;
          
          return JSON.stringify({
            success: true,
            message: `Azione ${parameters.action} completata con successo`
          });
        } catch (error) {
          console.error('executeEmailAction error:', error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Errore nell\'esecuzione dell\'azione'
          });
        }
      },

      // Invia email con template
      sendTemplatedEmail: async (parameters: {
        recipientEmail: string;
        templateId: string;
        subject: string;
        variables: Record<string, string>;
      }) => {
        console.log('sendTemplatedEmail called with:', parameters);
        
        try {
          const { data, error } = await supabase.functions.invoke('ai-send-templated-email', {
            body: parameters
          });

          if (error) throw error;
          
          return JSON.stringify({
            success: true,
            message: 'Email inviata con successo'
          });
        } catch (error) {
          console.error('sendTemplatedEmail error:', error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Errore nell\'invio dell\'email'
          });
        }
      },

      // Crea attività CRM
      createActivity: async (parameters: {
        contactId: string;
        type: string;
        description: string;
        dueDate?: string;
        priority: string;
      }) => {
        console.log('createActivity called with:', parameters);
        
        try {
          const { data, error } = await supabase.functions.invoke('ai-crm-manager', {
            body: {
              action: 'create_activity',
              ...parameters
            }
          });

          if (error) throw error;
          
          return JSON.stringify({
            success: true,
            activityId: data.id,
            message: 'Attività creata con successo'
          });
        } catch (error) {
          console.error('createActivity error:', error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Errore nella creazione dell\'attività'
          });
        }
      },

      // Aggiorna attività
      updateActivity: async (parameters: {
        activityId: string;
        status?: string;
        description?: string;
        dueDate?: string;
      }) => {
        console.log('updateActivity called with:', parameters);
        
        try {
          const { data, error } = await supabase.functions.invoke('ai-crm-manager', {
            body: {
              action: 'update_activity',
              ...parameters
            }
          });

          if (error) throw error;
          
          return JSON.stringify({
            success: true,
            message: 'Attività aggiornata con successo'
          });
        } catch (error) {
          console.error('updateActivity error:', error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Errore nell\'aggiornamento dell\'attività'
          });
        }
      }
    },

    onConnect: () => {
      console.log('Voice agent connected');
      toast({
        title: 'Connesso',
        description: 'Agente vocale connesso. Puoi iniziare a parlare.',
      });
    },

    onDisconnect: () => {
      console.log('Voice agent disconnected');
      toast({
        title: 'Disconnesso',
        description: 'Agente vocale disconnesso.',
      });
    },

    onError: (error) => {
      console.error('Voice agent error:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore con l\'agente vocale.',
        variant: 'destructive',
      });
    },

    onMessage: (message) => {
      console.log('Voice agent message:', message);
    }
  });

  const handleStartConversation = async () => {
    if (!config?.elevenLabsApiKey || !config?.agentId) {
      toast({
        title: 'Configurazione mancante',
        description: 'Configura l\'API Key e l\'Agent ID nelle impostazioni.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Richiedi permesso microfono
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Genera signed URL tramite API ElevenLabs
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${config.agentId}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': config.elevenLabsApiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Impossibile ottenere URL firmato da ElevenLabs');
      }

      const { signed_url } = await response.json();
      
      await conversation.startSession({ url: signed_url });
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

  // Non mostrare se non configurato o disabilitato
  if (!config?.enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col items-end gap-3">
        {/* Indicatore stato */}
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

        {/* Pulsante principale */}
        {conversation.status === 'disconnected' ? (
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
