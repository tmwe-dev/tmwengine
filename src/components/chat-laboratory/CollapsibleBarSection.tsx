import { BarModeToggle } from './BarModeToggle';
import { BarModeControls } from './BarModeControls';
import { KnowledgeBaseSelector } from './KnowledgeBaseSelector';

interface CollapsibleBarSectionProps {
  conversationId: string | null;
  isBarMode: boolean;
  onBarModeToggle: (enabled: boolean) => void;
  onKBChange: (kb: string | null) => void;
}

export const CollapsibleBarSection = ({
  conversationId,
  isBarMode,
  onBarModeToggle,
  onKBChange
}: CollapsibleBarSectionProps) => {

  return (
    <div>
      <div className="flex justify-center">
        <BarModeToggle
          conversationId={conversationId}
          isBarMode={isBarMode}
          onToggle={onBarModeToggle}
        />
      </div>

      {/* Bar Mode sempre aperto quando attivo */}
      {isBarMode && (
        <div className="space-y-3 mt-2">
          <div className="flex justify-center">
            <BarModeControls conversationId={conversationId} />
          </div>
          
          <div className="flex justify-center">
            <KnowledgeBaseSelector
              conversationId={conversationId}
              onKBChange={onKBChange}
            />
          </div>
        </div>
      )}
    </div>
  );
};
