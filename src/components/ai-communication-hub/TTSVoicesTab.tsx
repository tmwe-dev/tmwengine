import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Volume2, Play, CheckCircle2, RefreshCw, Search } from 'lucide-react';

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: {
    accent?: string;
    description?: string;
    age?: string;
    gender?: string;
    use_case?: string;
    language?: string;
  };
  preview_url?: string;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  it: '🇮🇹',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  pt: '🇵🇹',
  pl: '🇵🇱',
  nl: '🇳🇱',
  sv: '🇸🇪',
  cs: '🇨🇿',
  ar: '🇸🇦',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
  hi: '🇮🇳',
  ru: '🇷🇺',
};

export const TTSVoicesTab = () => {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [defaultVoiceId, setDefaultVoiceId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadVoices();
    loadDefaultVoice();
  }, []);

  const loadVoices = async () => {
    try {
      setLoading(true);

      // Fetch API key
      const { data: config } = await supabase
        .from('voice_agent_config')
        .select('elevenlabs_api_key')
        .eq('enabled', true)
        .single();

      if (!config?.elevenlabs_api_key) {
        toast.error('API Key ElevenLabs non configurata');
        return;
      }

      // Fetch voices from ElevenLabs API
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': config.elevenlabs_api_key,
        },
      });

      if (!response.ok) {
        throw new Error('Errore nel caricamento delle voci');
      }

      const data = await response.json();
      setVoices(data.voices || []);
    } catch (error: any) {
      console.error('Error loading voices:', error);
      toast.error('Errore nel caricamento delle voci ElevenLabs');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultVoice = async () => {
    try {
      const { data } = await supabase
        .from('voice_agent_config')
        .select('default_voice_id')
        .eq('enabled', true)
        .single();

      setDefaultVoiceId(data?.default_voice_id || '');
    } catch (error) {
      console.error('Error loading default voice:', error);
    }
  };

  const handleSetDefaultVoice = async (voiceId: string) => {
    try {
      const { error } = await supabase
        .from('voice_agent_config')
        .update({ default_voice_id: voiceId })
        .eq('enabled', true);

      if (error) throw error;

      setDefaultVoiceId(voiceId);
      toast.success('✅ Voce predefinita impostata');
    } catch (error: any) {
      console.error('Error setting default voice:', error);
      toast.error('Errore nell\'impostazione della voce predefinita');
    }
  };

  const handlePreviewVoice = async (voiceId: string, voiceName: string) => {
    try {
      setPlayingVoice(voiceId);

      const { data: config } = await supabase
        .from('voice_agent_config')
        .select('elevenlabs_api_key')
        .eq('enabled', true)
        .single();

      if (!config?.elevenlabs_api_key) {
        toast.error('API Key non configurata');
        return;
      }

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': config.elevenlabs_api_key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: `Ciao, sono ${voiceName}. Questa è una preview della mia voce.`,
            model_id: 'eleven_multilingual_v2',
          }),
        }
      );

      if (!response.ok) throw new Error('Errore nella generazione audio');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setPlayingVoice(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error: any) {
      console.error('Error previewing voice:', error);
      toast.error('Errore nella preview della voce');
      setPlayingVoice(null);
    }
  };

  const filteredVoices = voices.filter((voice) =>
    voice.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0">
          <div className="flex items-center gap-3">
            <Volume2 className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <CardTitle className="text-2xl">TTS Voices</CardTitle>
              <CardDescription className="mt-1">
                Gestisci e testa le voci Text-to-Speech di ElevenLabs
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadVoices} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Ricarica
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca voce per nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Badge variant="secondary">{filteredVoices.length} voci</Badge>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Caricamento voci ElevenLabs...
        </div>
      ) : filteredVoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {searchTerm
              ? 'Nessuna voce trovata con questo nome'
              : 'Nessuna voce disponibile. Verifica la configurazione API Key.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVoices.map((voice) => {
            const isDefault = voice.voice_id === defaultVoiceId;
            const isPlaying = playingVoice === voice.voice_id;
            const language = voice.labels?.language || 'en';
            const flag = LANGUAGE_FLAGS[language.toLowerCase()] || '';

            return (
              <Card
                key={voice.voice_id}
                className={`border transition-all ${
                  isDefault ? 'border-primary shadow-md' : 'border-border/50'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {flag && <span>{flag}</span>}
                        {voice.name}
                        {isDefault && (
                          <Badge variant="default" className="ml-auto">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </CardTitle>
                      {voice.labels?.description && (
                        <CardDescription className="mt-1 text-xs line-clamp-2">
                          {voice.labels.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {voice.labels?.gender && (
                      <Badge variant="outline" className="text-xs">
                        {voice.labels.gender}
                      </Badge>
                    )}
                    {voice.labels?.age && (
                      <Badge variant="outline" className="text-xs">
                        {voice.labels.age}
                      </Badge>
                    )}
                    {voice.labels?.accent && (
                      <Badge variant="outline" className="text-xs">
                        {voice.labels.accent}
                      </Badge>
                    )}
                    {voice.category && (
                      <Badge variant="secondary" className="text-xs">
                        {voice.category}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handlePreviewVoice(voice.voice_id, voice.name)}
                      disabled={isPlaying}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {isPlaying ? 'In riproduzione...' : 'Preview'}
                    </Button>
                    {!isDefault && (
                      <Button
                        size="sm"
                        onClick={() => handleSetDefaultVoice(voice.voice_id)}
                      >
                        Imposta
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
