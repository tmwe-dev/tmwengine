import { BarModeToggle } from './BarModeToggle';
import { BarModeControls } from './BarModeControls';
import { KnowledgeBaseSelector } from './KnowledgeBaseSelector';
import { AudioModeSelector } from './AudioModeSelector';

interface CollapsibleBarSectionProps {
  conversationId: string | null;
  isBarMode: boolean;
  onBarModeToggle: (enabled: boolean) => void;
  onKBChange: (kb: string | null) => void;
  onTranscriptionComplete: (text: string) => void;
  isAISpeaking: boolean;
}

export const CollapsibleBarSection = ({
  conversationId,
  isBarMode,
  onBarModeToggle,
  onKBChange,
  onTranscriptionComplete,
  isAISpeaking
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
          <AudioModeSelector 
            conversationId={conversationId}
            onTranscriptionComplete={onTranscriptionComplete}
            isAISpeaking={isAISpeaking}
          />
          
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
