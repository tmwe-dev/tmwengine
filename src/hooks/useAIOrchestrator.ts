/**
 * useAIOrchestrator - Hook centralizzato per comunicazione con chat-laboratory-orchestrator
 * Gestisce invio messaggi, streaming, salvataggio DB e conversazione cross-page
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useGlobalAIAgent } from '@/hooks/useGlobalAIAgent';

interface OrchestratorMessage {
  conversation_id: string;
  user_message: string;
  audio_url?: string;
  page_route?: string;
}

export const useAIOrchestrator = (conversationId: string | null) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const { toast } = useToast();
  const { getAIPayload } = useGlobalAIAgent();

  const sendMessage = useCallback(async (
    text: string, 
    audioUrl?: string,
    pageRoute?: string
  ) => {
    if (!conversationId || !text.trim()) {
      console.warn('⚠️ [useAIOrchestrator] Missing conversationId or empty message');
      return;
    }

    setIsProcessing(true);
    setLastResponse(null);

    try {
      // 1. Salva messaggio utente in DB
      const { data: userMessage, error: userMessageError } = await supabase
        .from('chat_laboratory_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'human',
          sender_name: 'User',
          content: text,
          audio_url: audioUrl || null,
          is_visible_to_ai: true,
        })
        .select()
        .single();

      if (userMessageError) throw userMessageError;

      console.log('💾 [useAIOrchestrator] User message saved:', userMessage.id);

      // 2. Ottieni payload AI (agent + config)
      const aiPayload = await getAIPayload(pageRoute);

      // 3. Chiama orchestrator
      const { data: orchestratorData, error: orchestratorError } = await supabase.functions.invoke(
        'chat-laboratory-orchestrator',
        {
          body: {
            conversation_id: conversationId,
            user_message: text,
            audio_url: audioUrl,
            page_route: pageRoute,
            ...aiPayload, // Include selected_agent, ai_model, config, composed_prompts
          } as OrchestratorMessage,
        }
      );

      if (orchestratorError) throw orchestratorError;

      console.log('✅ [useAIOrchestrator] Response received:', orchestratorData);

      // 4. Estrai risposta AI
      const aiResponse = orchestratorData?.responses?.[0]?.content || 
                        orchestratorData?.response || 
                        'Nessuna risposta';

      setLastResponse(aiResponse);

      toast({
        title: '✅ Risposta ricevuta',
        description: 'L\'AI ha elaborato il tuo messaggio',
      });

    } catch (error: any) {
      console.error('❌ [useAIOrchestrator] Error:', error);
      
      toast({
        title: '❌ Errore orchestrator',
        description: error.message || 'Errore sconosciuto',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [conversationId, getAIPayload, toast]);

  return {
    sendMessage,
    isProcessing,
    lastResponse,
  };
};
