import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface AudioMessagePlayerProps {
  audioUrl: string;
  autoPlay?: boolean;
  onPlayingChange?: (playing: boolean) => void;
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedRef = useRef<string | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    
    const handleEnded = () => {
      setIsPlaying(false);
      onPlayingChange?.(false);
      onPlayEnd?.();
      hasStartedRef.current = null; // Reset per prossimo audio
    };

    const handleError = () => {
      console.error('❌ [AudioPlayer] Errore riproduzione audio');
      setIsPlaying(false);
      onPlayingChange?.(false);
      hasStartedRef.current = null; // Reset su errore
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // ✅ Autoplay con protezione doppio trigger
    if (autoPlay && hasStartedRef.current !== audioUrl) {
      hasStartedRef.current = audioUrl; // Marca come avviato
      audio.play().then(() => {
        setIsPlaying(true);
        onPlayingChange?.(true);
        onPlayStart?.();
        console.log(`🎵 [AudioPlayer] Audio avviato per URL: ${audioUrl.substring(0, 50)}...`);
      }).catch((err) => {
        console.error('❌ [AudioPlayer] Errore autoplay:', err);
        hasStartedRef.current = null; // Reset su errore
      });
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.remove();
    };
  }, [audioUrl, autoPlay, onPlayStart, onPlayEnd, onPlayingChange]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/40">
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className="h-8 w-8"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Progress Slider */}
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-12 text-right">
          {formatTime(currentTime)}
        </span>
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-12">
          {formatTime(duration)}
        </span>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="h-8 w-8"
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
        <Slider
          value={[volume]}
          max={1}
          step={0.01}
          onValueChange={handleVolumeChange}
          className="w-20"
        />
      </div>
    </div>
  );
};
