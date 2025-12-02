import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bot, Users, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Participant {
  id: string;
  type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  name: string;
  is_active: boolean;
}

interface ParticipantSelectorProps {
  participants: Participant[];
  onToggle: (participantId: string) => void;
}

const PARTICIPANT_ICONS = {
  human: { icon: '👤', color: 'text-blue-600', bg: 'bg-blue-100' },
  chatgpt: { icon: '🤖', color: 'text-green-600', bg: 'bg-green-100' },
  gemini: { icon: '🔷', color: 'text-cyan-600', bg: 'bg-cyan-100' },
  claude: { icon: '🧠', color: 'text-purple-600', bg: 'bg-purple-100' }
};

export const ParticipantSelector = ({ participants, onToggle }: ParticipantSelectorProps) => {
  const activeCount = participants.filter(p => p.is_active).length;
  const isMobile = useIsMobile();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    anthropic: boolean;
    openai: boolean;
    lovable: boolean;
  } | null>(null);

  const checkAIStatus = async () => {
    setIsRefreshing(true);
    try {
      // Chiama test-ai-connection per ogni servizio AI configurato
      const { data: configs, error: configError } = await supabase
        .from('config_ai')
        .select('*')
        .eq('attivo', true);
      
      if (configError) throw configError;
      
      const statusChecks = {
        anthropic: false,
        openai: false,
        lovable: false
      };
      
      // Controlla ogni configurazione attiva
      for (const config of configs || []) {
        const { data } = await supabase.functions.invoke('test-ai-connection', {
          body: { configId: config.id }
        });
        
        if (data?.success) {
          if (config.provider === 'anthropic') statusChecks.anthropic = true;
          if (config.provider === 'openai') statusChecks.openai = true;
          if (config.provider === 'lovable' || config.provider === 'google') statusChecks.lovable = true;
        }
      }
      
      setAiStatus(statusChecks);
      toast.success('Stato servizi AI aggiornato');
    } catch (error) {
      console.error('Error checking AI status:', error);
      toast.error('Errore nel verificare lo stato AI');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="shrink-0 min-w-[60px] gap-1 bg-transparent hover:bg-transparent"
          title="Partecipanti"
        >
          <Users className="h-4 w-4" />
          <span className="text-xs">{activeCount}/{participants.length}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 z-[102]" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium mb-2">Seleziona Partecipanti</h4>
              <p className="text-xs text-muted-foreground">
                Attiva/disattiva gli agenti AI per la discussione
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={checkAIStatus}
              disabled={isRefreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {aiStatus && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <p className="text-xs font-medium mb-2">Stato Servizi AI:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  {aiStatus.anthropic ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>Anthropic (Claude)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {aiStatus.openai ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>OpenAI (GPT)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {aiStatus.lovable ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-600" />
                  )}
                  <span>Lovable AI (Gemini)</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {participants.map((participant) => {
              const config = PARTICIPANT_ICONS[participant.type];
              
              return (
                <div 
                  key={participant.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    participant.is_active ? 'bg-muted/50' : 'opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`${config.bg} p-2 rounded-lg`}>
                      <span className="text-lg">{config.icon}</span>
                    </div>
                    <div>
                      <Label className={`font-medium ${config.color}`}>
                        {participant.name}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {participant.type === 'human' ? 'Utente' : 'AI Agent'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={participant.is_active}
                    onCheckedChange={() => onToggle(participant.id)}
                    disabled={participant.type === 'human'}
                  />
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              💡 Gli agenti AI non vedranno le risposte degli altri agenti, solo i tuoi messaggi
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
