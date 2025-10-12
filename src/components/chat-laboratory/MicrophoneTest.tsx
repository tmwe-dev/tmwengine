import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const MicrophoneTest = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();

  const startTest = async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      setHasPermission(true);
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      setIsTesting(true);
      
      monitorAudio();
    } catch (err) {
      console.error('Errore accesso microfono:', err);
      setHasPermission(false);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    }
  };

  const stopTest = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    setIsTesting(false);
    setAudioLevel(0);
  };

  const monitorAudio = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current || !isTesting) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const normalized = Math.min(100, (average / 128) * 100);
      
      setAudioLevel(normalized);
      animationRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  };

  useEffect(() => {
    return () => {
      stopTest();
    };
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Test Microfono
        </CardTitle>
        <CardDescription>
          Verifica il funzionamento del tuo microfono
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasPermission === false && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Permesso microfono negato. Abilita l'accesso nelle impostazioni del browser.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {hasPermission === true && !isTesting && (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription>
              Microfono autorizzato ✓
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-center">
          <Button
            size="lg"
            variant={isTesting ? "destructive" : "default"}
            onClick={isTesting ? stopTest : startTest}
            className={cn(
              "min-w-[200px] transition-all duration-300",
              isTesting && "shadow-lg shadow-destructive/50"
            )}
          >
            {isTesting ? (
              <>
                <MicOff className="mr-2 h-5 w-5" />
                Ferma Test
              </>
            ) : (
              <>
                <Mic className="mr-2 h-5 w-5" />
                Avvia Test
              </>
            )}
          </Button>
        </div>

        {isTesting && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary animate-pulse" />
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-100"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
              <span className="text-sm font-semibold tabular-nums min-w-[50px] text-right">
                {audioLevel.toFixed(0)}%
              </span>
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
              Parla nel microfono - dovresti vedere la barra muoversi
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
