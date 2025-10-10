import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bot, Users } from 'lucide-react';

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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          Partecipanti ({activeCount}/{participants.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Seleziona Partecipanti</h4>
            <p className="text-xs text-muted-foreground">
              Attiva/disattiva gli agenti AI per la discussione
            </p>
          </div>

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
