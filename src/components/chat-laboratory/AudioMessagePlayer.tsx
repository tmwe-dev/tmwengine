import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface AudioMessagePlayerProps {
  audioUrl: string;
  autoPlay?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
}

export const AudioMessagePlayer = ({ 
  audioUrl, 
  autoPlay = false,
  onPlayingChange,
  onPlayStart,
  onPlayEnd
}: AudioMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log(`🔊 [AudioPlayer] Setup audio: ${audioUrl}, autoPlay: ${autoPlay}`);

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Log ogni 10 secondi per debug
      if (Math.floor(audio.currentTime) % 10 === 0 && audio.currentTime > 0) {
        console.log(`⏱️ [AudioPlayer] Playback at ${Math.floor(audio.currentTime)}s / ${Math.floor(audio.duration)}s`);
      }
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      console.log(`📊 [AudioPlayer] Durata totale: ${Math.floor(audio.duration)}s`);
    };
    
    const handleEnded = () => {
      console.log(`✅ [AudioPlayer] Playback completato naturalmente`);
      setIsPlaying(false);
      onPlayingChange?.(false);
      onPlayEnd?.();
    };

    const handlePause = () => {
      // ⚠️ Se audio è terminato, ignora la pausa (già gestita da "ended")
      if (audio.ended) {
        console.log(`ℹ️ [AudioPlayer] Pausa ignorata (audio terminato naturalmente)`);
        return;
      }
      
      console.warn(`⏸️ [AudioPlayer] PAUSA manuale a ${Math.floor(audio.currentTime)}s`);
      setIsPlaying(false);
      onPlayingChange?.(false);
    };

    const handleError = (e: Event) => {
      console.error(`❌ [AudioPlayer] Errore riproduzione:`, e);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    const playWithRetry = async (maxRetries = 3) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          await audio.play();
          console.log(`✅ [AudioPlayer] Play riuscito (tentativo ${i + 1})`);
          setIsPlaying(true);
          onPlayingChange?.(true);
          onPlayStart?.();
          return true;
        } catch (err) {
          console.warn(`⚠️ [AudioPlayer] Play fallito (tentativo ${i + 1}):`, err);
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      console.error(`❌ [AudioPlayer] Impossibile avviare autoplay dopo ${maxRetries} tentativi`);
      return false;
    };

    if (autoPlay) {
      playWithRetry();
    }

    return () => {
      // ⚠️ NON fare cleanup se audio sta ancora suonando!
      if (audio.paused || audio.ended) {
        console.log(`🧹 [AudioPlayer] Cleanup (audio già terminato)`);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('error', handleError);
      } else {
        console.warn(`⚠️ [AudioPlayer] Cleanup saltato: audio ancora in riproduzione!`);
      }
    };
  }, [audioUrl, autoPlay]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onPlayingChange?.(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        onPlayingChange?.(true);
        onPlayStart?.();
      }).catch(console.error);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <Button
        onClick={togglePlay}
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>

      <div className="flex-1 min-w-0">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          onClick={toggleMute}
          size="icon"
          variant="ghost"
          className="h-8 w-8"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <Slider
          value={[volume]}
          max={100}
          step={1}
          onValueChange={(v) => setVolume(v[0])}
          className="w-20"
        />
      </div>
    </div>
  );
};
