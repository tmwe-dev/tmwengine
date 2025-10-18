import { BarModeToggle } from './BarModeToggle';
import { BarModeControls } from './BarModeControls';
import { KnowledgeBaseSelector } from './KnowledgeBaseSelector';

export type AudioMode = 'stable' | 'v2_hybrid';

interface CollapsibleBarSectionProps {
  conversationId: string | null;
  isBarMode: boolean;
  onBarModeToggle: (enabled: boolean) => void;
  onKBChange: (kb: string | null) => void;
  onTranscriptionComplete: (text: string) => void;
  isAISpeaking: boolean;
  audioMode?: AudioMode;
  onAudioModeChange?: (mode: AudioMode) => void;
}

export const CollapsibleBarSection = ({
  conversationId,
  isBarMode,
  onBarModeToggle,
  onKBChange,
  onTranscriptionComplete,
  isAISpeaking,
  audioMode,
  onAudioModeChange
}: CollapsibleBarSectionProps) => {

  return (
    <div className="space-y-2">
      {/* Toggle Bar Chat */}
      <div className="flex items-center justify-start">
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
