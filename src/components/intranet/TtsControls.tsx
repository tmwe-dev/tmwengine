import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { VideoCallButton } from './VideoCallButton';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
}

interface TtsControlsProps {
  ttsEngine: string;
  selectedVoice: string;
  onEngineChange: (value: string) => void;
  onVoiceChange: (value: string) => void;
  elevenLabsVoices?: ElevenLabsVoice[];
  isLoadingVoices?: boolean;
  roomId?: string;
  roomName?: string;
}

export const TtsControls = ({ 
  ttsEngine, 
  selectedVoice, 
  onEngineChange, 
  onVoiceChange,
  elevenLabsVoices = [],
  isLoadingVoices = false,
  roomId,
  roomName
}: TtsControlsProps) => {

  return (
    <div className="flex items-center gap-2 px-2 py-1 border-t border-border bg-muted/30">
      {/* TTS Engine - compatto */}
      <div className="flex items-center gap-1">
        <Label htmlFor="tts-engine" className="text-[10px] whitespace-nowrap">
          🎙️
        </Label>
        <Select value={ttsEngine} onValueChange={onEngineChange}>
          <SelectTrigger id="tts-engine" className="h-7 text-[10px] w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="native">Browser</SelectItem>
            <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ElevenLabs Voice - compatto */}
      {ttsEngine === 'elevenlabs' && (
        <div className="flex items-center gap-1">
          <Label htmlFor="elevenlabs-voice" className="text-[10px] whitespace-nowrap">
            🔊
          </Label>
          <Select value={selectedVoice} onValueChange={onVoiceChange} disabled={isLoadingVoices}>
            <SelectTrigger id="elevenlabs-voice" className="h-7 text-[10px] w-[120px]">
              <SelectValue placeholder={isLoadingVoices ? "..." : "Voce"} />
            </SelectTrigger>
            <SelectContent>
              {isLoadingVoices ? (
                <SelectItem value="loading" disabled>Caricamento...</SelectItem>
              ) : elevenLabsVoices.length > 0 ? (
                elevenLabsVoices.map(voice => (
                  <SelectItem key={voice.voice_id} value={voice.voice_id}>
                    {voice.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-voices" disabled>
                  Nessuna voce
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Video Call Button a destra */}
      {roomId && roomName && (
        <div className="ml-auto">
          <VideoCallButton 
            roomId={roomId} 
            roomName={roomName}
          />
        </div>
      )}
    </div>
  );
};
