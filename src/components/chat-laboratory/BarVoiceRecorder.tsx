import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Beer, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BarVoiceRecorderProps {
  conversationId: string | null;
  onTranscriptionComplete: (text: string) => void;
  isDisabled?: boolean;
}

export const BarVoiceRecorder = ({ 
  conversationId, 
  onTranscriptionComplete,
  isDisabled = false
}: BarVoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Monitor audio level for visual feedback
  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(Math.min(average / 128, 1)); // Normalize 0-1

    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  };

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      streamRef.current = stream;

      // Setup audio analyzer for volume visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      monitorAudioLevel();

      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('📦 Chunk ricevuto, size:', event.data.size);
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('⏹️ Recording stopped, chunks totali:', chunksRef.current.length);
        await transcribeAudio();
      };

      mediaRecorder.start(1000); // Richiede chunks ogni 1s
      console.log('🎤 MediaRecorder.start() chiamato, stato:', mediaRecorder.state);
      setIsRecording(true);
      toast({ title: "🍺 Microfono attivo - Parla pure!" });
    } catch (error) {
      console.error('Errore avvio registrazione:', error);
      toast({ 
        title: "Errore microfono", 
        description: "Impossibile accedere al microfono",
        variant: "destructive" 
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setAudioLevel(0);
  };

  const transcribeAudio = async () => {
    if (chunksRef.current.length === 0) {
      toast({ title: "Nessun audio registrato", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    
    try {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Call voice-to-text edge function
        const { data, error } = await supabase.functions.invoke('voice-to-text', {
          body: { audio: base64Audio }
        });

        if (error) throw error;

        const transcribedText = data.text;
        console.log('📝 Trascrizione:', transcribedText);
        
        onTranscriptionComplete(transcribedText);
        toast({ title: "✓ Audio trascritto" });
      };

    } catch (error) {
      console.error('Errore trascrizione:', error);
      toast({ 
        title: "Errore trascrizione", 
        description: "Impossibile trascrivere l'audio",
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
      chunksRef.current = [];
    }
  };

  const handleToggle = () => {
    console.log('🍺 Toggle cliccato, isRecording:', isRecording);
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="relative">
      {/* Beer Button */}
      <Button
        variant={isRecording ? "destructive" : "outline"}
        size="lg"
        disabled={isDisabled || isProcessing}
        onClick={handleToggle}
        className={cn(
          "h-16 w-16 rounded-full transition-all relative",
          isRecording && "animate-pulse scale-110 shadow-lg",
          isProcessing && "opacity-50 cursor-wait"
        )}
      >
        <Beer className={cn(
          "h-8 w-8 transition-colors",
          !isRecording && !isProcessing && "text-muted-foreground",
          isRecording && !isProcessing && "text-amber-500",
          isProcessing && "text-red-500"
        )} />
        
        {/* Foam bubbles animation quando attivo */}
        {isRecording && !isProcessing && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1 animate-bounce">
            <div className="w-2 h-2 bg-white rounded-full opacity-80" />
            <div className="w-2 h-2 bg-white rounded-full opacity-80" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-white rounded-full opacity-80" style={{ animationDelay: '0.2s' }} />
          </div>
        )}
      </Button>

      {/* Volume indicator */}
      {isRecording && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1">
          <Volume2 className="h-3 w-3 text-amber-500" />
          <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-100"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Status text */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">
        {isProcessing ? "Elaborazione..." : isRecording ? "Registrazione..." : "Premi per parlare"}
      </div>
    </div>
  );
};
