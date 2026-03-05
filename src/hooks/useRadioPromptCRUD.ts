import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GlobalPrompt {
  id: string;
  nome: string;
  contenuto: string;
}

interface ComposedPrompt {
  id: string;
  name: string;
  content: string;
  target_agent: string;
}

export const useRadioPromptCRUD = (conversationId?: string | null) => {
  const [globalPrompts, setGlobalPrompts] = useState<GlobalPrompt[]>([]);
  const [selectedGlobalId, setSelectedGlobalId] = useState('');
  const [globalContent, setGlobalContent] = useState('');
  const [conversationPromptId, setConversationPromptId] = useState<string | null>(null);

  const [composedPrompts, setComposedPrompts] = useState<ComposedPrompt[]>([]);
  const [selectedComposedId, setSelectedComposedId] = useState('');
  const [composedContent, setComposedContent] = useState('');
  const [conversationComposedId, setConversationComposedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, [conversationId]);

  const loadData = async () => {
    setLoading(true);

    const [{ data: globals }, { data: composed }] = await Promise.all([
      supabase.from('chat_laboratory_system_prompts').select('id, nome, contenuto').order('nome'),
      supabase.from('chat_laboratory_composed_prompts').select('id, name, content, target_agent').order('created_at', { ascending: false })
    ]);

    if (globals) setGlobalPrompts(globals);
    if (composed) setComposedPrompts(composed);

    if (conversationId) {
      const { data: conv } = await supabase
        .from('chat_laboratory_conversations')
        .select('system_prompt_id, composed_prompt_id')
        .eq('id', conversationId)
        .single();

      if (conv?.composed_prompt_id && composed) {
        const found = composed.find(p => p.id === conv.composed_prompt_id);
        if (found) {
          setSelectedComposedId(conv.composed_prompt_id);
          setComposedContent(found.content);
          setConversationComposedId(conv.composed_prompt_id);
        }
      } else if (conv?.system_prompt_id && globals) {
        const found = globals.find(p => p.id === conv.system_prompt_id);
        if (found) {
          setSelectedGlobalId(conv.system_prompt_id);
          setGlobalContent(found.contenuto);
          setConversationPromptId(conv.system_prompt_id);
        }
      } else if (globals?.length) {
        setSelectedGlobalId(globals[0].id);
        setGlobalContent(globals[0].contenuto);
      }
    } else if (globals?.length) {
      setSelectedGlobalId(globals[0].id);
      setGlobalContent(globals[0].contenuto);
    }

    setLoading(false);
  };

  const saveGlobalPrompt = useCallback(async () => {
    if (!selectedGlobalId) return;
    setSaving(true);
    const { error } = await supabase
      .from('chat_laboratory_system_prompts')
      .update({ contenuto: globalContent })
      .eq('id', selectedGlobalId);

    toast(error
      ? { title: 'Errore', description: 'Impossibile salvare il prompt globale', variant: 'destructive' as const }
      : { title: 'Salvato', description: 'Prompt globale aggiornato con successo' }
    );
    setSaving(false);
  }, [selectedGlobalId, globalContent, toast]);

  const onGlobalChange = useCallback(async (id: string) => {
    setSelectedGlobalId(id);
    const prompt = globalPrompts.find(p => p.id === id);
    if (prompt) setGlobalContent(prompt.contenuto);

    if (conversationId) {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .update({ system_prompt_id: id, composed_prompt_id: null })
        .eq('id', conversationId);

      if (!error) {
        setConversationPromptId(id);
        setConversationComposedId(null);
      }
    }
  }, [globalPrompts, conversationId]);

  const onComposedChange = useCallback(async (id: string) => {
    setSelectedComposedId(id);
    const prompt = composedPrompts.find(p => p.id === id);
    if (prompt) setComposedContent(prompt.content);

    if (conversationId) {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .update({ composed_prompt_id: id, system_prompt_id: null })
        .eq('id', conversationId);

      if (!error) {
        setConversationComposedId(id);
        setConversationPromptId(null);
      }
    }
  }, [composedPrompts, conversationId]);

  return {
    globalPrompts, selectedGlobalId, globalContent, setGlobalContent,
    conversationPromptId,
    composedPrompts, selectedComposedId, composedContent,
    conversationComposedId,
    loading, saving,
    saveGlobalPrompt, onGlobalChange, onComposedChange
  };
};
