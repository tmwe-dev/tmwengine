import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RadioParticipant } from '@/types/radio';

export const useRadioParticipants = () => {
  const [participants, setParticipants] = useState<RadioParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    const loadParticipants = async () => {
      try {
        const { data, error } = await supabase
          .from('elevenlabs_agents')
          .select('id, name, is_active, elevenlabs_agent_id, voice_id')
          .eq('is_active', true)
          .order('order_index', { ascending: true });

        if (error) {
          toastRef.current({ title: "Errore caricamento agenti", description: error.message, variant: "destructive" });
          return;
        }

        if (!data || data.length === 0) {
          toastRef.current({ title: "Nessun agente disponibile", description: "Attiva almeno un agente nelle impostazioni AI", variant: "destructive" });
          return;
        }

        const mapped: RadioParticipant[] = data.map(agent => {
          let type: 'chatgpt' | 'gemini' | 'claude' = 'gemini';
          const nameLower = agent.name.toLowerCase();
          if (nameLower.includes('gpt')) type = 'chatgpt';
          else if (nameLower.includes('claude') || nameLower.includes('anthropic')) type = 'claude';
          else if (nameLower.includes('gemini')) type = 'gemini';

          const displayName = type === 'chatgpt' ? 'Albert'
            : type === 'gemini' ? 'Pitagora'
            : 'Archimede';

          return {
            id: agent.elevenlabs_agent_id || agent.id,
            type,
            name: displayName,
            is_active: true,
            voice_id: agent.voice_id
          };
        });

        setParticipants(mapped);
        toastRef.current({ title: "Agenti caricati", description: `${mapped.length} agenti disponibili` });
      } catch (err) {
        toastRef.current({ title: "Errore critico", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    loadParticipants();
  }, []);

  const toggleParticipant = useCallback((id: string) => {
    const participant = participants.find(p => p.id === id);
    if (!participant) return;
    const newState = !participant.is_active;
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, is_active: newState } : p));
    toastRef.current({
      title: newState ? 'Agente attivato' : 'Agente disattivato',
      description: `${participant.name} è ${newState ? 'attivo' : 'disattivo'} in questa conversazione`,
    });
  }, [participants]);

  return { participants, setParticipants, toggleParticipant, isLoading };
};
