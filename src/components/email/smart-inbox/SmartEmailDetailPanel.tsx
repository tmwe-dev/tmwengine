import { SmartEmailDetailIntelligent } from './SmartEmailDetailIntelligent';
import { SmartEmailDetailClean } from './SmartEmailDetailClean';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { ViewMode } from './ViewModeSelector';

interface SmartEmailDetailPanelProps {
  classifiedEmail: ClassifiedEmail;
  onClose: () => void;
  viewMode?: ViewMode;
  currentIndex?: number;
  totalEmails?: number;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  cleanViewMode?: boolean;
}

export const SmartEmailDetailPanel = ({
  classifiedEmail,
  onClose,
  cleanViewMode = false
}: SmartEmailDetailPanelProps) => {
  // Router: decide quale vista usare
  if (cleanViewMode) {
    return (
      <SmartEmailDetailClean
        classifiedEmail={classifiedEmail}
        open={true}
        onClose={onClose}
      />
    );
  }

  return (
    <SmartEmailDetailIntelligent
      classifiedEmail={classifiedEmail}
      open={true}
      onClose={onClose}
    />
  );
};
