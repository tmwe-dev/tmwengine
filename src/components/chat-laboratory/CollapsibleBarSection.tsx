import { useState, useEffect } from 'react';
import { BarModeToggle } from './BarModeToggle';
import { BarModeControls } from './BarModeControls';
import { KnowledgeBaseSelector } from './KnowledgeBaseSelector';
import { AudioModeSelector } from './AudioModeSelector';
import { AudioModeButtons, type AudioMode } from './AudioModeButtons';

interface CollapsibleBarSectionProps {
  conversationId: string | null;
  isBarMode: boolean;
  onBarModeToggle: (enabled: boolean) => void;
  onKBChange: (kb: string | null) => void;
  onTranscriptionComplete: (text: string) => void;
  isAISpeaking: boolean;
  audioMode?: AudioMode;
  onAudioModeChange?: (mode: AudioMode) => void;
  globalMaxWords?: number;
  onMaxWordsChange?: (value: number) => void;
}

export const CollapsibleBarSection = ({
  conversationId,
  isBarMode,
  onBarModeToggle,
  onKBChange,
  onTranscriptionComplete,
  isAISpeaking,
  audioMode,
  onAudioModeChange,
  globalMaxWords,
  onMaxWordsChange
}: CollapsibleBarSectionProps) => {

  return (
    <div className="space-y-2">
      {/* Prima riga: 4 bottoni modalità audio allineati a destra */}
      <div className="flex items-center justify-end">
        <AudioModeButtons onModeChange={(mode) => {
          console.log('🎤 AudioModeButtons: Mode changed to:', mode);
          console.log('📤 CollapsibleBarSection: Calling onAudioModeChange with:', mode);
          onAudioModeChange?.(mode);
        }} />
      </div>

      {/* Seconda riga: Toggle Bar Chat allineato a sinistra */}
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
          <AudioModeSelector 
            conversationId={conversationId}
            onTranscriptionComplete={onTranscriptionComplete}
            isAISpeaking={isAISpeaking}
            showOnlyRecorder={true}
            audioMode={audioMode || 'stable'}
          />
          
          <div className="flex justify-center">
            <BarModeControls 
              conversationId={conversationId}
              globalMaxWords={globalMaxWords}
              onMaxWordsChange={onMaxWordsChange}
            />
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
