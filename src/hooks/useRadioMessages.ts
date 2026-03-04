import { useState, useEffect, useCallback, useRef } from 'react';
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
  // 🔴 FASE 5: Anti-race guard — track active request
  const activeRequestIdRef = useRef<string | null>(null);

  const loadMessages = useCallback(async (convId: string) => {
    const requestId = `${convId}-${Date.now()}`;
    activeRequestIdRef.current = requestId;

    try {
      const { data, error } = await supabase
        .from('chat_laboratory_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      // 🔴 Guard: only apply if this is still the active request
      if (activeRequestIdRef.current !== requestId) {
        console.log(`⚠️ [useRadioMessages] Stale response discarded for ${convId.substring(0, 8)}`);
        return;
      }

      if (error) {
        console.error('❌ Errore caricamento messaggi:', error);
        return;
      }
      setMessages((data || []).map(castMessage));
    } catch (err) {
      console.error('❌ [useRadioMessages] Fetch error:', err);
    }
  }, []);

  // 🔴 FASE 4: Clear messages immediately when conversationId is null
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setIsSending(false);
      activeRequestIdRef.current = null;
      return;
    }

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

    // Catchup reload after 2s to handle messages inserted before subscription
    const catchupTimer = setTimeout(() => {
      loadMessages(conversationId);
    }, 2000);

    return () => {
      clearTimeout(catchupTimer);
      supabase.removeChannel(channel);
    };
  }, [conversationId, loadMessages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    activeRequestIdRef.current = null;
  }, []);

  return { messages, setMessages, loadMessages, isSending, setIsSending, clearMessages };
};
