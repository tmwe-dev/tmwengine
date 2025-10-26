import { Switch } from '@/components/ui/switch';
import { Volume2, VolumeX } from 'lucide-react';
import { useAudioPreference } from '@/hooks/useAudioPreference';

interface RadioVoiceSelectorProps {
  conversationId: string | null;
  isAutoAdvanceEnabled?: boolean;
  onAutoAdvanceChange?: (enabled: boolean) => void;
}

export const RadioVoiceSelector = ({ 
  conversationId,
  isAutoAdvanceEnabled = true,
  onAutoAdvanceChange
}: RadioVoiceSelectorProps) => {
  const { isAudioEnabled, toggleAudio } = useAudioPreference();

  return (
    <div className="space-y-6 p-4">
      <h3 className="text-sm font-semibold text-foreground">Voice Settings</h3>
      
      {/* Audio Toggle - SEMPRE VISIBILE */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10">
        <div className="flex items-center gap-3">
          {isAudioEnabled ? (
            <Volume2 className="w-5 h-5 text-primary" />
          ) : (
            <VolumeX className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <div className="font-medium text-sm">Audio Lettura Messaggi</div>
            <div className="text-xs text-muted-foreground">
              {isAudioEnabled ? 'Attivo' : 'Disattivato'}
            </div>
          </div>
        </div>
        <Switch
          checked={isAudioEnabled}
          onCheckedChange={toggleAudio}
        />
      </div>

      {/* Auto-Advance Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/10">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 flex items-center justify-center">
            <span className="text-lg">⏭️</span>
          </div>
          <div>
            <div className="font-medium text-sm">Auto-Advance</div>
            <div className="text-xs text-muted-foreground">
              {isAutoAdvanceEnabled 
                ? 'Passa automaticamente al messaggio successivo' 
                : 'Navigazione manuale'}
            </div>
          </div>
        </div>
        <Switch
          checked={isAutoAdvanceEnabled}
          onCheckedChange={onAutoAdvanceChange}
        />
      </div>
    </div>
  );
};
