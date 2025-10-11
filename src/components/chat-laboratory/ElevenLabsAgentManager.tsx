import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mic, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ElevenLabsAgent {
  id: string;
  name: string;
  voice_id: string;
  personality_prompt: string;
  is_active: boolean;
  order_index: number;
}

interface ElevenLabsAgentManagerProps {
  conversationId: string | null;
  onAgentsChange: (agents: string[]) => void;
}

export const ElevenLabsAgentManager = ({ conversationId, onAgentsChange }: ElevenLabsAgentManagerProps) => {
  const [agents, setAgents] = useState<ElevenLabsAgent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAgents();
    if (conversationId) {
      loadSelectedAgents();
    } else {
      // Carica da localStorage
      const pending = localStorage.getItem('bar-mode-agents-pending');
      if (pending) {
        const saved = JSON.parse(pending);
        setSelectedAgents(saved);
        onAgentsChange(saved);
      }
    }
  }, [conversationId]);

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('elevenlabs_agents')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Errore caricamento agenti:', error);
    }
  };

  const loadSelectedAgents = async () => {
    try {
      const { data } = await supabase
        .from('chat_laboratory_bar_mode')
        .select('active_elevenlabs_agents')
        .eq('conversation_id', conversationId)
        .single();

      if (data?.active_elevenlabs_agents) {
        setSelectedAgents(data.active_elevenlabs_agents);
        onAgentsChange(data.active_elevenlabs_agents);
      }
    } catch (error) {
      console.error('Errore caricamento agenti selezionati:', error);
    }
  };

  const toggleAgent = async (agentId: string) => {
    const newSelection = selectedAgents.includes(agentId)
      ? selectedAgents.filter(id => id !== agentId)
      : [...selectedAgents, agentId];

    setSelectedAgents(newSelection);
    onAgentsChange(newSelection);

    if (conversationId) {
      // Salva nel database
      try {
        await supabase
          .from('chat_laboratory_bar_mode')
          .update({ active_elevenlabs_agents: newSelection })
          .eq('conversation_id', conversationId);
      } catch (error) {
        console.error('Errore salvataggio selezione:', error);
      }
    } else {
      // Salva in localStorage
      localStorage.setItem('bar-mode-agents-pending', JSON.stringify(newSelection));
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Mic className="h-4 w-4" />
          Agenti Vocali ({selectedAgents.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestisci Agenti Vocali ElevenLabs</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nessun agente vocale configurato</p>
              <Button variant="outline" size="sm" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Crea Primo Agente
              </Button>
            </div>
          ) : (
            agents.map((agent) => (
              <div
                key={agent.id}
                className={`p-4 rounded-lg border ${
                  selectedAgents.includes(agent.id) ? 'bg-primary/5 border-primary' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="font-semibold">{agent.name}</Label>
                      {selectedAgents.includes(agent.id) && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                          Attivo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {agent.personality_prompt}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mic className="h-3 w-3" />
                      Voice ID: {agent.voice_id}
                    </div>
                  </div>
                  <Switch
                    checked={selectedAgents.includes(agent.id)}
                    onCheckedChange={() => toggleAgent(agent.id)}
                  />
                </div>
              </div>
            ))
          )}

          {agents.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                💡 Gli agenti selezionati risponderanno con voce sintetizzata utilizzando ElevenLabs.
                Verifica la tua quota di utilizzo nelle impostazioni.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
