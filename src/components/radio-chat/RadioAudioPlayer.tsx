import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface RadioAudioPlayerProps {
  audioUrl: string;
  messageId: string;
  autoPlay?: boolean;
  canAutoPlay?: boolean;
  onPlayStart?: (messageId: string) => void;
  onPlayEnd?: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  isAudioEnabled?: boolean;
}

export const RadioAudioPlayer = ({
  audioUrl,
  messageId,
  autoPlay = false,
  canAutoPlay = true,
  onPlayStart,
  onPlayEnd,
  onPlayingChange,
  isAudioEnabled = true
}: RadioAudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onPlayingChange?.(false);
      onPlayEnd?.();
    };

    const handleError = (e: ErrorEvent) => {
      console.error('Audio playback error:', e);
      setIsPlaying(false);
      onPlayingChange?.(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    if (autoPlay && canAutoPlay && isAudioEnabled && !hasStartedRef.current) {
      audio.play()
        .then(() => {
          console.log(`▶️ [RadioAudioPlayer] Autoplay START: ${messageId}`);
          setIsPlaying(true);
          onPlayingChange?.(true);
          onPlayStart?.(messageId);
          hasStartedRef.current = true;
        })
        .catch(err => console.warn('⚠️ Autoplay bloccato:', err));
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [audioUrl, autoPlay, canAutoPlay, onPlayStart, onPlayEnd, onPlayingChange, isAudioEnabled, messageId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      onPlayingChange?.(false);
    } else {
      audioRef.current.play()
        .then(() => {
          console.log(`▶️ [RadioAudioPlayer] Manual START: ${messageId}`);
          setIsPlaying(true);
          onPlayingChange?.(true);
          if (!hasStartedRef.current) {
            onPlayStart?.(messageId);
            hasStartedRef.current = true;
          }
        })
        .catch(err => console.error('❌ Play failed:', err));
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
    if (value[0] > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className="text-white hover:text-white/80"
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </Button>

      <div className="flex-1 flex items-center gap-3">
        <span className="text-sm text-white/60 min-w-[40px]">
          {formatTime(currentTime)}
        </span>
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="flex-1"
        />
        <span className="text-sm text-white/60 min-w-[40px]">
          {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="text-white hover:text-white/80"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.1}
          onValueChange={handleVolumeChange}
          className="w-20"
        />
      </div>
    </div>
  );
};
