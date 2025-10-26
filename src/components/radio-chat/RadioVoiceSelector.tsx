import { useEffect, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import { useAudioPreference } from '@/hooks/useAudioPreference';

interface VoiceAgent {
  id: string;
  name: string;
  voice_id: string;
  max_words_per_response: number;
  is_active: boolean;
}

interface RadioVoiceSelectorProps {
  conversationId: string | null;
  isAutoAdvanceEnabled?: boolean;
  onAutoAdvanceChange?: (enabled: boolean) => void;
}

export const RadioVoiceSelector = ({ 
  conversationId,
  isAutoAdvanceEnabled = true,
  onAutoAdvanceChange
}: RadioVoiceSelectorProps) => {
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { isAudioEnabled, toggleAudio } = useAudioPreference();

  const loadAgents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('elevenlabs_agents')
      .select('id, name, voice_id, max_words_per_response, is_active')
      // .eq('is_active', true)  // ← TEMPORANEAMENTE COMMENTATO PER DEBUG
      .order('name');

    console.log('📊 [RadioVoiceSelector] Query result:', { 
      data, 
      error, 
      count: data?.length,
      agents: data?.map(a => ({ name: a.name, is_active: a.is_active }))
    });

    if (error) {
      console.error('❌ Error loading agents:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare gli agenti vocali',
        variant: 'destructive'
      });
    } else {
      setAgents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAgents();
  }, [conversationId]);

  const updateWordLimit = async (agentId: string, newValue: number) => {
    const { error } = await supabase
      .from('elevenlabs_agents')
      .update({ max_words_per_response: newValue })
      .eq('id', agentId);

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il limite parole',
        variant: 'destructive'
      });
    } else {
      setAgents(prev => prev.map(a => 
        a.id === agentId ? { ...a, max_words_per_response: newValue } : a
      ));
    }
  };

  const updateVoiceId = async (agentId: string, newVoiceId: string) => {
    const { error } = await supabase
      .from('elevenlabs_agents')
      .update({ voice_id: newVoiceId })
      .eq('id', agentId);

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare la voce',
        variant: 'destructive'
      });
    } else {
      setAgents(prev => prev.map(a => 
        a.id === agentId ? { ...a, voice_id: newVoiceId } : a
      ));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <h3 className="text-sm font-semibold text-foreground">Voice Settings</h3>
      
      {/* Audio Toggle - SEMPRE VISIBILE */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10">
        <div className="flex items-center gap-3">
          {isAudioEnabled ? (
            <Volume2 className="w-5 h-5 text-primary" />
          ) : (
            <VolumeX className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <div className="font-medium text-sm">Audio Lettura Messaggi</div>
            <div className="text-xs text-muted-foreground">
              {isAudioEnabled ? 'Attivo' : 'Disattivato'}
            </div>
          </div>
        </div>
        <Switch
          checked={isAudioEnabled}
          onCheckedChange={toggleAudio}
        />
      </div>

      {/* Auto-Advance Toggle - SEMPRE VISIBILE */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/10">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 flex items-center justify-center">
            <span className="text-lg">⏭️</span>
          </div>
          <div>
            <div className="font-medium text-sm">Auto-Advance</div>
            <div className="text-xs text-muted-foreground">
              {isAutoAdvanceEnabled 
                ? 'Passa automaticamente al messaggio successivo' 
                : 'Navigazione manuale'}
            </div>
          </div>
        </div>
        <Switch
          checked={isAutoAdvanceEnabled}
          onCheckedChange={onAutoAdvanceChange}
        />
      </div>

      {/* Sezione Agenti - CONDIZIONALE */}
      {agents.length === 0 ? (
        <div className="text-sm text-muted-foreground p-4 text-center">
          Nessun agente vocale caricato
        </div>
      ) : (
        agents.map(agent => (
          <div key={agent.id} className="space-y-4 p-4 rounded-lg bg-muted/50">
            <div className="font-medium text-sm">{agent.name}</div>
            
            {/* Word Limit Slider */}
            <div className="space-y-2">
              <Label className="text-xs flex justify-between">
                <span>Max Parole</span>
                <span className="font-mono">{agent.max_words_per_response}</span>
              </Label>
              <Slider
                value={[agent.max_words_per_response]}
                onValueChange={([val]) => updateWordLimit(agent.id, val)}
                min={10}
                max={300}
                step={10}
                className="w-full"
              />
            </div>

            {/* Voice ID Selector */}
            <div className="space-y-2">
              <Label className="text-xs">Voice ID</Label>
              <Select
                value={agent.voice_id}
                onValueChange={(val) => updateVoiceId(agent.id, val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9BWtsMINqrJLrRacOk9x">Aria</SelectItem>
                  <SelectItem value="CwhRBWXzGAHq8TQ4Fs17">Roger</SelectItem>
                  <SelectItem value="EXAVITQu4vr4xnSDxMaL">Sarah</SelectItem>
                  <SelectItem value="FGY2WhTYpPnrIDTdsKH5">Laura</SelectItem>
                  <SelectItem value="IKne3meq5aSn9XLyUdCD">Charlie</SelectItem>
                  <SelectItem value="JBFqnCBsd6RMkjVDRZzb">George</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
