import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mic, Settings, Volume2, CheckCircle2, AlertCircle } from 'lucide-react';

interface AudioSettings {
  default_mic_recorder: 'bar' | 'hybrid' | 'interactive';
  audio_quality_settings: {
    sample_rate: number;
    noise_suppression: boolean;
    echo_cancellation: boolean;
    auto_gain_control: boolean;
  };
}

export const AudioInputTab = () => {
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    default_mic_recorder: 'hybrid',
    audio_quality_settings: {
      sample_rate: 48000,
      noise_suppression: true,
      echo_cancellation: true,
      auto_gain_control: true,
    },
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkMicPermission();
    loadAudioSettings();
  }, []);

  const checkMicPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setMicPermission(result.state);

      result.onchange = () => {
        setMicPermission(result.state);
      };
    } catch (error) {
      console.error('Error checking mic permission:', error);
    }
  };

  const loadAudioSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('ai_communication_preferences')
        .select('default_mic_recorder, audio_quality_settings')
        .eq('user_id', user.id)
        .is('page_route', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setAudioSettings({
          default_mic_recorder: data.default_mic_recorder || 'hybrid',
          audio_quality_settings: data.audio_quality_settings || audioSettings.audio_quality_settings,
        });
      }
    } catch (error: any) {
      console.error('Error loading audio settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Utente non autenticato');
        return;
      }

      const { error } = await (supabase as any)
        .from('ai_communication_preferences')
        .upsert({
          user_id: user.id,
          page_route: null,
          default_mic_recorder: audioSettings.default_mic_recorder,
          audio_quality_settings: audioSettings.audio_quality_settings,
        }, {
          onConflict: 'user_id,page_route',
        });

      if (error) throw error;

      toast.success('✅ Impostazioni audio salvate');
    } catch (error: any) {
      console.error('Error saving audio settings:', error);
      toast.error('Errore nel salvataggio delle impostazioni');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestMicPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      toast.success('✅ Permesso microfono concesso');
      checkMicPermission();
    } catch (error) {
      console.error('Error requesting mic permission:', error);
      toast.error('Permesso microfono negato');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0">
          <div className="flex items-center gap-3">
            <Mic className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-2xl">Audio Input Settings</CardTitle>
              <CardDescription className="mt-1">
                Configura microfono, qualità audio e recorder predefinito per le modalità vocali
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Mic Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Stato Permessi Microfono
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={micPermission === 'granted' ? 'default' : 'destructive'}>
            {micPermission === 'granted' ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  ✅ Permesso microfono concesso. Le funzionalità vocali sono disponibili.
                </AlertDescription>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  ⚠️ Permesso microfono {micPermission === 'denied' ? 'negato' : 'non richiesto'}. 
                  Le funzionalità vocali non saranno disponibili.
                </AlertDescription>
              </>
            )}
          </Alert>

          {micPermission !== 'granted' && (
            <Button onClick={handleRequestMicPermission} variant="outline" className="w-full">
              <Mic className="h-4 w-4 mr-2" />
              Richiedi Permesso Microfono
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Recorder Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Impostazioni Recorder
          </CardTitle>
          <CardDescription>
            Scegli il recorder audio predefinito per le diverse modalità
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="default-recorder">Recorder Predefinito</Label>
            <Select
              value={audioSettings.default_mic_recorder}
              onValueChange={(value: 'bar' | 'hybrid' | 'interactive') =>
                setAudioSettings({ ...audioSettings, default_mic_recorder: value })
              }
            >
              <SelectTrigger id="default-recorder">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Bar</Badge>
                    <span>Ottimizzato per conversazioni continue</span>
                  </div>
                </SelectItem>
                <SelectItem value="hybrid">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Hybrid</Badge>
                    <span>Bilanciato tra qualità e latenza</span>
                  </div>
                </SelectItem>
                <SelectItem value="interactive">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Interactive</Badge>
                    <span>Bassa latenza per interazioni rapide</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Sample Rate</Label>
            <Select
              value={audioSettings.audio_quality_settings.sample_rate.toString()}
              onValueChange={(value) =>
                setAudioSettings({
                  ...audioSettings,
                  audio_quality_settings: {
                    ...audioSettings.audio_quality_settings,
                    sample_rate: parseInt(value),
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16000">16 kHz (Standard)</SelectItem>
                <SelectItem value="24000">24 kHz (Alta qualità)</SelectItem>
                <SelectItem value="48000">48 kHz (Professionale)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audio Processing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Elaborazione Audio</CardTitle>
          <CardDescription>
            Attiva/disattiva funzionalità di elaborazione audio in tempo reale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="noise-suppression">Noise Suppression</Label>
              <p className="text-sm text-muted-foreground">
                Riduce rumori di fondo ambientali
              </p>
            </div>
            <Switch
              id="noise-suppression"
              checked={audioSettings.audio_quality_settings.noise_suppression}
              onCheckedChange={(checked) =>
                setAudioSettings({
                  ...audioSettings,
                  audio_quality_settings: {
                    ...audioSettings.audio_quality_settings,
                    noise_suppression: checked,
                  },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="echo-cancellation">Echo Cancellation</Label>
              <p className="text-sm text-muted-foreground">
                Elimina eco e feedback audio
              </p>
            </div>
            <Switch
              id="echo-cancellation"
              checked={audioSettings.audio_quality_settings.echo_cancellation}
              onCheckedChange={(checked) =>
                setAudioSettings({
                  ...audioSettings,
                  audio_quality_settings: {
                    ...audioSettings.audio_quality_settings,
                    echo_cancellation: checked,
                  },
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-gain">Auto Gain Control</Label>
              <p className="text-sm text-muted-foreground">
                Normalizza automaticamente il volume
              </p>
            </div>
            <Switch
              id="auto-gain"
              checked={audioSettings.audio_quality_settings.auto_gain_control}
              onCheckedChange={(checked) =>
                setAudioSettings({
                  ...audioSettings,
                  audio_quality_settings: {
                    ...audioSettings.audio_quality_settings,
                    auto_gain_control: checked,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSaveSettings} disabled={saving || loading} className="w-full">
        {saving ? 'Salvataggio...' : 'Salva Impostazioni Audio'}
      </Button>
    </div>
  );
};
