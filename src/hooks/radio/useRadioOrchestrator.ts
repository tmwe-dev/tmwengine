import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useRadioOrchestrator() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invokeOrchestrator = async (conversationId: string, userMessage: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: participants } = await supabase
        .from('chat_laboratory_participants')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_active', true);

      const { data, error: funcError } = await supabase.functions.invoke(
        'bar-chat-orchestrator',
        {
          body: {
            conversationId,
            userMessage,
            participants: participants || [],
          },
        }
      );

      if (funcError) throw funcError;

      return data;
    } catch (err: any) {
      console.error('Error invoking orchestrator:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    invokeOrchestrator,
    isLoading,
    error,
  };
}
