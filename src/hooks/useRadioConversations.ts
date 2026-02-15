import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RadioConversation } from '@/types/radio';

export const useRadioConversations = (userId: string | undefined) => {
  const [conversations, setConversations] = useState<RadioConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    return localStorage.getItem('radio-current-conversation-id') || null;
  });
  const { toast } = useToast();

  // Persist to localStorage
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

      // Filter by user_id if available, otherwise load conversations without user_id
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      const conversationsWithStats = await Promise.all(
        (data || []).map(async (conv) => {
          const { count } = await supabase
            .from('chat_laboratory_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id);

          const { data: messagesData } = await supabase
            .from('chat_laboratory_messages')
            .select('token_input, token_output')
            .eq('conversation_id', conv.id);

          const totalTokens = (messagesData || []).reduce((sum, msg) =>
            sum + (msg.token_input || 0) + (msg.token_output || 0), 0);

          return {
            ...conv,
            message_count: count || 0,
            total_tokens: totalTokens,
            active_participants: conv.active_participants || []
          } as RadioConversation;
        })
      );

      setConversations(conversationsWithStats);
    } catch (err) {
      toast({ title: "Errore", description: "Impossibile caricare conversazioni", variant: "destructive" });
    }
  }, [userId, toast]);

  const selectConversation = useCallback((conversationId: string) => {
    setConversationId(conversationId);
  }, [setConversationId]);

  const createConversation = useCallback(async () => {
    try {
      const insertData: any = {
        titolo: 'Radio Chat ' + new Date().toLocaleDateString()
      };
      if (userId) insertData.user_id = userId;

      const { data: newConv, error } = await supabase
        .from('chat_laboratory_conversations')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      setConversationId(newConv.id);
      await loadConversations();
      toast({ title: "✨ Nuova conversazione", description: "Inizia a chattare!" });
      return newConv.id;
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile creare conversazione", variant: "destructive" });
      return null;
    }
  }, [userId, loadConversations, setConversationId, toast]);

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
      toast({ title: "Conversazione eliminata", description: "La conversazione è stata eliminata con successo" });
    } catch (err) {
      toast({ title: "Errore", description: "Impossibile eliminare conversazione", variant: "destructive" });
    }
  }, [currentConversationId, loadConversations, setConversationId, toast]);

  const updateTitle = useCallback(async (conversationId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .update({ titolo: title })
        .eq('id', conversationId);

      if (error) throw error;
      await loadConversations();
      toast({ title: "Titolo aggiornato", description: "Il titolo è stato modificato con successo" });
    } catch (err) {
      toast({ title: "Errore", description: "Impossibile aggiornare titolo", variant: "destructive" });
    }
  }, [loadConversations, toast]);

  const createQuickConversation = useCallback(async (participantNames: Array<{ name: string; type: string }>) => {
    try {
      const insertData: any = {
        titolo: `Radio Chat ${new Date().toLocaleString()}`,
        active_participants: participantNames,
      };
      if (userId) insertData.user_id = userId;

      const { data, error } = await supabase
        .from('chat_laboratory_conversations')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (err) {
      toast({ title: 'Errore', description: 'Impossibile creare la conversazione', variant: 'destructive' });
      return null;
    }
  }, [userId, toast]);

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
