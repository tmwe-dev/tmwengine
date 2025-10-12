import { LaboratoryPromptManager } from './LaboratoryPromptManager';
import { ParticipantSelector } from './ParticipantSelector';
import { Button } from '@/components/ui/button';

interface LabHeaderControlsProps {
  currentConversationId: string | null;
  viewMode: 'classic' | 'tabs';
  setViewMode: (mode: 'classic' | 'tabs') => void;
  participants: Array<{
    id: string;
    type: 'human' | 'chatgpt' | 'gemini' | 'claude';
    name: string;
    is_active: boolean;
  }>;
  toggleParticipant: (id: string) => void;
}

export const LabHeaderControls = ({
  currentConversationId,
  viewMode,
  setViewMode,
  participants,
  toggleParticipant,
}: LabHeaderControlsProps) => {
  return (
    <div className="flex items-center gap-1">
      <Button
        onClick={() => setViewMode(viewMode === 'classic' ? 'tabs' : 'classic')}
        variant="ghost"
        size="icon"
        title={viewMode === 'classic' ? 'Vista Tabs' : 'Vista Classica'}
      >
        {viewMode === 'classic' ? '📑' : '💬'}
      </Button>
      <LaboratoryPromptManager />
      <ParticipantSelector
        participants={participants}
        onToggle={toggleParticipant}
      />
    </div>
  );
};
