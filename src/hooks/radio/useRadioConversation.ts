import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const RADIO_CHAT_PARTICIPANTS = [
  { type: 'human', name: 'Tu', is_active: true },
  { type: 'chatgpt', name: 'ChatGPT', is_active: true },
  { type: 'gemini', name: 'Gemini', is_active: true },
  { type: 'claude', name: 'Claude', is_active: true },
];

export function useRadioConversation() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createConversation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('chat_laboratory_conversations')
        .insert({
          user_id: user.id,
          name: `Radio Chat ${new Date().toLocaleString()}`,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const participantsToInsert = RADIO_CHAT_PARTICIPANTS.map(p => ({
        conversation_id: conversation.id,
        type: p.type,
        name: p.name,
        is_active: p.is_active,
        user_id: user.id,
      }));

      const { error: partError } = await supabase
        .from('chat_laboratory_participants')
        .insert(participantsToInsert);

      if (partError) throw partError;

      // Configure Bar Mode
      const { error: barModeError } = await supabase
        .from('chat_laboratory_bar_mode')
        .insert({
          conversation_id: conversation.id,
          mode: 'bar',
          voice_enabled: false,
          user_id: user.id,
        });

      if (barModeError) throw barModeError;

      setConversationId(conversation.id);
      return conversation.id;
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    conversationId,
    createConversation,
    isLoading,
    error,
  };
}
