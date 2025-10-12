import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { LaboratoryPromptManager } from './LaboratoryPromptManager';
import { ParticipantSelector } from './ParticipantSelector';

interface Participant {
  id: string;
  type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  name: string;
  is_active: boolean;
}

interface LabControlsBarProps {
  viewMode: 'classic' | 'tabs';
  setViewMode: (mode: 'classic' | 'tabs') => void;
  participants: Participant[];
  toggleParticipant: (id: string) => void;
}

export const LabControlsBar = ({
  viewMode,
  setViewMode,
  participants,
  toggleParticipant,
}: LabControlsBarProps) => {
  const activeCount = participants.filter(p => p.is_active).length;
  
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-border/40">
      {/* Sinistra: Toggle Vista */}
      <Button
        onClick={() => setViewMode(viewMode === 'classic' ? 'tabs' : 'classic')}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {viewMode === 'classic' ? '📑 Schede' : '💬 Classica'}
      </Button>
      
      {/* Centro: Prompt Manager */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <LaboratoryPromptManager />
      </div>
      
      {/* Destra: Partecipanti */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" />
          {activeCount}/{participants.length}
        </Badge>
        <ParticipantSelector
          participants={participants}
          onToggle={toggleParticipant}
        />
      </div>
    </div>
  );
};
