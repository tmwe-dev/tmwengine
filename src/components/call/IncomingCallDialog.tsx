import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, User, Video } from 'lucide-react';
import { useEffect, useState } from 'react';

interface IncomingCallDialogProps {
  isOpen: boolean;
  callerName: string;
  callType?: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallDialog = ({
  isOpen,
  callerName,
  callType = 'audio',
  onAccept,
  onReject
}: IncomingCallDialogProps) => {
  // FIX #6: Timeout automatico dopo 30 secondi
  useEffect(() => {
    if (!isOpen) return;

    console.log('[IncomingCallDialog] ⏱️ Starting 30s timeout');
    const timeout = setTimeout(() => {
      console.log('[IncomingCallDialog] ⏱️ Timeout reached - auto-rejecting');
      onReject();
    }, 30000);

    return () => {
      clearTimeout(timeout);
      console.log('[IncomingCallDialog] ⏱️ Timeout cleared');
    };
  }, [isOpen, onReject]);

  const [ringAudio] = useState(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();
    let intervalId: NodeJS.Timeout | null = null;
    let isPlaying = false;
    
    const playRingPattern = () => {
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator1.frequency.value = 425;
      oscillator2.frequency.value = 425;
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      gainNode.gain.value = 0.3;
      
      const now = audioContext.currentTime;
      
      oscillator1.start(now);
      oscillator1.stop(now + 0.4);
      
      oscillator2.start(now + 0.6);
      oscillator2.stop(now + 1.0);
    };
    
    return {
      play: () => {
        if (!isPlaying) {
          isPlaying = true;
          playRingPattern();
          intervalId = setInterval(playRingPattern, 5000);
        }
      },
      pause: () => {
        if (isPlaying) {
          isPlaying = false;
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      },
      cleanup: () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      }
    };
  });

  useEffect(() => {
    return () => {
      ringAudio.cleanup();
    };
  }, [ringAudio]);

  useEffect(() => {
    const wasAccepted = sessionStorage.getItem('callAccepted') === 'true';
    
    if (isOpen && !wasAccepted) {
      console.log('[IncomingCallDialog] 🔔 Dialog opened, playing ring');
      ringAudio.play();
    } else {
      console.log('[IncomingCallDialog] 🔕 Dialog closed or accepted, stopping ring');
      ringAudio.pause();
      if (wasAccepted) {
        sessionStorage.removeItem('callAccepted');
      }
    }
  }, [isOpen, ringAudio]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onReject()}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <User className="h-12 w-12 text-primary" />
          </div>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">
              {callType === 'video' ? '📹 Videochiamata in arrivo' : '📞 Chiamata in arrivo'}
            </h2>
            <p className="text-muted-foreground">{callerName}</p>
          </div>

          <div className="flex gap-4">
            <Button
              variant="destructive"
              size="lg"
              onClick={onReject}
              className="rounded-full w-16 h-16"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={onAccept}
              className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
            >
              {callType === 'video' ? (
                <Video className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
