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
}

export const VoiceRecorder = forwardRef<VoiceRecorderRef, VoiceRecorderProps>(
  ({ onTranscription, onRecordingStateChange }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const cleanupStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
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
          <Badge variant={isPaused ? "secondary" : "destructive"} className={isPaused ? "" : "animate-pulse"}>
            {isPaused ? "⏸️ Pausa" : "🔴 Registrazione"}
          </Badge>
        )}
      </div>
    );
  }
);

VoiceRecorder.displayName = "VoiceRecorder";
