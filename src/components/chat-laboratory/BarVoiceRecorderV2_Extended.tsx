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
 * VARIANTE B: Push-to-Talk Extended (ChatGPT-style)
 * 
 * UX Flow:
 * 1. User premi e TIENI 🎤 → Registrazione attiva
 * 2. User rilascia → VAD 1.5s inizia countdown
 * 3. Se continui a parlare → registrazione continua
 * 4. Se silenzio 1.5s → Invio + Stop
 * 
 * Differenze vs Stable:
 * - Press & Hold (non toggle)
 * - Rilascio trigger VAD, non stop immediato
 * - Continua se riprendi a parlare
 */
export const BarVoiceRecorderV2_Extended = ({
  conversationId,
  onTranscriptionComplete,
  isDisabled = false
}: BarVoiceRecorderV2Props) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [isHoldMode, setIsHoldMode] = useState(false); // true = tasto premuto

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const VAD_SILENCE_MS = 1500;
  const VAD_THRESHOLD = 0.01;

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);
    setAudioLevel(normalizedLevel);

    // 🔥 VARIANTE B: VAD solo se tasto rilasciato
    if (!isHoldMode) {
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
            console.log('🎤 VAD: Silenzio dopo rilascio → Auto-send');
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
    }

    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  };

  const startRecording = async () => {
    try {
      console.log('🎤 V2_Extended: Avvio registrazione (Press & Hold)');
      
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

      const audioContext = new AudioContext({ sampleRate: 24000 });
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;

      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

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
        console.log('🎤 V2_Extended: Registrazione fermata → Trascrizione');
        await transcribeAudio();
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      monitorAudioLevel();

      toast({
        title: "🎤 Registrazione attiva",
        description: "Rilascia per attivare VAD (1.5s silenzio)",
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
    console.log('🎤 V2_Extended: Stop registrazione');

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
    setIsHoldMode(false);
    setAudioLevel(0);
    setSilenceCountdown(null);
  };

  const transcribeAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      console.warn('⚠️ Nessun chunk audio');
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

      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { 
          audio: base64Audio,
          conversationId 
        }
      });

      if (error) throw error;

      const transcription = data.text || '';
      console.log('✅ Trascrizione:', transcription);

      if (transcription.trim()) {
        onTranscriptionComplete(transcription);
        toast({
          title: "✅ Messaggio inviato",
          description: transcription.substring(0, 50) + (transcription.length > 50 ? '...' : ''),
        });
      } else {
        toast({
          title: "⚠️ Nessuna voce rilevata",
        });
      }

    } catch (error) {
      console.error('❌ Errore trascrizione:', error);
      toast({
        title: "❌ Errore trascrizione",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  // 🔥 VARIANTE B: Press & Hold handlers
  const handleMouseDown = () => {
    if (!isDisabled && !isProcessing) {
      setIsHoldMode(true);
      startRecording();
    }
  };

  const handleMouseUp = () => {
    if (isRecording) {
      setIsHoldMode(false);
      // Non ferma immediatamente, lascia VAD decidere
      console.log('🎤 Tasto rilasciato → VAD attivo');
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
        🤚 Modalità: Press & Hold
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant={isRecording ? "destructive" : "default"}
          size="lg"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          disabled={isDisabled || isProcessing}
          className="relative"
          title="🎤 EXTENDED: TIENI PREMUTO per parlare. Rilascia quando finisci. Auto-invio dopo 1.5s silenzio."
        >
        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
          3
        </span>
        {isProcessing ? (
          <div className="animate-spin">⏳</div>
        ) : (
          <Mic className={`h-5 w-5 ${isRecording ? 'animate-pulse' : ''}`} />
        )}
        <span className="ml-2">
          {isProcessing ? 'Elaborazione...' : isHoldMode ? 'Tieni premuto' : isRecording ? 'Rilasciato (VAD attivo)' : 'Premi & Tieni'}
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
