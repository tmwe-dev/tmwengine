import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSensors, useSensor, PointerSensor } from '@dnd-kit/core';

export const useBarChatAgents = () => {
  const [barChatAgents, setBarChatAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [usageStats, setUsageStats] = useState({
    charactersToday: 0,
    dailyLimit: 10000,
    requestsToday: 0,
  });
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: '',
    elevenlabs_agent_id: '',
    voice_id: '',
    text_generation_prompt: '',
    max_words_per_response: 150,
    temperature: 0.7,
    enable_dynamic_routing: false,
    routing_threshold: 0.5,
  });
  const [previewResponse, setPreviewResponse] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadBarChatAgents();
    loadUsageStats();
  }, []);

  const loadBarChatAgents = async () => {
    try {
      setLoadingAgents(true);
      const { data, error } = await supabase
        .from('elevenlabs_agents')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setBarChatAgents(data || []);
    } catch (error) {
      console.error('Errore caricamento agenti:', error);
      toast.error('Errore nel caricamento degli agenti');
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      setLoadingUsage(true);
      // Simulazione statistiche - sostituire con logica reale se disponibile
      setUsageStats({
        charactersToday: Math.floor(Math.random() * 5000),
        dailyLimit: 10000,
        requestsToday: Math.floor(Math.random() * 50),
      });
    } catch (error) {
      console.error('Errore caricamento statistiche:', error);
    } finally {
      setLoadingUsage(false);
    }
  };

  const handleCreateAgent = async () => {
    try {
      setSaving(true);

      const { error } = await supabase.from('elevenlabs_agents').insert([
        {
          ...newAgent,
          is_active: false,
          order_index: barChatAgents.length,
        },
      ]);

      if (error) throw error;

      toast.success('Agente creato con successo');
      setNewAgent({
        name: '',
        elevenlabs_agent_id: '',
        voice_id: '',
        text_generation_prompt: '',
        max_words_per_response: 150,
        temperature: 0.7,
        enable_dynamic_routing: false,
        routing_threshold: 0.5,
      });
      loadBarChatAgents();
    } catch (error: any) {
      console.error('Errore creazione agente:', error);
      toast.error(error.message || 'Errore nella creazione dell\'agente');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAgent = async (agentId: string) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('elevenlabs_agents')
        .update({
          name: editingAgent.name,
          voice_id: editingAgent.voice_id,
          text_generation_prompt: editingAgent.text_generation_prompt,
          max_words_per_response: editingAgent.max_words_per_response,
          temperature: editingAgent.temperature,
          enable_dynamic_routing: editingAgent.enable_dynamic_routing,
          routing_threshold: editingAgent.routing_threshold,
        })
        .eq('id', agentId);

      if (error) throw error;

      toast.success('Agente aggiornato con successo');
      setEditingAgent(null);
      loadBarChatAgents();
    } catch (error: any) {
      console.error('Errore aggiornamento agente:', error);
      toast.error(error.message || 'Errore nell\'aggiornamento dell\'agente');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('elevenlabs_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      toast.success('Agente eliminato con successo');
      loadBarChatAgents();
    } catch (error: any) {
      console.error('Errore eliminazione agente:', error);
      toast.error(error.message || 'Errore nell\'eliminazione dell\'agente');
    }
  };

  const handleToggleAgent = async (agentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('elevenlabs_agents')
        .update({ is_active: !currentStatus })
        .eq('id', agentId);

      if (error) throw error;

      toast.success(`Agente ${!currentStatus ? 'attivato' : 'disattivato'}`);
      loadBarChatAgents();
    } catch (error: any) {
      console.error('Errore toggle agente:', error);
      toast.error(error.message || 'Errore nel cambio stato dell\'agente');
    }
  };

  const handleTestAgent = async () => {
    try {
      setTestingConnection(true);
      setPreviewResponse('');

      const { data: config } = await supabase
        .from('voice_agent_config')
        .select('elevenlabs_api_key')
        .eq('enabled', true)
        .single();

      if (!config?.elevenlabs_api_key) {
        toast.error("Configura l'API Key in Impostazioni > Voice Agent (ElevenLabs)");
        return;
      }

      const testMessage = 'Ciao! Questo è un test di connessione.';
      const { data, error } = await supabase.functions.invoke('elevenlabs-conversation-test', {
        body: {
          apiKey: config.elevenlabs_api_key,
          agentId: newAgent.elevenlabs_agent_id,
          message: testMessage,
        },
      });

      if (error) throw error;

      setPreviewResponse(data?.response || 'Connessione riuscita!');
      toast.success('Test completato con successo');
    } catch (error: any) {
      console.error('Errore test connessione:', error);
      toast.error(error.message || 'Errore nel test di connessione');
      setPreviewResponse('Errore nel test di connessione');
    } finally {
      setTestingConnection(false);
    }
  };

  const handlePreviewPersonality = async () => {
    try {
      setTestingConnection(true);
      setPreviewResponse('');

      const previewText = `Preview personalità:\n\n${newAgent.text_generation_prompt}\n\nQuesta personalità sarà utilizzata per generare le risposte dell'agente.`;
      setPreviewResponse(previewText);
      toast.success('Preview generato');
    } catch (error) {
      console.error('Errore preview personalità:', error);
      toast.error('Errore nella generazione del preview');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = barChatAgents.findIndex((a) => a.id === active.id);
    const newIndex = barChatAgents.findIndex((a) => a.id === over.id);

    const reorderedAgents = [...barChatAgents];
    const [movedAgent] = reorderedAgents.splice(oldIndex, 1);
    reorderedAgents.splice(newIndex, 0, movedAgent);

    setBarChatAgents(reorderedAgents);

    try {
      const updates = reorderedAgents.map((agent, index) => ({
        id: agent.id,
        order_index: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('elevenlabs_agents')
          .update({ order_index: update.order_index })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success('Ordine agenti aggiornato');
    } catch (error) {
      console.error('Errore aggiornamento ordine:', error);
      toast.error('Errore nell\'aggiornamento dell\'ordine');
      loadBarChatAgents();
    }
  };

  return {
    barChatAgents,
    loadingAgents,
    usageStats,
    loadingUsage,
    newAgent,
    setNewAgent,
    previewResponse,
    testingConnection,
    saving,
    editingAgent,
    setEditingAgent,
    handleCreateAgent,
    handleUpdateAgent,
    handleDeleteAgent,
    handleToggleAgent,
    handleTestAgent,
    handlePreviewPersonality,
    handleDragEnd,
    sensors,
  };
};
