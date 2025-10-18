import { Button } from '@/components/ui/button';
import { Mic, Volume2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface InteractiveMicrophoneButtonProps {
  mode: 'ptt' | 'hybrid';
  number: 1 | 2;
  conversationId: string | null;
  onTranscriptionComplete: (text: string) => void;
  isDisabled?: boolean;
  vadTimeout?: number;
}

export const InteractiveMicrophoneButton = ({
  mode,
  number,
  conversationId,
  onTranscriptionComplete,
  isDisabled = false,
  vadTimeout = 2
}: InteractiveMicrophoneButtonProps) => {
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

  const VAD_SILENCE_MS = vadTimeout * 1000;
  const VAD_THRESHOLD = 0.05;

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);
    setAudioLevel(normalizedLevel);

    if (mode === 'ptt') {
      if (normalizedLevel > VAD_THRESHOLD) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
          setSilenceCountdown(null);
        }
      } else {
        if (isRecording && !silenceTimerRef.current) {
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
            console.log('🎤 VAD: Silenzio rilevato → Auto-stop');
            clearInterval(countdownInterval);
            stopRecording();
          }, VAD_SILENCE_MS);
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  };

  const startRecording = async () => {
    if (!conversationId) {
      toast.error('Nessuna conversazione attiva');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      audioStreamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 48000 });
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
        await transcribeAudio();
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      monitorAudioLevel();

    } catch (error) {
      console.error('❌ Errore avvio registrazione:', error);
      toast.error('Impossibile accedere al microfono');
    }
  };

  const stopRecording = () => {
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
      console.warn('⚠️ Nessun audio da trascrivere');
      return;
    }

    const totalSize = audioChunksRef.current.reduce((acc, c) => acc + c.size, 0);
    if (totalSize < 1000) {
      console.warn('⚠️ Audio troppo corto (<1KB), skip trascrizione');
      audioChunksRef.current = [];
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

      const suspiciousTexts = [
        'sottotitoli creati',
        'amara.org',
        'community',
        'subtitles by',
      ];
      
      const isSuspicious = suspiciousTexts.some(text => 
        transcription.toLowerCase().includes(text.toLowerCase())
      );
      
      if (isSuspicious) {
        console.warn('⚠️ Trascrizione sospetta (watermark):', transcription);
        toast.error('Audio non riconosciuto. Riprova parlando più chiaramente');
        return;
      }

      if (transcription.trim()) {
        onTranscriptionComplete(transcription);
      }

    } catch (error) {
      console.error('❌ Errore trascrizione:', error);
      toast.error('Errore trascrizione');
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  const handleToggle = () => {
    if (isRecording) {
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

  const isPTT = mode === 'ptt';
  const isHybrid = mode === 'hybrid';

  return (
    <Button
      onClick={handleToggle}
      onMouseDown={isPTT ? startRecording : undefined}
      onMouseUp={isPTT ? stopRecording : undefined}
      onTouchStart={isPTT ? startRecording : undefined}
      onTouchEnd={isPTT ? stopRecording : undefined}
      variant={isRecording ? "default" : "outline"}
      size="sm"
      disabled={isDisabled || isProcessing || (isHybrid && true)}
      className={cn(
        "h-12 min-w-[4.5rem] px-2 transition-all relative",
        isDisabled || isHybrid ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        isRecording 
          ? "bg-primary text-primary-foreground border-primary" 
          : "bg-card/40 border-border/40 hover:bg-card hover:border-border"
      )}
      title={isHybrid ? "Coming Soon - Modalità ascolto continuo" : `PTT con VAD ${vadTimeout}s`}
    >
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] font-bold opacity-60">{number}</span>
        <div className="flex items-center gap-1">
          {isProcessing ? (
            <div className="animate-spin h-4 w-4">⏳</div>
          ) : (
            <Mic className={cn("h-4 w-4", isRecording && "animate-pulse")} />
          )}
        </div>
      </div>
      
      {isRecording && audioLevel > 0 && (
        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-secondary rounded-b-md overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${audioLevel * 100}%` }}
          />
        </div>
      )}
      
      {silenceCountdown !== null && (
        <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
          {silenceCountdown}
        </span>
      )}
    </Button>
  );
};
