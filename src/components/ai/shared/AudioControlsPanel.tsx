/**
 * AudioControlsPanel - Wrapper riutilizzabile per AudioModeSelector
 * Integra PTT + Listen mode nella sidebar AI
 */

import { useState } from 'react';
import { AudioModeSelector, AudioMode } from '@/components/chat-laboratory/AudioModeSelector';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioControlsPanelProps {
  conversationId: string | null;
  onTranscription: (text: string) => void;
  isAISpeaking?: boolean;
  className?: string;
}

export const AudioControlsPanel = ({ 
  conversationId, 
  onTranscription,
  isAISpeaking = false,
  className
}: AudioControlsPanelProps) => {
  const [audioMode, setAudioMode] = useState<AudioMode>('stable');

  if (!conversationId) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Inizia una conversazione per usare l'audio
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Mode Indicator */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1">
          {audioMode === 'stable' ? (
            <>
              <Mic className="w-3 h-3" />
              PTT Mode
            </>
          ) : (
            <>
              <Headphones className="w-3 h-3" />
              Listen Mode
            </>
          )}
        </Badge>
      </div>

      {/* Audio Selector */}
      <AudioModeSelector
        conversationId={conversationId}
        onModeChange={setAudioMode}
        onTranscriptionComplete={onTranscription}
        isAISpeaking={isAISpeaking}
        audioMode={audioMode}
      />
    </div>
  );
};
