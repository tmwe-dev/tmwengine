import { ParticipantSelector } from './ParticipantSelector';
import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';
import { Link } from 'react-router-dom';

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
      <Button
        variant="ghost"
        size="icon"
        asChild
        title="Gestione Prompt Sistema"
      >
        <Link to="/prompt-system-manager">
          <Brain className="h-4 w-4" />
        </Link>
      </Button>
      <ParticipantSelector
        participants={participants}
        onToggle={toggleParticipant}
      />
    </div>
  );
};
