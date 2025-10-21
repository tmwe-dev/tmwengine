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
  vadTimeout?: number; // VAD timeout in seconds (1-5)
}

export const BarVoiceRecorder = ({ 
  conversationId, 
  onTranscriptionComplete,
  isDisabled = false,
  vadTimeout = 2
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
  const SILENCE_DURATION = vadTimeout * 1000;    // VAD timeout configurabile in millisecondi

  // ✅ FIX P3: Cleanup completo on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current);
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
      // Request microphone access - Upgrade a 48kHz
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,  // ✅ Upgrade da 24000 a 48000
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // Setup audio analyzer for volume visualization - Upgrade a 48kHz
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });  // ✅ Upgrade da 24000 a 48000
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 2048;  // ✅ Stesso valore di BarFullDuplexRecorder
      analyserRef.current.smoothingTimeConstant = 0.8;  // ✅ Aggiunto per coerenza
      
      monitorAudioLevel();

      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('📦 Chunk ricevuto, size:', event.data.size);
        console.log('📦 MediaRecorder state:', mediaRecorder.state);
        console.log('📦 Stream active:', stream.active);
        console.log('📦 Stream tracks:', stream.getTracks().map(t => ({ 
          kind: t.kind, 
          enabled: t.enabled, 
          muted: t.muted 
        })));
        
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('⏹️ Recording stopped, chunks totali:', chunksRef.current.length);
        // ⚡ Trascrizione ora viene avviata in stopRecording() subito dopo placeholder
      };

      mediaRecorder.start(1000); // Richiede chunks ogni 1s
      console.log('🎤 MediaRecorder.start() chiamato, stato:', mediaRecorder.state);
      setIsRecording(true);
      // toast({ title: "🍺 Microfono attivo - Parla pure!" });
    } catch (error) {
      console.error('Errore avvio registrazione:', error);
      // toast({ 
      //   title: "Errore microfono", 
      //   description: "Impossibile accedere al microfono",
      //   variant: "destructive" 
      // });
    }
  };

  const stopRecording = () => {
    // ⚡ NUOVO: Invia placeholder immediato PRIMA di qualsiasi cleanup
    console.log('⚡ [BarVoiceRecorder] Invio placeholder immediato per avvio rapido AI');
    onTranscriptionComplete('🎤 Trascrizione in corso...');

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

    // ⚡ NUOVO: Avvia trascrizione in background (non bloccante)
    transcribeAudioInBackground();
  };

  const transcribeAudioInBackground = async () => {
    console.log('🎤 Chunks totali raccolti:', chunksRef.current.length);
    console.log('🎤 Dimensione totale audio:', 
      chunksRef.current.reduce((acc, c) => acc + c.size, 0), 'bytes');
    
    if (chunksRef.current.length === 0) {
      console.log('⚠️ Nessun chunk audio, skip trascrizione');
      toast({ 
        title: "Nessun audio rilevato", 
        description: "Prova a parlare più vicino al microfono",
        variant: "destructive" 
      });
      return;
    }

    // Controlla dimensione totale
    const totalSize = chunksRef.current.reduce((acc, c) => acc + c.size, 0);
    if (totalSize < 1000) { // Meno di 1KB = probabilmente solo rumore
      console.log('⚠️ Audio troppo corto, skip trascrizione');
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
      
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Validazione base64
        if (!base64Audio || base64Audio.length < 100) {
          console.error('⚠️ Base64 audio troppo corto o vuoto');
          toast({ 
            title: "Errore audio", 
            description: "Audio non valido",
            variant: "destructive" 
          });
          setIsProcessing(false);
          chunksRef.current = [];
          return;
        }
        
        // Call voice-to-text edge function
        const { data, error } = await supabase.functions.invoke('voice-to-text', {
          body: { audio: base64Audio }
        });

        if (error) throw error;

        const transcribedText = data.text;
        
        // Filtra trascrizioni sospette (watermark)
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
          console.warn('⚠️ Trascrizione sospetta (watermark):', transcribedText);
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
        onTranscriptionComplete(transcribedText + '|||UPDATE|||');
        // toast({ title: "✓ Audio trascritto" });
      };

    } catch (error) {
      console.error('Errore trascrizione:', error);
      // toast({ 
      //   title: "Errore trascrizione", 
      //   description: "Impossibile trascrivere l'audio",
      //   variant: "destructive" 
      // });
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
