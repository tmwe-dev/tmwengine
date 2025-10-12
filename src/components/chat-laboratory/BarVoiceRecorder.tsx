import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Volume2 } from 'lucide-react';
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
  const [silenceCountdown, setSilenceCountdown] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const SILENCE_THRESHOLD = 0.05;  // Volume sotto questo = silenzio
  const SILENCE_DURATION = 3000;    // 3 secondi di silenzio prima di stop

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Monitor audio level for visual feedback + VAD
  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1); // Normalize 0-1
    setAudioLevel(normalizedLevel);

    // VAD: Voice Activity Detection
    if (normalizedLevel < SILENCE_THRESHOLD) {
      // Silenzio rilevato
      if (!silenceTimerRef.current && isRecording) {
        console.log('🔇 Silenzio rilevato, countdown 3s...');
        let countdown = 3;
        setSilenceCountdown(countdown);
        
        silenceTimerRef.current = setInterval(() => {
          countdown--;
          setSilenceCountdown(countdown);
          
          if (countdown <= 0) {
            console.log('⏹️ 3 secondi di silenzio → stop automatico');
            stopRecording();
          }
        }, 1000);
      }
    } else {
      // C'è audio → cancella timer silenzio
      if (silenceTimerRef.current) {
        console.log('🎤 Audio rilevato, cancello countdown');
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
        setSilenceCountdown(0);
      }
    }

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

    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setAudioLevel(0);
    setSilenceCountdown(0);
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
        console.log('🎤 Chunks totali raccolti:', chunksRef.current.length);
        console.log('🎤 Dimensione totale audio:', 
          chunksRef.current.reduce((acc, c) => acc + c.size, 0), 'bytes');
        
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
    <div className="flex flex-col items-center gap-2">
      {/* Modern PTT Button */}
      <Button
        variant={isRecording ? "destructive" : isProcessing ? "secondary" : "outline"}
        size="default"
        disabled={isDisabled || isProcessing}
        onClick={handleToggle}
        className={cn(
          "min-w-[180px] gap-2 transition-all",
          isRecording && "shadow-lg shadow-red-500/20",
          isProcessing && "opacity-70"
        )}
      >
        <Mic className={cn(
          "h-4 w-4",
          isRecording && "animate-pulse"
        )} />
        <span className="font-medium hidden sm:inline">
          {isProcessing ? "Elaborazione..." : 
           isRecording ? "Registrando..." : 
           "Premi per parlare"}
        </span>
      </Button>

      {/* Volume indicator - compatto sotto il bottone */}
      {isRecording && (
        <div className="flex items-center gap-2 w-full max-w-[180px]">
          <Volume2 className="h-3 w-3 text-amber-500 flex-shrink-0" />
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-100"
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
