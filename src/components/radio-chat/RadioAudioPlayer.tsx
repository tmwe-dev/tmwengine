import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

interface RadioAudioPlayerProps {
  audioUrl: string;
  messageId: string;
  autoPlay?: boolean;
  canAutoPlay?: boolean;
  onPlayStart?: (messageId: string) => void;
  onPlayEnd?: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  isAudioEnabled?: boolean;
  showProgress?: boolean;
  showSenderName?: boolean;
  senderName?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  /** Shared ref for centralized audio control */
  sharedAudioRef?: React.MutableRefObject<HTMLAudioElement | null>;
}

export const RadioAudioPlayer = ({
  audioUrl,
  messageId,
  autoPlay = false,
  canAutoPlay = true,
  onPlayStart,
  onPlayEnd,
  onPlayingChange,
  isAudioEnabled = true,
  showProgress = true,
  showSenderName = false,
  senderName = '',
  onTimeUpdate,
  sharedAudioRef
}: RadioAudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedRef = useRef(false);
  
  // Refs for callbacks (avoid re-mount)
  const onPlayStartRef = useRef(onPlayStart);
  const onPlayEndRef = useRef(onPlayEnd);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  useEffect(() => {
    onPlayStartRef.current = onPlayStart;
    onPlayEndRef.current = onPlayEnd;
    onPlayingChangeRef.current = onPlayingChange;
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onPlayStart, onPlayEnd, onPlayingChange, onTimeUpdate]);

  useEffect(() => {
    console.log(`🔄 [RadioAudioPlayer] SETUP: ${messageId.substring(0,8)}`);
    hasStartedRef.current = false;
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Register in shared ref for centralized control
    if (sharedAudioRef) {
      sharedAudioRef.current = audio;
    }

    const handleLoadedMetadata = () => setDuration(audio.duration);

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdateRef.current?.(audio.currentTime, audio.duration);
    };

    const handleEnded = () => {
      console.log(`⏹️ [RadioAudioPlayer] ENDED: ${messageId.substring(0,8)}`);
      setIsPlaying(false);
      onPlayingChangeRef.current?.(false);
      onPlayEndRef.current?.();
    };

    const handleError = (e: ErrorEvent) => {
      console.error('Audio playback error:', e);
      setIsPlaying(false);
      onPlayingChangeRef.current?.(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Guard: don't autoplay if another audio is already playing via shared ref
    const anotherPlaying = sharedAudioRef?.current && !sharedAudioRef.current.paused;
    if (autoPlay && canAutoPlay && isAudioEnabled && !hasStartedRef.current && !anotherPlaying) {
      console.log(`🎬 [RadioAudioPlayer] Autoplay: ${messageId.substring(0,8)}`);
      audio.play()
        .then(() => {
          console.log(`▶️ [RadioAudioPlayer] Autoplay OK: ${messageId.substring(0,8)}`);
          setIsPlaying(true);
          onPlayingChangeRef.current?.(true);
          onPlayStartRef.current?.(messageId);
          hasStartedRef.current = true;
        })
        .catch(err => console.warn('⚠️ Autoplay blocked:', err));
    }

    return () => {
      console.log(`🧹 [RadioAudioPlayer] CLEANUP: ${messageId.substring(0,8)}`);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      // Deregister from shared ref only if it's still this audio
      if (sharedAudioRef && sharedAudioRef.current === audio) {
        sharedAudioRef.current = null;
      }
      hasStartedRef.current = false;
    };
  }, [messageId, audioUrl]);

  // Monitor canAutoPlay changes
  useEffect(() => {
    if (!audioRef.current || !canAutoPlay || !isAudioEnabled) return;
    
    // Guard: don't autoplay if another audio is already playing via shared ref
    const anotherPlaying = sharedAudioRef?.current && sharedAudioRef.current !== audioRef.current && !sharedAudioRef.current.paused;
    if (canAutoPlay && audioRef.current.paused && !hasStartedRef.current && !anotherPlaying) {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          onPlayingChangeRef.current?.(true);
          onPlayStartRef.current?.(messageId);
          hasStartedRef.current = true;
        })
        .catch(err => console.warn('⚠️ Autoplay blocked:', err));
    }
  }, [canAutoPlay, isAudioEnabled, messageId]);

  useEffect(() => {
    hasStartedRef.current = false;
  }, [messageId]);

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
      onPlayingChangeRef.current?.(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          onPlayingChangeRef.current?.(true);
          if (!hasStartedRef.current) {
            onPlayStartRef.current?.(messageId);
            hasStartedRef.current = true;
          }
        })
        .catch(err => console.error('❌ Play failed:', err));
    }
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audioRef.current.currentTime = percentage * duration;
    setCurrentTime(audioRef.current.currentTime);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!audioUrl || audioUrl.trim() === '') return null;

  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <button
        onClick={togglePlay}
        disabled={!isAudioEnabled}
        className="shrink-0 w-8 h-8 rounded-full bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center transition-all border border-purple-400/30 disabled:opacity-50"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-purple-300" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 text-purple-300" fill="currentColor" />
        )}
      </button>

      {showSenderName && senderName && (
        <div className="text-xs text-purple-300/70 font-medium shrink-0">
          {senderName}
        </div>
      )}

      {showProgress && (
        <div className="flex items-center gap-4">
          <span className="text-xs text-purple-300/60 font-mono min-w-[35px] text-right">
            {formatTime(currentTime)}
          </span>

          <div 
            className="w-32 h-1 bg-white/10 rounded-full cursor-pointer group relative"
            onClick={handleSeekClick}
          >
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-400 to-purple-300 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50 transition-all group-hover:w-3.5 group-hover:h-3.5"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>

          <span className="text-xs text-purple-300/60 font-mono min-w-[35px]">
            {formatTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
};
