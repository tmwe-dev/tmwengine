import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type AIAgentId = 'gpt' | 'gemini' | 'claude';

interface AIAgentContextType {
  selectedAgent: AIAgentId;
  setSelectedAgent: (agentId: AIAgentId) => void;
  getAIPayload: () => {
    selected_agent: AIAgentId;
    ai_model: string;
  };
}

const AIAgentContext = createContext<AIAgentContextType | undefined>(undefined);

export const AIAgentProvider = ({ children }: { children: ReactNode }) => {
  // Load from localStorage or default to 'gemini'
  const [selectedAgent, setSelectedAgentState] = useState<AIAgentId>(() => {
    const saved = localStorage.getItem('global_ai_agent');
    return (saved as AIAgentId) || 'gemini';
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('global_ai_agent', selectedAgent);
  }, [selectedAgent]);

  const setSelectedAgent = (agentId: AIAgentId) => {
    setSelectedAgentState(agentId);
  };

  // Helper to get payload for Edge Functions
  const getAIPayload = () => {
    const modelMap: Record<AIAgentId, string> = {
      'gpt': 'openai/gpt-5-mini',
      'gemini': 'google/gemini-2.5-flash',
      'claude': 'anthropic/claude-3-5-sonnet'
    };

    return {
      selected_agent: selectedAgent,
      ai_model: modelMap[selectedAgent]
    };
  };

  return (
    <AIAgentContext.Provider value={{ selectedAgent, setSelectedAgent, getAIPayload }}>
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
