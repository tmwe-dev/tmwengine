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
 * VARIANTE C: Hybrid Toggle ON/OFF + Smart VAD
 * 
 * UX Flow:
 * 1. User premi 🎤 → Toggle ON (microfono sempre attivo)
 * 2. VAD rileva voce → Inizia registrazione chunk
 * 3. VAD rileva silenzio 1.5s → Invio chunk + Riprendi ascolto
 * 4. User premi 🎤 di nuovo → Toggle OFF (stop completo)
 * 
 * Differenze vs Stable:
 * - Modalità "sempre in ascolto" (come ChatGPT Voice)
 * - Multi-chunk: ogni silenzio 1.5s = invio separato
 * - Stop solo se premi di nuovo
 */
export const BarVoiceRecorderV2_Hybrid = ({
  conversationId,
  onTranscriptionComplete,
  isDisabled = false
}: BarVoiceRecorderV2Props) => {
  const [isActive, setIsActive] = useState(false); // Microfono ON/OFF
  const [isRecordingChunk, setIsRecordingChunk] = useState(false); // Chunk corrente
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

  const VAD_SILENCE_MS = 1500;
  const VAD_THRESHOLD = 0.01;

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);
    setAudioLevel(normalizedLevel);

    // 🔥 VARIANTE C: Smart VAD - Rileva voce e avvia chunk
    if (normalizedLevel > VAD_THRESHOLD) {
      // Voce rilevata
      if (!isRecordingChunk && mediaRecorderRef.current?.state === 'inactive') {
        console.log('🎤 VAD: Voce rilevata → Avvio chunk');
        mediaRecorderRef.current?.start(1000);
        setIsRecordingChunk(true);
      }

      // Reset silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
        setSilenceCountdown(null);
      }
    } else {
      // Silenzio rilevato
      if (isRecordingChunk && !silenceTimerRef.current) {
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
          console.log('🎤 VAD: Silenzio 1.5s → Invio chunk');
          clearInterval(countdownInterval);
          stopCurrentChunk();
        }, VAD_SILENCE_MS);
      }
    }

    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  };

  const startListening = async () => {
    try {
      console.log('🎤 V2_Hybrid: Modalità ascolto attivata');
      
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

      // MediaRecorder in standby, parte quando VAD rileva voce
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
        console.log('🎤 V2_Hybrid: Chunk fermato → Trascrizione');
        await transcribeCurrentChunk();
        
        // 🔥 Riprendi ascolto se ancora attivo
        if (isActive && mediaRecorderRef.current?.state === 'inactive') {
          audioChunksRef.current = [];
          setIsRecordingChunk(false);
          console.log('🎤 V2_Hybrid: Torno in ascolto...');
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      setIsActive(true);

      monitorAudioLevel();

      toast({
        title: "🎤 Microfono attivo",
        description: "Parla liberamente. Auto-invio ogni pausa di 1.5s.",
      });

    } catch (error) {
      console.error('❌ Errore avvio ascolto:', error);
      toast({
        title: "❌ Errore",
        description: "Impossibile accedere al microfono",
        variant: "destructive",
      });
    }
  };

  const stopCurrentChunk = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const stopListening = () => {
    console.log('🎤 V2_Hybrid: Disattivazione completa');

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

    setIsActive(false);
    setIsRecordingChunk(false);
    setAudioLevel(0);
    setSilenceCountdown(null);
  };

  const transcribeCurrentChunk = async () => {
    if (audioChunksRef.current.length === 0) {
      console.warn('⚠️ Nessun chunk da trascrivere');
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
      console.log('✅ Trascrizione chunk:', transcription);

      if (transcription.trim()) {
        onTranscriptionComplete(transcription);
        toast({
          title: "✅ Messaggio inviato",
          description: transcription.substring(0, 50) + (transcription.length > 50 ? '...' : ''),
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
    }
  };

  const handleToggle = () => {
    if (isActive) {
      stopListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={isActive ? "destructive" : "default"}
        size="lg"
        onClick={handleToggle}
        disabled={isDisabled || isProcessing}
        className="relative"
      >
        {isProcessing ? (
          <div className="animate-spin">⏳</div>
        ) : (
          <Mic className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
        )}
        <span className="ml-2">
          {isProcessing ? 'Elaborazione...' : isActive ? 'Microfono ON' : 'Attiva Microfono'}
        </span>
      </Button>

      {isActive && (
        <div className="flex items-center gap-2">
          <Volume2 className={`h-4 w-4 ${isRecordingChunk ? 'text-red-500' : 'text-muted-foreground'}`} />
          <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
          {isRecordingChunk && silenceCountdown !== null && (
            <span className="text-sm font-mono text-muted-foreground">
              {silenceCountdown}s
            </span>
          )}
          {!isRecordingChunk && (
            <span className="text-xs text-muted-foreground">In ascolto...</span>
          )}
        </div>
      )}
    </div>
  );
};
