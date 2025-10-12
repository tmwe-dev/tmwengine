import { TokenCounterBadge } from '@/components/chat/TokenCounterBadge';
import { ConversationCostBadge } from '@/components/chat/ConversationCostBadge';
import { ExportSummaryButton } from '@/components/chat/ExportSummaryButton';
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
    <div className="flex flex-col gap-1.5">
      {/* Prima riga: Statistiche */}
      {currentConversationId && (
        <div className="flex items-center gap-1 justify-end">
          <TokenCounterBadge 
            labConversationId={currentConversationId}
            variant="laboratory"
            alertThreshold={15000}
          />
          <ConversationCostBadge labConversationId={currentConversationId} />
          <ExportSummaryButton 
            labConversationId={currentConversationId}
            variant="laboratory"
            iconOnly
          />
        </div>
      )}
      
      {/* Seconda riga: Controlli */}
      <div className="flex items-center gap-1 justify-end">
        <Button
          onClick={() => setViewMode(viewMode === 'classic' ? 'tabs' : 'classic')}
          variant="outline"
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
    </div>
  );
};
