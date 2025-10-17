import { Button } from '@/components/ui/button';
import { Mic, Volume2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BarVoiceRecorderV2Props {
  conversationId: string;
  onTranscriptionComplete: (text: string) => void;
  isDisabled?: boolean;
}

/**
 * VARIANTE A: VAD Continuo + Auto-Send
 * 
 * UX Flow:
 * 1. User premi 🎤 → Inizia registrazione continua
 * 2. VAD rileva silenzio 1.5s → Invio automatico + Stop
 * 3. User può premere di nuovo 🎤 durante registrazione → Stop manuale immediato
 * 
 * Differenze vs Stable:
 * - VAD_SILENCE_MS: 3000 → 1500
 * - Toggle ON/OFF (non push-to-talk)
 * - Auto-stop dopo VAD send
 */
export const BarVoiceRecorderV2_Continuous = ({
  conversationId,
  onTranscriptionComplete,
  isDisabled = false
}: BarVoiceRecorderV2Props) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 🔥 VARIANTE A: VAD ridotto a 1.5s
  const VAD_SILENCE_MS = 1500;
  const VAD_THRESHOLD = 0.01;

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);
    setAudioLevel(normalizedLevel);

    // VAD: Rileva silenzio
    if (normalizedLevel < VAD_THRESHOLD) {
      if (!silenceTimerRef.current) {
        const startTime = Date.now();
        
        const countdownInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = Math.ceil((VAD_SILENCE_MS - elapsed) / 1000);
          
          if (remaining > 0) {
            setSilenceCountdown(remaining);
          } else {
            setSilenceCountdown(null);
            clearInterval(countdownInterval);
          }
        }, 100);

        silenceTimerRef.current = setTimeout(() => {
          console.log('🎤 VAD: Silenzio rilevato → Auto-send');
          clearInterval(countdownInterval);
          stopRecording();
        }, VAD_SILENCE_MS);
      }
    } else {
      // Reset VAD se rileva voce
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
        setSilenceCountdown(null);
      }
    }

    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  };

  const startRecording = async () => {
    try {
      console.log('🎤 V2_Continuous: Avvio registrazione continua');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      audioStreamRef.current = stream;

      // Setup audio analysis
      const audioContext = new AudioContext({ sampleRate: 24000 });
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;

      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🎤 V2_Continuous: Registrazione fermata → Invio trascrizione');
        await transcribeAudio();
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      monitorAudioLevel();

      toast({
        title: "🎤 Registrazione attiva",
        description: "Parla liberamente. Stop automatico dopo 1.5s silenzio.",
      });

    } catch (error) {
      console.error('❌ Errore avvio registrazione:', error);
      toast({
        title: "❌ Errore",
        description: "Impossibile accedere al microfono",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    console.log('🎤 V2_Continuous: Stop registrazione');

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setAudioLevel(0);
    setSilenceCountdown(null);
  };

  const transcribeAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      console.warn('⚠️ Nessun chunk audio da trascrivere');
      return;
    }

    setIsProcessing(true);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      console.log('🎤 Invio audio a voice-to-text...');

      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { 
          audio: base64Audio,
          conversationId 
        }
      });

      if (error) throw error;

      const transcription = data.text || '';
      console.log('✅ Trascrizione ricevuta:', transcription);

      if (transcription.trim()) {
        onTranscriptionComplete(transcription);
        toast({
          title: "✅ Messaggio inviato",
          description: transcription.substring(0, 50) + (transcription.length > 50 ? '...' : ''),
        });
      } else {
        toast({
          title: "⚠️ Nessuna voce rilevata",
          description: "Riprova a parlare più chiaramente",
        });
      }

    } catch (error) {
      console.error('❌ Errore trascrizione:', error);
      toast({
        title: "❌ Errore trascrizione",
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  const handleToggle = () => {
    if (isRecording) {
      // 🔥 VARIANTE A: Premere durante registrazione = Stop manuale
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Indicatore modalità */}
      <div className="text-xs text-muted-foreground">
        ⚡ Modalità: Auto-stop silenzio
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant={isRecording ? "destructive" : "default"}
          size="lg"
          onClick={handleToggle}
          disabled={isDisabled || isProcessing}
          className="relative"
          title="🎤 CONTINUOUS: Premi per iniziare. Stop automatico dopo 1.5s silenzio. Ripremi per fermare manualmente."
        >
        {isProcessing ? (
          <div className="animate-spin">⏳</div>
        ) : (
          <Mic className={`h-5 w-5 ${isRecording ? 'animate-pulse' : ''}`} />
        )}
        <span className="ml-2">
          {isProcessing ? 'Elaborazione...' : isRecording ? 'Stop' : 'Parla'}
        </span>
      </Button>

      {isRecording && (
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
          {silenceCountdown !== null && (
            <span className="text-sm font-mono text-muted-foreground">
              {silenceCountdown}s
            </span>
          )}
        </div>
      )}
      </div>
    </div>
  );
};
