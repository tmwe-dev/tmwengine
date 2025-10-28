import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RadioVoiceRecorderProps {
  conversationId: string | null;
  onTranscriptionComplete: (text: string) => void;
  isDisabled?: boolean;
  vadTimeout?: number;
}

export const RadioVoiceRecorder = ({ 
  conversationId, 
  onTranscriptionComplete,
  isDisabled = false,
  vadTimeout = 2,
}: RadioVoiceRecorderProps) => {
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
  
  const SILENCE_THRESHOLD = 0.05;
  const SILENCE_DURATION = vadTimeout * 1000;

  useEffect(() => {
    return () => {
      stopRecording();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);
    setAudioLevel(normalizedLevel);

    if (normalizedLevel < SILENCE_THRESHOLD) {
      if (!silenceTimerRef.current && isRecording) {
        console.log('🔇 Silenzio rilevato, countdown...');
        let countdown = 3;
        setSilenceCountdown(countdown);
        
        silenceTimerRef.current = setInterval(() => {
          countdown--;
          setSilenceCountdown(countdown);
          
          if (countdown <= 0) {
            console.log('⏹️ Silenzio rilevato → stop automatico');
            stopRecording();
          }
        }, 1000);
      }
    } else {
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

      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      monitorAudioLevel();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('⏹️ Recording stopped');
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error('Errore avvio registrazione:', error);
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

    transcribeAudioInBackground();
  };

  const transcribeAudioInBackground = async () => {
    if (chunksRef.current.length === 0) {
      console.log('⚠️ Nessun chunk audio');
      return;
    }

    const totalSize = chunksRef.current.reduce((acc, c) => acc + c.size, 0);
    if (totalSize < 1000) {
      console.log('⚠️ Audio troppo corto');
      toast({ 
        title: "Audio troppo corto", 
        description: "Registra almeno 1 secondo di audio",
        variant: "destructive" 
      });
      chunksRef.current = [];
      return;
    }

    setIsProcessing(true);
    
    try {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        if (!base64Audio || base64Audio.length < 100) {
          console.error('⚠️ Base64 audio non valido');
          toast({ 
            title: "Errore audio", 
            description: "Audio non valido",
            variant: "destructive" 
          });
          setIsProcessing(false);
          chunksRef.current = [];
          return;
        }
        
        const { data, error } = await supabase.functions.invoke('voice-to-text', {
          body: { audio: base64Audio }
        });

        if (error) throw error;

        const transcribedText = data.text;
        
        const suspiciousTexts = [
          'sottotitoli creati',
          'amara.org',
          'community',
          'subtitles by',
        ];
        
        const isSuspicious = suspiciousTexts.some(text => 
          transcribedText.toLowerCase().includes(text.toLowerCase())
        );
        
        if (isSuspicious) {
          console.warn('⚠️ Trascrizione sospetta:', transcribedText);
          toast({ 
            title: "Audio non riconosciuto", 
            description: "Riprova parlando più chiaramente",
            variant: "destructive" 
          });
          setIsProcessing(false);
          chunksRef.current = [];
          return;
        }
        
        console.log('📝 Trascrizione valida:', transcribedText);
        onTranscriptionComplete(transcribedText);
      };

    } catch (error) {
      console.error('Errore trascrizione:', error);
    } finally {
      setIsProcessing(false);
      chunksRef.current = [];
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
    <div className="flex flex-col items-center gap-2">
      <Button
        variant={isRecording ? "destructive" : "default"}
        size="icon"
        disabled={isDisabled || isProcessing}
        onClick={handleToggle}
        className={cn(
          "h-10 w-10 rounded-full transition-all relative",
          isRecording && "shadow-lg shadow-red-500/20",
          isProcessing && "opacity-70"
        )}
      >
        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
          1
        </span>
        <Mic className={cn(
          "h-4 w-4",
          isRecording && "animate-pulse"
        )} />
      </Button>

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

      {silenceCountdown > 0 && (
        <div className="text-xs text-amber-600 font-medium">
          Invio tra {silenceCountdown}s...
        </div>
      )}
    </div>
  );
};
