import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRadioPromptCache = () => {
  const [cachedPrompts, setCachedPrompts] = useState<any>(null);

  const loadCachedPrompts = useCallback(async (conversationId: string) => {
    try {
      const { data: conv } = await supabase
        .from('chat_laboratory_conversations')
        .select('composed_prompt_id, system_prompt_id, personality_section_id')
        .eq('id', conversationId)
        .single();

      let conversationPrompt: string | null = null;
      let conversationPersonality: string | null = null;

      if (conv?.composed_prompt_id) {
        const { data } = await supabase.from('chat_laboratory_composed_prompts').select('content').eq('id', conv.composed_prompt_id).single();
        if (data?.content) conversationPrompt = data.content;
      } else if (conv?.system_prompt_id) {
        const { data } = await supabase.from('chat_laboratory_system_prompts').select('contenuto').eq('id', conv.system_prompt_id).single();
        if (data?.contenuto) conversationPrompt = data.contenuto;
      }

      if (conv?.personality_section_id) {
        const { data } = await supabase.from('chat_laboratory_prompt_sections').select('content').eq('id', conv.personality_section_id).single();
        if (data?.content) conversationPersonality = data.content;
      }

      const [globalData, baseData, personalityData, styleData, orchestratorData] = await Promise.all([
        supabase.from('chat_laboratory_system_prompts').select('contenuto').eq('attivo', true).limit(1).maybeSingle(),
        supabase.from('chat_laboratory_prompt_sections').select('content').eq('section_type', 'BASE').eq('is_active', true).order('order_priority', { ascending: true }),
        supabase.from('chat_laboratory_prompt_sections').select('section_name, content').eq('section_type', 'AGENT_PERSONALITY').eq('is_active', true),
        supabase.from('chat_laboratory_prompt_sections').select('section_name, content').eq('section_type', 'CONVERSATION_STYLE').eq('is_active', true),
        supabase.from('chat_laboratory_prompt_sections').select('content').eq('section_type', 'ORCHESTRATOR_RULES').eq('is_active', true).maybeSingle()
      ]);

      const agentPersonalities: Record<string, string> = {};
      personalityData.data?.forEach((p: any) => { agentPersonalities[p.section_name.toLowerCase()] = p.content; });

      const conversationStyles: Record<string, string> = {};
      styleData.data?.forEach((s: any) => { conversationStyles[s.section_name.toLowerCase()] = s.content; });

      const prompts = {
        globalPrompt: conversationPrompt || globalData.data?.contenuto || 'Sei un assistente AI intelligente che partecipa a discussioni costruttive in un bar virtuale.',
        baseSections: baseData.data?.map((s: any) => s.content).join('\n\n') || '',
        agentPersonalities,
        conversationStyles,
        orchestratorRules: orchestratorData.data?.content || 'Leggi l\'ultimo messaggio. Se contiene una DOMANDA o RICHIESTA verso altri, rispondi TRUE. Altrimenti FALSE.',
        conversationPersonality,
        timestamp: Date.now()
      };

      setCachedPrompts(prompts);
    } catch (error) {
      console.error('❌ Errore caricamento prompt:', error);
    }
  }, []);

  return { cachedPrompts, loadCachedPrompts };
};
