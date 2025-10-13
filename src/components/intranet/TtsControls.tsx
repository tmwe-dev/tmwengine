import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Label } from '@/components/ui/label';

export const TtsControls = () => {
  const { profile, updateProfile } = useUserProfile();
  
  const currentEngine = (profile as any)?.ttsEngine || 'native';
  const currentVoice = (profile as any)?.preferredElevenLabsVoice || 'Aria';

  const handleEngineChange = async (value: string) => {
    await updateProfile({ ttsEngine: value } as any);
  };

  const handleVoiceChange = async (value: string) => {
    await updateProfile({ preferredElevenLabsVoice: value } as any);
  };

  return (
    <div className="flex items-center gap-4 px-2 py-2 border-t border-border bg-muted/30">
      {/* TTS Engine */}
      <div className="flex items-center gap-2 flex-1">
        <Label htmlFor="tts-engine" className="text-xs whitespace-nowrap">
          🎙️ TTS:
        </Label>
        <Select value={currentEngine} onValueChange={handleEngineChange}>
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
      {currentEngine === 'elevenlabs' && (
        <div className="flex items-center gap-2 flex-1">
          <Label htmlFor="elevenlabs-voice" className="text-xs whitespace-nowrap">
            🔊 Voce:
          </Label>
          <Select value={currentVoice} onValueChange={handleVoiceChange}>
            <SelectTrigger id="elevenlabs-voice" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Aria">Aria (Multilingua)</SelectItem>
              <SelectItem value="Roger">Roger (EN)</SelectItem>
              <SelectItem value="Sarah">Sarah (EN)</SelectItem>
              <SelectItem value="Laura">Laura (EN)</SelectItem>
              <SelectItem value="Charlie">Charlie (EN)</SelectItem>
              <SelectItem value="George">George (EN)</SelectItem>
              <SelectItem value="Callum">Callum (EN)</SelectItem>
              <SelectItem value="River">River (EN)</SelectItem>
              <SelectItem value="Liam">Liam (EN)</SelectItem>
              <SelectItem value="Charlotte">Charlotte (EN)</SelectItem>
              <SelectItem value="Alice">Alice (EN)</SelectItem>
              <SelectItem value="Matilda">Matilda (EN)</SelectItem>
              <SelectItem value="Will">Will (EN)</SelectItem>
              <SelectItem value="Jessica">Jessica (EN)</SelectItem>
              <SelectItem value="Eric">Eric (EN)</SelectItem>
              <SelectItem value="Chris">Chris (EN)</SelectItem>
              <SelectItem value="Brian">Brian (EN)</SelectItem>
              <SelectItem value="Daniel">Daniel (ES)</SelectItem>
              <SelectItem value="Lily">Lily (FR)</SelectItem>
              <SelectItem value="Bill">Bill (EN)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
