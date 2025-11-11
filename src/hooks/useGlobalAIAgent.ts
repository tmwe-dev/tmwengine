import { useAIAgent } from '@/contexts/AIAgentContext';

/**
 * Hook globale per gestire la selezione dell'AI Agent
 * 
 * Usage:
 * ```tsx
 * const { selectedAgent, setSelectedAgent, getAIPayload } = useGlobalAIAgent();
 * 
 * // Passare ai chiamanti Edge Function:
 * const payload = getAIPayload();
 * await supabase.functions.invoke('my-function', {
 *   body: {
 *     ...otherData,
 *     ...payload // includes selected_agent + ai_model
 *   }
 * });
 * ```
 */
export const useGlobalAIAgent = () => {
  const context = useAIAgent();
  
  return {
    selectedAgent: context.selectedAgent,
    setSelectedAgent: context.setSelectedAgent,
    getAIPayload: context.getAIPayload,
  };
};
