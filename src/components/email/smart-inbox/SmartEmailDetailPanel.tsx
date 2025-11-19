import { SmartEmailDetailIntelligent } from './SmartEmailDetailIntelligent';
import { SmartEmailDetailClean } from './SmartEmailDetailClean';
import { ClassifiedEmail } from '@/types/smart-inbox';
import { ViewMode } from './ViewModeSelector';
import { EntitiesPanel } from './EntitiesPanel';

interface SmartEmailDetailPanelProps {
  classifiedEmail: ClassifiedEmail;
  onClose: () => void;
  viewMode?: ViewMode;
  currentIndex?: number;
  totalEmails?: number;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  cleanViewMode: boolean;
  onToggleCleanView: () => void;
}

export const SmartEmailDetailPanel = ({
  classifiedEmail,
  onClose,
  cleanViewMode,
  onToggleCleanView
}: SmartEmailDetailPanelProps) => {
  // Router: decide quale vista usare
  if (cleanViewMode) {
    return (
      <SmartEmailDetailClean
        classifiedEmail={classifiedEmail}
        onClose={onClose}
        onToggleCleanView={onToggleCleanView}
      />
    );
  }

  return (
    <div className="space-y-4">
      {classifiedEmail.email.email_id && (
        <EntitiesPanel emailId={classifiedEmail.email.email_id} />
      )}
      <SmartEmailDetailIntelligent
        classifiedEmail={classifiedEmail}
        onClose={onClose}
        onToggleCleanView={onToggleCleanView}
      />
    </div>
  );
};
