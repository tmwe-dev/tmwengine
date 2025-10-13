import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { Mic, MicOff, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VoiceRecorderRef {
  stopAndTranscribe: () => Promise<void>;
}

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  onRecordingStateChange?: (state: 'idle' | 'recording' | 'paused' | 'processing') => void;
  vadThreshold?: number; // Milliseconds of silence before auto-stop (default: 3000)
  conversationId?: string; // To fetch VAD setting from DB
}

export const VoiceRecorder = forwardRef<VoiceRecorderRef, VoiceRecorderProps>(
  ({ onTranscription, onRecordingStateChange, vadThreshold: propVadThreshold, conversationId }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
    const [vadThreshold, setVadThreshold] = useState(propVadThreshold || 3000);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const silenceTimerRef = useRef<number | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Fetch VAD threshold from database if conversationId provided
    useEffect(() => {
      if (conversationId) {
        supabase
          .from('chat_laboratory_conversations')
          .select('vad_silence_duration')
          .eq('id', conversationId)
          .single()
          .then(({ data }) => {
            if (data?.vad_silence_duration) {
              setVadThreshold(data.vad_silence_duration);
            }
          });
      }
    }, [conversationId]);

    const cleanupStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setSilenceCountdown(null);
    };

    // Monitor audio level and detect silence
    const monitorAudioLevel = () => {
      if (!analyserRef.current) return;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const normalizedLevel = Math.min(100, (average / 128) * 100);
      setAudioLevel(normalizedLevel);

      // Voice Activity Detection (VAD)
      const SILENCE_THRESHOLD = 5; // Volume below this is considered silence
      const isSilent = normalizedLevel < SILENCE_THRESHOLD;

      if (isSilent) {
        if (!silenceTimerRef.current) {
          // Start silence countdown
          const remainingMs = vadThreshold;
          setSilenceCountdown(Math.ceil(remainingMs / 1000));
          
          silenceTimerRef.current = window.setTimeout(() => {
            console.log('🔇 VAD: Silence detected for', vadThreshold, 'ms - auto-stopping');
            stopRecording();
          }, vadThreshold);

          // Update countdown every second
          const countdownInterval = setInterval(() => {
            setSilenceCountdown(prev => {
              if (prev === null || prev <= 1) {
                clearInterval(countdownInterval);
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } else {
        // Voice detected - reset silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
          setSilenceCountdown(null);
        }
      }

      // Continue monitoring
      if (isRecording && !isPaused) {
        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
      }
    };

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        // Setup audio analysis for VAD
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);
        
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await transcribeAudio(audioBlob);
          cleanupStream();
        };

        mediaRecorder.start();
        setIsRecording(true);
        setIsPaused(false);
        onRecordingStateChange?.('recording');
        
        // Start audio monitoring
        monitorAudioLevel();
        
        toast.success("Registrazione avviata");
      } catch (error) {
        console.error('Error starting recording:', error);
        toast.error("Errore nell'avvio della registrazione");
      }
    };

    const pauseRecording = () => {
      if (mediaRecorderRef.current && isRecording && !isPaused) {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        onRecordingStateChange?.('paused');
        toast.info("Registrazione in pausa");
      }
    };

    const resumeRecording = () => {
      if (mediaRecorderRef.current && isRecording && isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        onRecordingStateChange?.('recording');
        toast.success("Registrazione ripresa");
      }
    };

    const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setIsPaused(false);
        onRecordingStateChange?.('processing');
      }
    };

    const stopAndTranscribe = async () => {
      if (mediaRecorderRef.current && isRecording) {
        stopRecording();
      }
    };

    useImperativeHandle(ref, () => ({
      stopAndTranscribe
    }));

    // Cleanup al unmount del componente
    useEffect(() => {
      return () => {
        cleanupStream();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      };
    }, []);

    const transcribeAudio = async (audioBlob: Blob) => {
      setIsProcessing(true);
      onRecordingStateChange?.('processing');

      try {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        
        const base64Audio = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
        });

        const { data, error } = await supabase.functions.invoke('voice-to-text', {
          body: { audio: base64Audio }
        });

        if (error) throw error;

        onTranscription(data.text);
        onRecordingStateChange?.('idle');
        toast.success("Trascrizione completata");
      } catch (error) {
        console.error('Error transcribing audio:', error);
        onRecordingStateChange?.('idle');
        toast.error("Errore nella trascrizione audio");
      } finally {
        setIsProcessing(false);
      }
    };

    const toggleRecording = () => {
      if (!isRecording) {
        startRecording();
      } else if (isPaused) {
        resumeRecording();
      } else {
        pauseRecording();
      }
    };

    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant={isRecording ? (isPaused ? "secondary" : "destructive") : "outline"}
          onClick={toggleRecording}
          disabled={isProcessing}
          className="h-auto px-3 md:px-4 shrink-0"
        >
          {isRecording ? (
            isPaused ? (
              <Mic className="h-4 w-4 md:h-5 md:w-5" />
            ) : (
              <Pause className="h-4 w-4 md:h-5 md:w-5" />
            )
          ) : (
            <Mic className="h-4 w-4 md:h-5 md:w-5" />
          )}
        </Button>
        
        {isRecording && (
          <>
            <Badge variant={isPaused ? "secondary" : "destructive"} className={isPaused ? "" : "animate-pulse"}>
              {isPaused ? "⏸️ Pausa" : "🔴 Registrazione"}
            </Badge>
            
            {!isPaused && (
              <div className="flex items-center gap-2">
                {/* Volume indicator */}
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-100"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
                
                {/* Silence countdown */}
                {silenceCountdown !== null && (
                  <Badge variant="outline" className="text-xs">
                    🔇 {silenceCountdown}s
                  </Badge>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);

VoiceRecorder.displayName = "VoiceRecorder";
