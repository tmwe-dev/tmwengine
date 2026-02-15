import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RadioParticipant } from '@/types/radio';

interface UseRadioSendMessageParams {
  currentConversationId: string | null;
  setConversationId: (id: string) => void;
  createQuickConversation: (names: Array<{ name: string; type: string }>) => Promise<string | null>;
  participants: RadioParticipant[];
  setIsSending: (v: boolean) => void;
  cachedPrompts: any;
}

export const useRadioSendMessage = ({
  currentConversationId,
  setConversationId,
  createQuickConversation,
  participants,
  setIsSending,
  cachedPrompts
}: UseRadioSendMessageParams) => {
  const { toast } = useToast();

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim()) return;
    setIsSending(true);

    try {
      // Create conversation if needed
      let convId = currentConversationId;
      if (!convId) {
        convId = await createQuickConversation(participants.map(p => ({ name: p.name, type: p.type })));
        if (!convId) { setIsSending(false); return; }
        setConversationId(convId);
      }

      // Save human message
      const { error: humanError } = await supabase
        .from('chat_laboratory_messages')
        .insert({
          conversation_id: convId,
          sender_type: 'human',
          sender_name: 'You',
          content: messageText
        });

      if (humanError) {
        toast({ title: 'Errore', description: 'Impossibile inviare il messaggio', variant: 'destructive' });
        setIsSending(false);
        return;
      }

      // Call orchestrator
      const activeParticipants = participants
        .filter(p => p.is_active)
        .map(p => ({ id: p.id, type: p.type, name: p.name, is_active: true, voiceId: p.voice_id }));

      const requestBody: any = { conversationId: convId, userMessage: messageText, participants: activeParticipants };
      if (cachedPrompts) requestBody.cachedPrompts = cachedPrompts;

      const orchestratorPromise = supabase.functions.invoke('radio-chat-orchestrator', { body: requestBody });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: AI non risponde')), 90000));

      try {
        const { data, error } = await Promise.race([orchestratorPromise, timeoutPromise]) as any;
        if (error) {
          toast({ title: 'Errore AI', description: error.message, variant: 'destructive' });
        }
      } catch (timeoutError: any) {
        toast({ title: 'Timeout', description: 'Le AI stanno impiegando troppo tempo', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Errore', description: error.message || 'Errore durante invio', variant: 'destructive' });
      setIsSending(false);
    }
  }, [currentConversationId, setConversationId, createQuickConversation, participants, setIsSending, cachedPrompts, toast]);

  return { sendMessage };
};
