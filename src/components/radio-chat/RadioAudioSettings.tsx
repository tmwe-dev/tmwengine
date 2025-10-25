import { useState } from 'react';
import { Mic, Volume2, VolumeX } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { VoiceRecorder } from '@/components/chat-laboratory/VoiceRecorder';

interface RadioAudioSettingsProps {
  onVoiceInput?: (transcription: string) => void;
}

export function RadioAudioSettings({ onVoiceInput }: RadioAudioSettingsProps) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(false);

  const handleTranscriptionComplete = (transcription: string) => {
    if (onVoiceInput) {
      onVoiceInput(transcription);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Audio Output Toggle */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          Audio Output
        </Label>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Enable audio playback for AI responses
          </span>
          <Switch 
            checked={audioEnabled} 
            onCheckedChange={setAudioEnabled}
          />
        </div>
      </div>

      {/* Microphone Toggle */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Mic className="w-4 h-4" />
          Microphone Input
        </Label>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Enable voice input via microphone
          </span>
          <Switch 
            checked={micEnabled} 
            onCheckedChange={setMicEnabled}
          />
        </div>
      </div>

      {/* Voice Recorder */}
      {micEnabled && (
        <div className="pt-4 border-t">
          <VoiceRecorder 
            onTranscriptionComplete={handleTranscriptionComplete}
            isActive={micEnabled}
            onActiveChange={setMicEnabled}
          />
        </div>
      )}
    </div>
  );
}