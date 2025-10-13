import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, PhoneOff, ArrowLeft, User } from 'lucide-react';
import { useAudioCall } from '@/hooks/useAudioCall';
import { supabase } from '@/integrations/supabase/client';

const CallRoom = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>('');
  const [roomId] = useState('main-call-room');

  const {
    isInCall,
    isMuted,
    connectionState,
    networkQuality,
    remoteAudioRef,
    startCall,
    endCall,
    toggleMute
  } = useAudioCall(roomId, userId);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
      }
    };
    getUser();
  }, []);

  const qualityColors = {
    good: 'bg-green-500',
    poor: 'bg-yellow-500',
    bad: 'bg-red-500'
  };

  const qualityLabels = {
    good: 'Ottima',
    poor: 'Discreta',
    bad: 'Scarsa'
  };

  const connectionLabels: Record<RTCPeerConnectionState, string> = {
    new: 'Nuova',
    connecting: 'Connessione...',
    connected: 'Connesso',
    disconnected: 'Disconnesso',
    failed: 'Fallito',
    closed: 'Chiuso'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <audio ref={remoteAudioRef} autoPlay />
      
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Call Room</h1>
              <p className="text-muted-foreground">Sistema chiamate audio WebRTC</p>
            </div>

            {!isInCall ? (
              <div className="flex flex-col items-center gap-6">
                <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-16 w-16 text-muted-foreground" />
                </div>
                
                <Button
                  onClick={() => startCall()}
                  size="lg"
                  className="rounded-full px-8"
                >
                  Avvia Chiamata Audio
                </Button>

                <div className="text-sm text-muted-foreground">
                  <p>• Chiamata solo audio (no video)</p>
                  <p>• Qualità adattiva automatica</p>
                  <p>• Nessun costo aggiuntivo (usa Internet)</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-8">
                {/* Stato connessione */}
                <div className="flex gap-4">
                  <Badge variant="outline">
                    {connectionLabels[connectionState]}
                  </Badge>
                  <Badge className={qualityColors[networkQuality]}>
                    Qualità: {qualityLabels[networkQuality]}
                  </Badge>
                </div>

                {/* Visualizzazione chiamata */}
                <div className="w-full max-w-md bg-muted/30 rounded-2xl p-12 text-center">
                  <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Mic className="h-16 w-16 text-primary" />
                  </div>
                  <p className="text-xl font-semibold mb-2">Chiamata in corso</p>
                  <p className="text-sm text-muted-foreground">
                    Audio WebRTC attivo
                  </p>
                </div>

                {/* Controlli */}
                <div className="flex items-center gap-4">
                  <Button
                    variant={isMuted ? 'destructive' : 'secondary'}
                    size="lg"
                    onClick={toggleMute}
                    className="rounded-full w-16 h-16"
                  >
                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </Button>

                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={endCall}
                    className="rounded-full w-16 h-16"
                  >
                    <PhoneOff className="h-6 w-6" />
                  </Button>
                </div>

                {/* Info qualità */}
                {networkQuality === 'bad' && (
                  <div className="text-sm text-destructive text-center">
                    ⚠️ Connessione instabile. Controlla la tua rete.
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Info tecniche */}
        <Card className="mt-4 bg-card/30 backdrop-blur-sm border-border/30">
          <div className="p-4">
            <h3 className="text-sm font-semibold mb-2">Informazioni tecniche</h3>
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Tecnologia:</span> WebRTC P2P
              </div>
              <div>
                <span className="font-medium">Codec:</span> Opus 48kHz
              </div>
              <div>
                <span className="font-medium">STUN:</span> Google STUN
              </div>
              <div>
                <span className="font-medium">Stato:</span> {connectionLabels[connectionState]}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CallRoom;
