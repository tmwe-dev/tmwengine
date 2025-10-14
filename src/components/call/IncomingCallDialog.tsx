import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface IncomingCallDialogProps {
  isOpen: boolean;
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallDialog = ({
  isOpen,
  callerName,
  onAccept,
  onReject
}: IncomingCallDialogProps) => {
  const [ringAudio] = useState(() => {
    // Fallback usando Web Audio API (nessun file necessario)
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.frequency.value = 440; // La (A4)
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.3;
    
    let isPlaying = false;
    
    return {
      play: () => {
        if (!isPlaying) {
          oscillator.start();
          isPlaying = true;
        }
      },
      pause: () => {
        if (isPlaying) {
          try {
            oscillator.stop();
          } catch (e) {
            // Oscillator già fermato
          }
          isPlaying = false;
        }
      }
    };
  });

  useEffect(() => {
    if (isOpen) {
      ringAudio.play();
    } else {
      ringAudio.pause();
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
            <h2 className="text-2xl font-bold mb-2">Chiamata in arrivo</h2>
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
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
