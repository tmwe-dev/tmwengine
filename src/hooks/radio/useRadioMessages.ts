import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRadioMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = async () => {
    if (!conversationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('chat_laboratory_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setMessages(data || []);
    } catch (err: any) {
      console.error('Error loading messages:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserMessage = async (content: string) => {
    console.log('💾 saveUserMessage called with:', content);
    console.log('🆔 conversationId:', conversationId);
    
    if (!conversationId) {
      console.log('❌ No conversationId, returning null');
      return null;
    }

    try {
      console.log('🔐 Getting user...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 User:', user);
      
      if (!user) {
        console.log('❌ User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('📤 Inserting message into database...');
      const { data, error: saveError } = await supabase
        .from('chat_laboratory_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'human',
          sender_name: 'Tu',
          content,
          is_visible_to_ai: true,
          user_id: user.id,
        })
        .select()
        .single();

      if (saveError) {
        console.log('❌ Database error:', saveError);
        throw saveError;
      }

      console.log('✅ Message inserted:', data);
      setMessages(prev => [...prev, data]);
      return data;
    } catch (err: any) {
      console.error('❌ Error saving message:', err);
      setError(err.message);
      return null;
    }
  };

  const subscribeToMessages = () => {
    if (!conversationId) return;

    const channel = supabase
      .channel('radio-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_laboratory_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    if (conversationId) {
      loadMessages();
      const unsubscribe = subscribeToMessages();
      return unsubscribe;
    }
  }, [conversationId]);

  return {
    messages,
    saveUserMessage,
    loadMessages,
    isLoading,
    error,
  };
}
