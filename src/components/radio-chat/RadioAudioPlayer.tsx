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

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-4 px-2 py-3">
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        disabled={!isAudioEnabled}
        className="shrink-0 w-9 h-9 rounded-full bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center transition-all border border-purple-400/30 disabled:opacity-50"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-purple-300" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 text-purple-300" fill="currentColor" />
        )}
      </button>

      {/* Progress Bar Container */}
      <div className="flex-1 flex items-center gap-3">
        {/* Current Time */}
        <span className="text-xs text-purple-300/60 font-mono min-w-[35px] text-right">
          {formatTime(currentTime)}
        </span>

        {/* Progress Bar */}
        <div 
          className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer group relative"
          onClick={handleSeekClick}
        >
          {/* Background Track */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            {/* Progress Fill */}
            <div 
              className="h-full bg-gradient-to-r from-purple-400 to-purple-300 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Playhead Circle */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50 transition-all group-hover:w-3.5 group-hover:h-3.5"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        {/* Duration */}
        <span className="text-xs text-purple-300/60 font-mono min-w-[35px]">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
};
