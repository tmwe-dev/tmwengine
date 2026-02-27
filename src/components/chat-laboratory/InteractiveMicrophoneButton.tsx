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
  onStatusChange?: (status: { isActive: boolean; audioLevel: number; silenceCountdown: number }) => void;
}

const SILENCE_DURATION = 2000;
const VAD_THRESHOLD = 0.01;
const VAD_SILENCE_MS = 1500;

// Watermark patterns to filter out
const SUSPICIOUS_PATTERNS = [
  /grazie\s+per\s+aver\s+guardato/i,
  /sottotitoli\s+creati\s+dalla\s+comunit/i,
  /sottotitoli\s+fatti\s+dalla\s+comunit/i,
];

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
  description,
  onStatusChange
}: InteractiveMicrophoneButtonProps) => {
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceCountdown, setSilenceCountdown] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const isActiveRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({ isActive, audioLevel, silenceCountdown });
    }
  }, [isActive, audioLevel, silenceCountdown, onStatusChange]);

  useEffect(() => {
    return () => cleanup();
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

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = average / 255;
    setAudioLevel(normalizedLevel);

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

  // ✅ Helper: convert blob to base64 via Promise (no callback race)
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result?.toString().split(',')[1];
        if (base64) resolve(base64);
        else reject(new Error('Conversione audio fallita'));
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  };

  // ✅ Unified transcription function
  const transcribeChunks = async (chunks: Blob[], filterWatermarks: boolean = true) => {
    if (chunks.length === 0) return;

    setIsProcessing(true);
    try {
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      const base64Audio = await blobToBase64(audioBlob);

      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (error) throw error;

      const transcribedText = data?.text?.trim() || '';

      if (filterWatermarks) {
        const isSuspicious = SUSPICIOUS_PATTERNS.some(p => p.test(transcribedText));
        if (transcribedText && !isSuspicious) {
          onTranscriptionComplete(transcribedText);
        }
      } else {
        if (transcribedText) {
          onTranscriptionComplete(transcribedText);
        }
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Errore durante la trascrizione');
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Unified: start audio capture (shared between PTT and HYBRID)
  const startCapture = async (onStopCallback?: () => void) => {
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

      if (onStopCallback) {
        mediaRecorder.onstop = onStopCallback;
      }

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsActive(true);
      lastSpeechTimeRef.current = Date.now();
      monitorAudioLevel();
    } catch (error) {
      console.error('Error starting capture:', error);
      toast.error('Impossibile accedere al microfono');
    }
  };

  // PTT: Start Recording
  const startRecording = () => {
    startCapture(() => {
      // onstop callback: transcribe with watermark filter
      const chunks = [...audioChunksRef.current];
      audioChunksRef.current = [];
      transcribeChunks(chunks, true);
    });
  };

  // PTT: Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop(); // triggers onstop → transcribeChunks
    }
    cleanup();
    setIsActive(false);
    setAudioLevel(0);
  };

  // HYBRID: Start Listening
  const startListening = () => {
    startCapture(); // no onstop callback for hybrid
  };

  // ✅ HYBRID: Stop Current Chunk - wait for onstop before transcribing
  const stopCurrentChunk = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      const recorder = mediaRecorderRef.current;
      
      // Wait for onstop event before transcribing
      recorder.onstop = async () => {
        const chunks = [...audioChunksRef.current];
        audioChunksRef.current = [];
        
        // Transcribe without watermark filter for hybrid chunks
        await transcribeChunks(chunks, false);

        // Restart a new chunk if still active
        if (isActiveRef.current && streamRef.current) {
          const newRecorder = new MediaRecorder(streamRef.current, {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 128000
          });

          newRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          mediaRecorderRef.current = newRecorder;
          newRecorder.start(100);
          lastSpeechTimeRef.current = Date.now();
        }
      };

      recorder.stop();
    }
  };

  // HYBRID: Stop Listening
  const stopListening = () => {
    cleanup();
    setIsActive(false);
    setAudioLevel(0);
  };

  const handleClick = () => {
    if (!isSelected) {
      onSelect();
    }

    if (mode === 'ptt') {
      if (isActive) stopRecording();
      else startRecording();
    } else {
      if (isActive) stopListening();
      else startListening();
    }
  };

  return (
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
  );
};
