import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RadioMessage } from '@/types/radio';

const castMessage = (msg: any): RadioMessage => ({
  id: msg.id,
  conversation_id: msg.conversation_id,
  sender_type: msg.sender_type as RadioMessage['sender_type'],
  sender_name: msg.sender_name,
  content: msg.content,
  audio_url: msg.audio_url,
  token_input: msg.token_input,
  token_output: msg.token_output,
  tempo_risposta_ms: msg.tempo_risposta_ms,
  attachments: msg.attachments,
  images: (Array.isArray(msg.images) ? msg.images : []) as string[],
  generated_images: (Array.isArray(msg.generated_images) ? msg.generated_images : []) as string[],
  is_visible_to_ai: msg.is_visible_to_ai ?? true,
  created_at: msg.created_at
});

export const useRadioMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<RadioMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const loadMessages = useCallback(async (convId: string) => {
    const { data, error } = await supabase
      .from('chat_laboratory_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Errore caricamento messaggi:', error);
      return;
    }
    setMessages((data || []).map(castMessage));
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    loadMessages(conversationId);

    const channel = supabase
      .channel(`radio-chat-${conversationId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_laboratory_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const typedMessage = castMessage(payload.new);
          setMessages(prev => {
            if (prev.some(m => m.id === typedMessage.id)) return prev;
            return [...prev, typedMessage];
          });
          // Unlock input after AI message
          if (payload.new.sender_type !== 'human') {
            setIsSending(false);
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_laboratory_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const updatedMsg = payload.new;
          setMessages(prev => {
            const existing = prev.find(m => m.id === updatedMsg.id);
            if (
              existing?.audio_url === updatedMsg.audio_url &&
              existing?.token_input === updatedMsg.token_input &&
              existing?.token_output === updatedMsg.token_output
            ) return prev;

            return prev.map(msg =>
              msg.id === updatedMsg.id
                ? { ...msg, audio_url: updatedMsg.audio_url, token_input: updatedMsg.token_input, token_output: updatedMsg.token_output, tempo_risposta_ms: updatedMsg.tempo_risposta_ms }
                : msg
            );
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, loadMessages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, setMessages, loadMessages, isSending, setIsSending, clearMessages };
};
