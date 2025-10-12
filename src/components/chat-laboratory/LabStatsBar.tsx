import { TokenCounterBadge } from '@/components/chat/TokenCounterBadge';
import { ConversationCostBadge } from '@/components/chat/ConversationCostBadge';
import { ExportSummaryButton } from '@/components/chat/ExportSummaryButton';

interface LabStatsBarProps {
  currentConversationId: string | null;
}

export const LabStatsBar = ({ currentConversationId }: LabStatsBarProps) => {
  if (!currentConversationId) return null;
  
  return (
    <div className="flex items-center justify-end gap-2 px-4 py-1.5 border-t border-border/40">
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
  );
};
