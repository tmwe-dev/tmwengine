import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquareText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface IntranetVoiceToTextProps {
  onTranscriptionComplete: (text: string) => void;
  isDisabled?: boolean;
  vadTimeout?: number;
}

export function IntranetVoiceToText({
  onTranscriptionComplete,
  isDisabled = false,
  vadTimeout = 2000
}: IntranetVoiceToTextProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const normalizedLevel = Math.min(100, (average / 128) * 100);
      setAudioLevel(normalizedLevel);

      // Voice Activity Detection (VAD)
      const VAD_THRESHOLD = 10;
      if (normalizedLevel > VAD_THRESHOLD) {
        // Reset silence timer quando rileva voce
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        setSilenceCountdown(null);
        silenceTimerRef.current = null;
      } else if (!silenceTimerRef.current && isRecording) {
        // Start countdown quando inizia il silenzio
        const countdownSeconds = Math.ceil(vadTimeout / 1000);
        setSilenceCountdown(countdownSeconds);
        
        let remainingSeconds = countdownSeconds;
        countdownIntervalRef.current = setInterval(() => {
          remainingSeconds -= 1;
          setSilenceCountdown(remainingSeconds);
          if (remainingSeconds <= 0 && countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
        }, 1000);

        silenceTimerRef.current = setTimeout(() => {
          stopRecording();
        }, vadTimeout);
      }

      if (isRecording) {
        animationFrameRef.current = requestAnimationFrame(checkLevel);
      }
    };

    checkLevel();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        transcribeAudio();
      };

      mediaRecorder.start();
      setIsRecording(true);
      monitorAudioLevel();

      toast({
        title: '🎤 Registrazione avviata',
        description: 'Parla normalmente, la registrazione si fermerà automaticamente',
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile accedere al microfono',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setSilenceCountdown(null);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  const transcribeAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      toast({
        title: 'Errore',
        description: 'Nessun audio registrato',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const base64Data = base64Audio.split(',')[1];

        try {
          const { data, error } = await supabase.functions.invoke('voice-to-text', {
            body: { audio: base64Data }
          });

          if (error) throw error;

          if (data?.text) {
            onTranscriptionComplete(data.text + ' ');
            toast({
              title: '✅ Trascrizione completata',
            });
          }
        } catch (error) {
          console.error('Transcription error:', error);
          toast({
            title: 'Errore trascrizione',
            description: 'Impossibile trascrivere l\'audio',
            variant: 'destructive',
          });
        } finally {
          setIsProcessing(false);
          audioChunksRef.current = [];
        }
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante l\'elaborazione dell\'audio',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const handleToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="relative flex flex-col items-center gap-1">
      <Button
        size="icon"
        variant={isRecording ? "destructive" : "ghost"}
        onClick={handleToggle}
        disabled={isDisabled || isProcessing}
        title={isRecording ? "Ferma dettatura" : "Detta testo"}
      >
        <MessageSquareText className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
      </Button>

      {/* Indicatore livello audio */}
      {isRecording && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-destructive transition-all duration-100"
            style={{ width: `${audioLevel}%` }}
          />
        </div>
      )}

      {/* Countdown silenzio */}
      {silenceCountdown !== null && silenceCountdown > 0 && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">
          Invio tra {silenceCountdown}s...
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-primary whitespace-nowrap">
          Trascrizione...
        </div>
      )}
    </div>
  );
}
