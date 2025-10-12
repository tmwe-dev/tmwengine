import { Button } from '@/components/ui/button';
import { ParticipantSelector } from './ParticipantSelector';
import { ExportSummaryButton } from '@/components/chat/ExportSummaryButton';

interface LabMainControlsProps {
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

export const LabMainControls = ({
  currentConversationId,
  viewMode,
  setViewMode,
  participants,
  toggleParticipant,
}: LabMainControlsProps) => {
  return (
    <div className="flex items-center gap-1">
      <Button
        onClick={() => setViewMode(viewMode === 'classic' ? 'tabs' : 'classic')}
        variant="ghost"
        size="icon"
        className="shrink-0 h-8 w-8"
        title={viewMode === 'classic' ? 'Vista Tabs' : 'Vista Classica'}
      >
        {viewMode === 'classic' ? '📑' : '💬'}
      </Button>
      
      {currentConversationId && (
        <ExportSummaryButton
          labConversationId={currentConversationId}
          variant="laboratory"
          iconOnly
        />
      )}
      
      <ParticipantSelector
        participants={participants}
        onToggle={toggleParticipant}
      />
    </div>
  );
};
