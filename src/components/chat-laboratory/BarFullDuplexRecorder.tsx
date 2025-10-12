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

  // VAD Configuration - Abbassate le soglie per migliorare rilevamento
  const SILENCE_THRESHOLD = 0.005; // Abbassato da 0.015 - più sensibile al silenzio
  const SPEECH_THRESHOLD = 0.015; // Abbassato da 0.03 - più sensibile alla voce
  const SILENCE_DURATION_MS = 1500; // Ridotto da 2000ms - invio più rapido
  const MIN_SPEECH_DURATION_MS = 300; // Ridotto da 500ms - cattura frasi brevi

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
      analyser.fftSize = 512; // Ridotto da 2048 per risposta più rapida
      analyser.smoothingTimeConstant = 0.3; // Ridotto da 0.8 per meno smoothing

      source.connect(analyser);
      analyserRef.current = analyser;

      console.log('🎤 Full-Duplex: Audio context attivo, VAD configurato');

      // Setup MediaRecorder per chunked recording
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Chunk ogni 100ms

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

  // Voice Activity Detection
  const startVADMonitoring = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let speechStartTime: number | null = null;

    const detectVoice = () => {
      if (!isActive) return;

      analyser.getByteFrequencyData(dataArray);
      
      // Calcola livello audio (RMS) - con boost per visualizzazione
      const sum = dataArray.reduce((acc, val) => acc + val * val, 0);
      const rms = Math.sqrt(sum / dataArray.length) / 255;
      
      // Boost del segnale per visualizzazione (x3)
      const boostedRms = Math.min(rms * 3, 1);
      setAudioLevel(boostedRms);

      // Log ogni secondo per debug
      if (Math.random() < 0.05) { // ~5% delle volte (ogni ~2 secondi a 100ms interval)
        console.log(`🎙️ VAD - RMS: ${rms.toFixed(4)}, Boosted: ${boostedRms.toFixed(4)}, Speaking: ${isSpeaking}`);
      }

      // VAD Logic
      if (rms > SPEECH_THRESHOLD) {
        // 🗣️ Parlato rilevato
        if (!speechStartTime) {
          speechStartTime = Date.now();
          console.log('🗣️ VAD: Inizio parlato rilevato');
        }
        setIsSpeaking(true);
        silenceStartRef.current = null;
        
        if (vadTimerRef.current) {
          clearTimeout(vadTimerRef.current);
          vadTimerRef.current = null;
        }
      } else if (rms < SILENCE_THRESHOLD) {
        // 🤫 Silenzio rilevato
        if (isSpeaking || speechStartTime) {
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          }

          const silenceDuration = Date.now() - silenceStartRef.current;
          
          if (silenceDuration >= SILENCE_DURATION_MS) {
            // Fine frase → Invia trascrizione
            const speechDuration = speechStartTime 
              ? Date.now() - speechStartTime 
              : 0;

            if (speechDuration >= MIN_SPEECH_DURATION_MS) {
              console.log(`🎤 Fine parlato rilevato! Durata: ${speechDuration}ms, invio trascrizione...`);
              processRecording();
            } else {
              console.log(`⏭️ Parlato troppo breve (${speechDuration}ms), ignorato`);
            }

            // Reset
            setIsSpeaking(false);
            speechStartTime = null;
            silenceStartRef.current = null;
          }
        }
      }

      if (isActive) {
        vadTimerRef.current = setTimeout(detectVoice, 100);
      }
    };

    detectVoice();
  };

  const processRecording = async () => {
    if (chunksRef.current.length === 0) {
      console.warn('⚠️ Nessun chunk audio da processare');
      return;
    }

    console.log(`📦 Processing ${chunksRef.current.length} audio chunks...`);
    setIsProcessing(true);

    try {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      console.log(`🎵 Audio blob size: ${audioBlob.size} bytes`);
      chunksRef.current = []; // Clear chunks

      // Converti in base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      await new Promise((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64Audio = (reader.result as string).split(',')[1];

            console.log('🚀 Invio audio a voice-to-text...');
            const { data, error } = await supabase.functions.invoke('voice-to-text', {
              body: { audio: base64Audio }
            });

            if (error) {
              console.error('❌ Errore voice-to-text:', error);
              throw error;
            }

            if (data?.text) {
              console.log('✅ Trascrizione ricevuta:', data.text);
              onTranscriptionComplete?.(data.text);
            } else {
              console.warn('⚠️ Nessun testo nella risposta voice-to-text');
            }

            resolve(null);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
      });

    } catch (error) {
      console.error('Errore trascrizione:', error);
      toast({
        variant: "destructive",
        title: "Errore Trascrizione",
        description: "Impossibile trascrivere l'audio. Riprova.",
      });
    } finally {
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

    if (vadTimerRef.current) {
      clearTimeout(vadTimerRef.current);
      vadTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
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
