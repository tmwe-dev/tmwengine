import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ToolProgress {
  index: number;
  total: number;
  name: string;
  icon: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  startMessage: string;
  completeMessage?: string;
  errorMessage?: string;
}

interface UseStreamingChatProps {
  prompt: string;
  systemPrompt: string;
  conversationId: string;
  configId: string | null;
  images?: string[];
}

interface UseStreamingChatReturn {
  isLoading: boolean;
  toolProgress: ToolProgress[];
  finalResponse: { data: any; error: any } | null;
  cancelStream: () => void;
  startStream: (props: UseStreamingChatProps) => Promise<void>;
}

export const useStreamingChat = (): UseStreamingChatReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [toolProgress, setToolProgress] = useState<ToolProgress[]>([]);
  const [finalResponse, setFinalResponse] = useState<{ data: any; error: any } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setToolProgress([]);
    }
  }, []);

  const startStream = useCallback(async ({
    prompt,
    systemPrompt,
    conversationId,
    configId,
    images
  }: UseStreamingChatProps) => {
    setIsLoading(true);
    setToolProgress([]);
    setFinalResponse(null);

    abortControllerRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Get Supabase URL from environment or current location
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || window.location.origin;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/chat-with-ai`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify({
            prompt,
            systemPrompt,
            conversationId,
            configId,
            images
          }),
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) throw new Error('Stream request failed');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);

            switch (event.type) {
              case 'tool_start':
                setToolProgress(prev => {
                  const newProgress = [...prev];
                  const existingIndex = newProgress.findIndex(t => t.index === event.data.index);
                  
                  if (existingIndex >= 0) {
                    newProgress[existingIndex] = {
                      ...newProgress[existingIndex],
                      total: event.data.total, // Ensure total is always set
                      status: 'running',
                      startMessage: event.data.message
                    };
                  } else {
                    // Create all pending tools if not exists
                    for (let i = prev.length; i < event.data.total; i++) {
                      newProgress.push({
                        index: i,
                        total: event.data.total,
                        name: '',
                        icon: '⏺️',
                        status: 'pending',
                        startMessage: ''
                      });
                    }
                    // Update current tool
                    newProgress[event.data.index] = {
                      index: event.data.index,
                      total: event.data.total,
                      name: event.data.name,
                      icon: event.data.icon,
                      status: 'running',
                      startMessage: event.data.message
                    };
                  }
                  
                  return newProgress;
                });
                break;

              case 'tool_complete':
                setToolProgress(prev => {
                  const newProgress = [...prev];
                  const tool = newProgress.find(t => t.index === event.data.index);
                  if (tool) {
                    tool.status = 'complete';
                    tool.completeMessage = event.data.message;
                  }
                  return newProgress;
                });
                break;

              case 'tool_error':
                setToolProgress(prev => {
                  const newProgress = [...prev];
                  const tool = newProgress.find(t => t.index === event.data.index);
                  if (tool) {
                    tool.status = 'error';
                    tool.errorMessage = event.data.message;
                  }
                  return newProgress;
                });
                break;

              case 'ai_response_start':
                // AI sta generando la risposta finale
                break;

              case 'complete':
                setFinalResponse({ data: event.data, error: null });
                setIsLoading(false);
                break;

              case 'error':
                setFinalResponse({ data: null, error: event.data });
                setIsLoading(false);
                break;
            }
          } catch (err) {
            console.error('Error parsing SSE event:', err);
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream cancelled by user');
      } else {
        console.error('Stream error:', error);
        setFinalResponse({ data: null, error: error.message });
      }
      setIsLoading(false);
    } finally {
      abortControllerRef.current = null;
    }
  }, []);

  return {
    isLoading,
    toolProgress,
    finalResponse,
    cancelStream,
    startStream
  };
};
