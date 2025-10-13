import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
}

export const TtsControls = ({ 
  ttsEngine, 
  selectedVoice, 
  onEngineChange, 
  onVoiceChange,
  elevenLabsVoices = [],
  isLoadingVoices = false 
}: TtsControlsProps) => {

  return (
    <div className="flex items-center gap-4 px-2 py-2 border-t border-border bg-muted/30">
      {/* TTS Engine */}
      <div className="flex items-center gap-2 flex-1">
        <Label htmlFor="tts-engine" className="text-xs whitespace-nowrap">
          🎙️ TTS:
        </Label>
        <Select value={ttsEngine} onValueChange={onEngineChange}>
          <SelectTrigger id="tts-engine" className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="native">Browser (Gratuito)</SelectItem>
            <SelectItem value="elevenlabs">ElevenLabs (Premium)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ElevenLabs Voice (solo se engine è ElevenLabs) */}
      {ttsEngine === 'elevenlabs' && (
        <div className="flex items-center gap-2 flex-1">
          <Label htmlFor="elevenlabs-voice" className="text-xs whitespace-nowrap">
            🔊 Voce:
          </Label>
          <Select value={selectedVoice} onValueChange={onVoiceChange} disabled={isLoadingVoices}>
            <SelectTrigger id="elevenlabs-voice" className="h-8 text-xs">
              <SelectValue placeholder={isLoadingVoices ? "Caricamento..." : "Seleziona voce"} />
            </SelectTrigger>
            <SelectContent>
              {isLoadingVoices ? (
                <SelectItem value="loading" disabled>Caricamento voci...</SelectItem>
              ) : elevenLabsVoices.length > 0 ? (
                elevenLabsVoices.map(voice => (
                  <SelectItem key={voice.voice_id} value={voice.voice_id}>
                    {voice.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-voices" disabled>
                  Nessuna voce disponibile
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
