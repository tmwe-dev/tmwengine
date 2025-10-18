import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InteractiveMicrophoneButtonProps {
  mode: 'ptt' | 'hybrid';
  number: 1 | 2;
  label: string;
  icon: LucideIcon;
  conversationId: string | null;
  onTranscriptionComplete: (text: string) => void;
  isDisabled: boolean;
  isSelected: boolean;
  onSelect: () => void;
  vadTimeout?: number;
  description?: string;
}

const SILENCE_DURATION = 2000; // Base per PTT
const VAD_THRESHOLD = 0.01;
const VAD_SILENCE_MS = 1500; // Per HYBRID

export const InteractiveMicrophoneButton = ({
  mode,
  number,
  label,
  icon: Icon,
  conversationId,
  onTranscriptionComplete,
  isDisabled,
  isSelected,
  onSelect,
  vadTimeout = 2,
  description
}: InteractiveMicrophoneButtonProps) => {
  // Stati comuni
  const [isActive, setIsActive] = useState(false); // recording per PTT, listening per HYBRID
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceCountdown, setSilenceCountdown] = useState(0);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());

  // Cleanup al unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setSilenceCountdown(0);
  };

  // Monitoraggio audio level e VAD
  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = average / 255;
    setAudioLevel(normalizedLevel);

    // VAD - rileva silenzio
    if (normalizedLevel > VAD_THRESHOLD) {
      lastSpeechTimeRef.current = Date.now();
      setSilenceCountdown(0);
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    } else {
      const silenceDuration = Date.now() - lastSpeechTimeRef.current;
      const targetSilence = mode === 'ptt' ? vadTimeout * 1000 : VAD_SILENCE_MS;
      
      if (silenceDuration > 500 && !silenceTimerRef.current) {
        const remainingTime = Math.ceil((targetSilence - silenceDuration) / 1000);
        setSilenceCountdown(remainingTime > 0 ? remainingTime : 0);
        
        countdownIntervalRef.current = setInterval(() => {
          const currentSilence = Date.now() - lastSpeechTimeRef.current;
          const remaining = Math.ceil((targetSilence - currentSilence) / 1000);
          setSilenceCountdown(remaining > 0 ? remaining : 0);
        }, 100);

        silenceTimerRef.current = setTimeout(() => {
          if (mode === 'ptt') {
            stopRecording();
          } else {
            stopCurrentChunk();
          }
        }, targetSilence - silenceDuration);
      }
    }

    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  };

  // PTT: Start Recording
  const startRecording = async () => {
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

      streamRef.current = stream;
      audioChunksRef.current = [];

      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        transcribeAudio();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsActive(true);
      lastSpeechTimeRef.current = Date.now();
      monitorAudioLevel();

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Impossibile accedere al microfono');
    }
  };

  // PTT: Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    cleanup();
    setIsActive(false);
    setAudioLevel(0);
  };

  // HYBRID: Start Listening
  const startListening = async () => {
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

      streamRef.current = stream;
      audioChunksRef.current = [];

      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsActive(true);
      lastSpeechTimeRef.current = Date.now();
      monitorAudioLevel();

    } catch (error) {
      console.error('Error starting listening:', error);
      toast.error('Impossibile accedere al microfono');
    }
  };

  // HYBRID: Stop Current Chunk
  const stopCurrentChunk = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      
      await transcribeCurrentChunk();
      
      // Riavvia subito un nuovo chunk se ancora attivo
      if (isActive && streamRef.current) {
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(streamRef.current, {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 128000
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(100);
        lastSpeechTimeRef.current = Date.now();
      }
    }
  };

  // HYBRID: Stop Listening
  const stopListening = () => {
    cleanup();
    setIsActive(false);
    setAudioLevel(0);
  };

  // Trascrizione PTT
  const transcribeAudio = async () => {
    if (audioChunksRef.current.length === 0) return;

    setIsProcessing(true);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          throw new Error('Conversione audio fallita');
        }

        const { data, error } = await supabase.functions.invoke('voice-to-text', {
          body: { audio: base64Audio }
        });

        if (error) throw error;

        const transcribedText = data?.text?.trim() || '';
        
        // Filtra watermark comuni
        const suspiciousPatterns = [
          /grazie\s+per\s+aver\s+guardato/i,
          /sottotitoli\s+creati\s+dalla\s+comunit/i,
          /sottotitoli\s+fatti\s+dalla\s+comunit/i,
        ];

        const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(transcribedText));

        if (transcribedText && !isSuspicious) {
          onTranscriptionComplete(transcribedText);
        }
      };
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Errore durante la trascrizione');
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  // Trascrizione HYBRID
  const transcribeCurrentChunk = async () => {
    if (audioChunksRef.current.length === 0) return;

    setIsProcessing(true);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        if (!base64Audio) {
          throw new Error('Conversione audio fallita');
        }

        const { data, error } = await supabase.functions.invoke('voice-to-text', {
          body: { audio: base64Audio }
        });

        if (error) throw error;

        const transcribedText = data?.text?.trim() || '';
        
        if (transcribedText) {
          onTranscriptionComplete(transcribedText);
        }
      };
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Errore durante la trascrizione');
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  // Handler click principale
  const handleClick = () => {
    // Se non selezionato, prima seleziona
    if (!isSelected) {
      onSelect();
      return;
    }

    // Se già selezionato, toggle registrazione/ascolto
    if (mode === 'ptt') {
      if (isActive) {
        stopRecording(); // Ferma e invia subito
      } else {
        startRecording(); // Inizia con VAD
      }
    } else {
      // HYBRID
      if (isActive) {
        stopListening();
      } else {
        startListening();
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        onClick={handleClick}
        disabled={isDisabled || isProcessing}
        className={cn(
          "h-10 w-10 p-0 relative transition-all",
          isSelected && "ring-2 ring-primary ring-offset-2",
          isActive && mode === 'ptt' && "ring-2 ring-red-500 ring-offset-2 animate-pulse",
          isActive && mode === 'hybrid' && "ring-2 ring-green-500 ring-offset-2",
          !isSelected && "border-white/20 hover:border-white/40"
        )}
        title={description}
      >
        <span className="absolute -top-1 -right-1 bg-primary text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center text-primary-foreground z-10">
          {number}
        </span>
        <Icon className={cn(
          "h-4 w-4",
          isActive && mode === 'ptt' && "text-red-500",
          isActive && mode === 'hybrid' && "text-green-500",
          isProcessing && "animate-spin"
        )} />
      </Button>

      {/* Volume bar - solo quando attivo */}
      {isActive && (
        <div className="flex items-center gap-1 w-24">
          <Volume2 className="h-3 w-3 text-amber-500" />
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Countdown silenzio */}
      {silenceCountdown > 0 && (
        <div className="text-xs text-amber-600 font-medium">
          Invio tra {silenceCountdown}s...
        </div>
      )}
    </div>
  );
};
