import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AIAgentId = 'gpt' | 'gemini' | 'claude';

interface AIConfig {
  api_key: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
}

interface AIPayload {
  selected_agent: AIAgentId;
  ai_model: string;
  config?: AIConfig;
  composed_prompts?: Array<{
    id: string;
    name: string;
    content: string;
    target_agent: string | null;
  }>;
}

/**
 * Hook per gestire configurazione AI da database
 * Legge da config_ai e chat_laboratory_composed_prompts
 */
export const useAIConfig = () => {
  const [selectedAgent, setSelectedAgentState] = useState<AIAgentId>('gemini');
  const [aiConfigs, setAiConfigs] = useState<Record<string, AIConfig>>({});
  const [loading, setLoading] = useState(true);

  // Load user preference from ai_communication_preferences
  useEffect(() => {
    loadUserPreference();
    loadAIConfigs();
  }, []);

  const loadUserPreference = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Fallback to localStorage if not authenticated
        const saved = localStorage.getItem('global_ai_agent');
        setSelectedAgentState((saved as AIAgentId) || 'gemini');
        return;
      }

      const { data, error } = await (supabase as any)
        .from('ai_communication_preferences')
        .select('selected_ai_agent')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data?.selected_ai_agent) {
        setSelectedAgentState(data.selected_ai_agent as AIAgentId);
      } else {
        // Fallback to localStorage
        const saved = localStorage.getItem('global_ai_agent');
        setSelectedAgentState((saved as AIAgentId) || 'gemini');
      }
    } catch (error) {
      console.error('Error loading AI preference:', error);
      const saved = localStorage.getItem('global_ai_agent');
      setSelectedAgentState((saved as AIAgentId) || 'gemini');
    } finally {
      setLoading(false);
    }
  };

  const loadAIConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('config_ai')
        .select('provider, api_key, modello');

      if (error) throw error;

      const configMap: Record<string, AIConfig> = {};
      data?.forEach(config => {
        configMap[config.provider] = {
          api_key: config.api_key,
          model: config.modello,
        };
      });

      setAiConfigs(configMap);
    } catch (error) {
      console.error('Error loading AI configs:', error);
    }
  };

  const setSelectedAgent = async (agentId: AIAgentId) => {
    setSelectedAgentState(agentId);
    localStorage.setItem('global_ai_agent', agentId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any)
        .from('ai_communication_preferences')
        .upsert({
          user_id: user.id,
          selected_ai_agent: agentId,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving AI preference:', error);
    }
  };

  const getAIPayload = async (pageRoute?: string): Promise<AIPayload> => {
    const modelMap: Record<AIAgentId, string> = {
      'gpt': 'openai/gpt-5-mini',
      'gemini': 'google/gemini-2.5-flash',
      'claude': 'anthropic/claude-3-5-sonnet'
    };

    const payload: AIPayload = {
      selected_agent: selectedAgent,
      ai_model: modelMap[selectedAgent],
      config: aiConfigs[selectedAgent],
    };

    // Load composed prompts if pageRoute is provided
    if (pageRoute) {
      try {
        const { data, error } = await (supabase as any)
          .from('chat_laboratory_composed_prompts')
          .select('id, name, content, target_agent')
          .or(`page_route.eq.${pageRoute},page_route.is.null`)
          .eq('category', 'composed');

        if (!error && data) {
          payload.composed_prompts = data;
        }
      } catch (error) {
        console.error('Error loading composed prompts:', error);
      }
    }

    return payload;
  };

  return {
    selectedAgent,
    setSelectedAgent,
    getAIPayload,
    aiConfigs,
    loading,
  };
};
