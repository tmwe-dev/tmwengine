import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AIActionProposal } from '@/types/email-automation';

interface GlobalAICanvasState {
  isOpen: boolean;
  context: EmailAICanvasContext | null;
  isProcessing: boolean;
  messages: AICanvasMessage[];
  currentProposal: AIActionProposal | null;
}

interface EmailAICanvasContext {
  type: 'email' | 'sender' | 'general';
  senderEmail?: string;
  emailUid?: string;
  emailSubject?: string;
  emailBody?: string;
  customContext?: Record<string, any>;
}

interface AICanvasMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  proposal?: AIActionProposal;
}

interface GlobalAICanvasContextType {
  state: GlobalAICanvasState;
  openCanvas: (context: EmailAICanvasContext) => void;
  closeCanvas: () => void;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  setProposal: (proposal: AIActionProposal | null) => void;
}

const GlobalAICanvasContext = createContext<GlobalAICanvasContextType | undefined>(undefined);

export const GlobalAICanvasProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GlobalAICanvasState>({
    isOpen: false,
    context: null,
    isProcessing: false,
    messages: [],
    currentProposal: null,
  });

  const openCanvas = useCallback((context: EmailAICanvasContext) => {
    setState(prev => ({
      ...prev,
      isOpen: true,
      context,
      messages: [], // Reset messages when opening with new context
    }));
  }, []);

  const closeCanvas = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      currentProposal: null,
    }));
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage: AICanvasMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isProcessing: true,
    }));

    try {
      // Import supabase client here to avoid circular dependency
      const { supabase } = await import('@/integrations/supabase/client');

      // Build request body based on context
      const requestBody: any = {
        message,
        context_type: state.context?.type || 'general',
        conversation_history: state.messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      };

      // Add context-specific data
      if (state.context) {
        if (state.context.senderEmail) {
          requestBody.sender_email = state.context.senderEmail;
        }
        if (state.context.emailUid) {
          requestBody.email_uid = state.context.emailUid;
          requestBody.email_subject = state.context.emailSubject;
          requestBody.email_body = state.context.emailBody;
        }
        if (state.context.customContext) {
          requestBody.custom_context = state.context.customContext;
        }
      }

      console.log('📤 Calling ai-canvas-chat edge function');

      // Call edge function
      const { data, error } = await supabase.functions.invoke('ai-canvas-chat', {
        body: requestBody,
      });

      if (error) {
        console.error('Error calling AI Canvas:', error);
        throw new Error(error.message || 'AI service error');
      }

      if (!data || !data.response) {
        throw new Error('Invalid response from AI');
      }

      console.log('✅ AI Canvas response received');

      // Create assistant message
      const assistantMessage: AICanvasMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        proposal: data.structured_response || undefined,
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isProcessing: false,
        currentProposal: data.structured_response || prev.currentProposal,
      }));
    } catch (error) {
      console.error('Error sending message to AI:', error);
      
      // Add error message
      const errorMessage: AICanvasMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Si è verificato un errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isProcessing: false,
      }));
    }
  }, [state.context, state.messages]);

  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      currentProposal: null,
    }));
  }, []);

  const setProposal = useCallback((proposal: AIActionProposal | null) => {
    setState(prev => ({
      ...prev,
      currentProposal: proposal,
    }));
  }, []);

  return (
    <GlobalAICanvasContext.Provider
      value={{
        state,
        openCanvas,
        closeCanvas,
        sendMessage,
        clearMessages,
        setProposal,
      }}
    >
      {children}
    </GlobalAICanvasContext.Provider>
  );
};

export const useGlobalAICanvas = () => {
  const context = useContext(GlobalAICanvasContext);
  if (!context) {
    throw new Error('useGlobalAICanvas must be used within GlobalAICanvasProvider');
  }
  return context;
};
