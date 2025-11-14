import React, { createContext, useContext, ReactNode } from 'react';
import { useAIConfig } from '@/hooks/useAIConfig';

type AIAgentId = 'gpt' | 'gemini' | 'claude';

interface AIAgentContextType {
  selectedAgent: AIAgentId;
  setSelectedAgent: (agentId: AIAgentId) => void;
  getAIPayload: (pageRoute?: string) => Promise<any>;
  loading: boolean;
}

const AIAgentContext = createContext<AIAgentContextType | undefined>(undefined);

export const AIAgentProvider = ({ children }: { children: ReactNode }) => {
  const { selectedAgent, setSelectedAgent, getAIPayload, loading } = useAIConfig();

  return (
    <AIAgentContext.Provider value={{ selectedAgent, setSelectedAgent, getAIPayload, loading }}>
      {children}
    </AIAgentContext.Provider>
  );
};

export const useAIAgent = () => {
  const context = useContext(AIAgentContext);
  if (!context) {
    throw new Error('useAIAgent deve essere usato dentro AIAgentProvider');
  }
  return context;
};
