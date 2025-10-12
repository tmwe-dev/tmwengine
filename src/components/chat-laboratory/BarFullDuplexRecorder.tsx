import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BarFullDuplexRecorderProps {
  conversationId: string | null;
  onTranscriptionComplete?: (text: string) => void;
  isDisabled?: boolean;
  isAISpeaking?: boolean;
}

export const BarFullDuplexRecorder = ({ 
  conversationId, 
  onTranscriptionComplete,
  isDisabled = false,
  isAISpeaking = false
}: BarFullDuplexRecorderProps) => {
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const vadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  
  const { toast } = useToast();

  // VAD Configuration - stessi valori del microfono funzionante
  const SILENCE_THRESHOLD = 0.05; // Soglia per rilevare silenzio
  const SILENCE_DURATION = 3000; // 3 secondi di silenzio = fine frase

  useEffect(() => {
    return () => {
      stopFullDuplex();
    };
  }, []);

  // Echo Cancellation Setup
  const setupAudioContext = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true, // ✅ AEC - Cancellazione eco
          noiseSuppression: true, // ✅ Riduci rumore di fondo
          autoGainControl: true,  // ✅ Normalizza volume
        }
      });

      audioStreamRef.current = stream;

      // Setup Audio Analysis per VAD
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);
      analyserRef.current = analyser;

      // Setup MediaRecorder - stessa configurazione del microfono funzionante
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Chunk ogni secondo come il microfono funzionante

      // Start VAD monitoring
      startVADMonitoring();

      return true;
    } catch (error) {
      console.error('Errore accesso microfono:', error);
      toast({
        variant: "destructive",
        title: "Errore Microfono",
        description: "Impossibile accedere al microfono. Verifica i permessi.",
      });
      return false;
    }
  };

  // Voice Activity Detection - stessa logica del microfono funzionante
  const startVADMonitoring = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const detectVoice = () => {
      if (!isActive) return;

      analyser.getByteFrequencyData(dataArray);
      
      // Calcola livello audio (RMS)
      const sum = dataArray.reduce((acc, val) => acc + val * val, 0);
      const rms = Math.sqrt(sum / dataArray.length) / 255;
      
      setAudioLevel(rms);

      // VAD Logic - semplificata come il microfono funzionante
      if (rms > SILENCE_THRESHOLD) {
        // 🗣️ Parlato rilevato
        setIsSpeaking(true);
        silenceStartRef.current = null;
      } else {
        // 🤫 Silenzio rilevato
        if (isSpeaking) {
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          }

          const silenceDuration = Date.now() - silenceStartRef.current;
          
          if (silenceDuration >= SILENCE_DURATION) {
            // Fine frase → Invia trascrizione
            console.log('🎤 Fine parlato rilevato dopo 3s di silenzio, invio trascrizione...');
            processRecording();
            setIsSpeaking(false);
            silenceStartRef.current = null;
          }
        }
      }

      requestAnimationFrame(detectVoice);
    };

    detectVoice();
  };

  const processRecording = async () => {
    if (chunksRef.current.length === 0 || isProcessing) return;

    // Crea copia dei chunks prima di inviare
    const chunksToProcess = [...chunksRef.current];
    chunksRef.current = []; // Svuota per continuare a registrare
    
    setIsProcessing(true);

    try {
      const audioBlob = new Blob(chunksToProcess, { type: 'audio/webm' });

      // Converti in base64 - stesso pattern del microfono funzionante
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];

          console.log('📤 Invio audio per trascrizione...');
          console.log('🎤 Chunks totali raccolti:', chunksToProcess.length);
          console.log('🎤 Dimensione totale audio:', 
            chunksToProcess.reduce((acc, c) => acc + c.size, 0), 'bytes');

          const { data, error } = await supabase.functions.invoke('voice-to-text', {
            body: { audio: base64Audio }
          });

          if (error) throw error;

          if (data?.text && data.text.trim()) {
            console.log('📝 Trascrizione ricevuta:', data.text);
            onTranscriptionComplete(data.text); // ✅ Rimosso optional chaining
            toast({ title: "✓ Audio trascritto" }); // ✅ Conferma visiva
          }
        } catch (error) {
          console.error('❌ Errore trascrizione:', error);
          toast({
            variant: "destructive",
            title: "Errore Trascrizione",
            description: "Impossibile trascrivere l'audio. Riprova.",
          });
        } finally {
          setIsProcessing(false); // ✅ Sempre in finally
        }
      };

    } catch (error) {
      console.error('❌ Errore generale:', error);
      setIsProcessing(false);
    }
  };

  const toggleFullDuplex = async () => {
    if (isActive) {
      stopFullDuplex();
    } else {
      const success = await setupAudioContext();
      if (success) {
        setIsActive(true);
        toast({
          title: "🎙️ Modalità Full-Duplex Attiva",
          description: "Parla liberamente, il sistema rileverà automaticamente quando finisci.",
        });
      }
    }
  };

  const stopFullDuplex = () => {
    setIsActive(false);
    setIsSpeaking(false);
    setAudioLevel(0);

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

    chunksRef.current = [];
    silenceStartRef.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Main Toggle Button */}
      <Button
        type="button"
        variant={isActive ? "destructive" : "default"}
        size="default"
        onClick={toggleFullDuplex}
        disabled={isDisabled}
        className={cn(
          "min-w-[180px] gap-2 transition-all",
          isActive && "shadow-lg shadow-green-500/20"
        )}
      >
        {isActive ? (
          <>
            <MicOff className="h-4 w-4" />
            <span className="font-medium">Stop Conversazione</span>
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            <span className="font-medium">Avvia Conversazione</span>
          </>
        )}
      </Button>

      {/* Status Indicators - sotto il bottone */}
      {isActive && (
        <div className="flex items-center gap-2 w-full max-w-[180px]">
          {isAISpeaking ? (
            <>
              <Volume2 className="h-3 w-3 text-purple-500 animate-pulse flex-shrink-0" />
              <span className="text-xs text-muted-foreground">AI sta parlando...</span>
            </>
          ) : isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent flex-shrink-0" />
              <span className="text-xs text-muted-foreground">Elaborazione...</span>
            </>
          ) : (
            <>
              <div className={cn(
                "h-2 w-2 rounded-full flex-shrink-0",
                isSpeaking ? "bg-green-500 animate-pulse" : "bg-blue-400"
              )} />
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-100",
                    isSpeaking ? "bg-green-500" : "bg-blue-400"
                  )}
                  style={{ width: `${Math.min(audioLevel * 200, 100)}%` }}
                />
              </div>
              {isSpeaking && (
                <span className="text-xs text-green-600 font-medium">In ascolto</span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
