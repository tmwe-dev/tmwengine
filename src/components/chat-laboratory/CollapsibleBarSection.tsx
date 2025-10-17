import { BarModeToggle } from './BarModeToggle';
import { BarModeControls } from './BarModeControls';
import { KnowledgeBaseSelector } from './KnowledgeBaseSelector';
import { AudioModeSelector } from './AudioModeSelector';
import { AudioModeButtons } from './AudioModeButtons';

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
      {/* Riga unica: Toggle Bar Chat a sinistra + 4 bottoni modalità a destra */}
      <div className="flex items-center justify-between gap-3">
        <BarModeToggle
          conversationId={conversationId}
          isBarMode={isBarMode}
          onToggle={onBarModeToggle}
        />
        
        <AudioModeButtons />
      </div>

      {/* Bar Mode sempre aperto quando attivo */}
      {isBarMode && (
        <div className="space-y-3 mt-2">
          <AudioModeSelector 
            conversationId={conversationId}
            onTranscriptionComplete={onTranscriptionComplete}
            isAISpeaking={isAISpeaking}
            showOnlyRecorder={true}
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
