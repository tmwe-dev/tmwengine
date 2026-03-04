import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RadioConversation } from '@/types/radio';

const DEV_ANONYMOUS_ID = 'dev-anonymous';

export const useRadioConversations = (userId: string | undefined) => {
  const [conversations, setConversations] = useState<RadioConversation[]>([]);
  // 🔴 FASE 4: Default null — no auto-resume from localStorage
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const setConversationId = useCallback((id: string | null) => {
    setCurrentConversationId(id);
    if (id) localStorage.setItem('radio-current-conversation-id', id);
    else localStorage.removeItem('radio-current-conversation-id');
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      let query = supabase
        .from('chat_laboratory_conversations')
        .select('id, titolo, created_at, updated_at, riassunto_contesto, active_participants')
        .order('updated_at', { ascending: false });

      if (userId && userId !== DEV_ANONYMOUS_ID) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const convIds = (data || []).map(c => c.id);

      let allMessages: Array<{ conversation_id: string; token_input: number | null; token_output: number | null }> = [];
      if (convIds.length > 0) {
        const { data: msgData } = await supabase
          .from('chat_laboratory_messages')
          .select('conversation_id, token_input, token_output')
          .in('conversation_id', convIds);
        allMessages = msgData || [];
      }

      const statsMap = new Map<string, { count: number; tokens: number }>();
      for (const msg of allMessages) {
        const existing = statsMap.get(msg.conversation_id) || { count: 0, tokens: 0 };
        existing.count++;
        existing.tokens += (msg.token_input || 0) + (msg.token_output || 0);
        statsMap.set(msg.conversation_id, existing);
      }

      const conversationsWithStats: RadioConversation[] = (data || []).map(conv => {
        const stats = statsMap.get(conv.id) || { count: 0, tokens: 0 };
        return {
          ...conv,
          message_count: stats.count,
          total_tokens: stats.tokens,
          active_participants: conv.active_participants || []
        } as RadioConversation;
      });

      setConversations(conversationsWithStats);
    } catch (err) {
      toastRef.current({ title: "Errore", description: "Impossibile caricare conversazioni", variant: "destructive" });
    }
  }, [userId]);

  const selectConversation = useCallback((conversationId: string) => {
    setConversationId(conversationId);
  }, [setConversationId]);

  const createConversation = useCallback(async () => {
    try {
      const insertData: any = {
        titolo: 'Radio Chat ' + new Date().toLocaleDateString()
      };
      if (userId && userId !== DEV_ANONYMOUS_ID) insertData.user_id = userId;

      const { data: newConv, error } = await supabase
        .from('chat_laboratory_conversations')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      setConversationId(newConv.id);
      await loadConversations();
      toastRef.current({ title: "✨ Nuova conversazione", description: "Inizia a chattare!" });
      return newConv.id;
    } catch (error) {
      toastRef.current({ title: "Errore", description: "Impossibile creare conversazione", variant: "destructive" });
      return null;
    }
  }, [userId, loadConversations, setConversationId]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
      if (conversationId === currentConversationId) {
        setConversationId(null);
      }
      await loadConversations();
      toastRef.current({ title: "Conversazione eliminata", description: "La conversazione è stata eliminata con successo" });
    } catch (err) {
      toastRef.current({ title: "Errore", description: "Impossibile eliminare conversazione", variant: "destructive" });
    }
  }, [currentConversationId, loadConversations, setConversationId]);

  const updateTitle = useCallback(async (conversationId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .update({ titolo: title })
        .eq('id', conversationId);

      if (error) throw error;
      await loadConversations();
      toastRef.current({ title: "Titolo aggiornato", description: "Il titolo è stato modificato con successo" });
    } catch (err) {
      toastRef.current({ title: "Errore", description: "Impossibile aggiornare titolo", variant: "destructive" });
    }
  }, [loadConversations]);

  const createQuickConversation = useCallback(async (participantNames: Array<{ name: string; type: string }>) => {
    try {
      const insertData: any = {
        titolo: `Radio Chat ${new Date().toLocaleString()}`,
        active_participants: participantNames,
      };
      if (userId && userId !== DEV_ANONYMOUS_ID) insertData.user_id = userId;

      const { data, error } = await supabase
        .from('chat_laboratory_conversations')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      setConversationId(data.id);
      return data.id;
    } catch (err) {
      toastRef.current({ title: 'Errore', description: 'Impossibile creare la conversazione', variant: 'destructive' });
      return null;
    }
  }, [userId, setConversationId]);

  return {
    conversations,
    currentConversationId,
    setConversationId,
    loadConversations,
    selectConversation,
    createConversation,
    createQuickConversation,
    deleteConversation,
    updateTitle
  };
};
