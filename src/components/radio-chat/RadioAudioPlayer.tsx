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
  showProgress?: boolean;
  showSenderName?: boolean;
  senderName?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
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
  onTimeUpdate
}: RadioAudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasStartedRef = useRef(false);
  
  // ✅ Refs per callback sempre aggiornate senza causare re-mount
  const onPlayStartRef = useRef(onPlayStart);
  const onPlayEndRef = useRef(onPlayEnd);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  
  // ✅ Refs per props che non devono triggerare re-mount
  const autoPlayRef = useRef(autoPlay);
  const canAutoPlayRef = useRef(canAutoPlay);
  const isAudioEnabledRef = useRef(isAudioEnabled);

  useEffect(() => {
    console.log(`🔄 [RadioAudioPlayer] SETUP per: ${messageId.substring(0,8)}`);
    // ✅ RESET hasStartedRef per permettere nuovo autoplay
    hasStartedRef.current = false;
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdateRef.current?.(audio.currentTime, audio.duration);
    };

    const handleEnded = () => {
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

    if (autoPlay && canAutoPlay && isAudioEnabled && !hasStartedRef.current && audio.paused) {
      console.log(`🎬 [RadioAudioPlayer] Tentativo autoplay: ${messageId}`);
      audio.play()
        .then(() => {
          console.log(`▶️ [RadioAudioPlayer] Autoplay START: ${messageId}`);
          setIsPlaying(true);
          onPlayingChangeRef.current?.(true);
          onPlayStartRef.current?.(messageId);
          hasStartedRef.current = true;
        })
        .catch(err => console.warn('⚠️ Autoplay bloccato:', err));
    }

    return () => {
      console.log(`🧹 [RadioAudioPlayer] CLEANUP per: ${messageId.substring(0,8)}`);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      hasStartedRef.current = false;
    };
  }, [messageId, audioUrl]);

  // Aggiorna refs quando le callback o props cambiano (senza triggerare re-mount audio)
  useEffect(() => {
    onPlayStartRef.current = onPlayStart;
    onPlayEndRef.current = onPlayEnd;
    onPlayingChangeRef.current = onPlayingChange;
    onTimeUpdateRef.current = onTimeUpdate;
    autoPlayRef.current = autoPlay;
    canAutoPlayRef.current = canAutoPlay;
    isAudioEnabledRef.current = isAudioEnabled;
  }, [onPlayStart, onPlayEnd, onPlayingChange, onTimeUpdate, autoPlay, canAutoPlay, isAudioEnabled]);

  // ✅ NUOVO: Monitora canAutoPlay per avviare audio quando il messaggio diventa attivo
  useEffect(() => {
    if (!audioRef.current || !canAutoPlay || !isAudioEnabled) return;
    
    // Se canAutoPlay diventa true E l'audio non è già in riproduzione
    if (canAutoPlay && audioRef.current.paused && !hasStartedRef.current) {
      console.log(`🎬 [RadioAudioPlayer] canAutoPlay trigger: ${messageId.substring(0,8)}`);
      
      audioRef.current.play()
        .then(() => {
          console.log(`▶️ [RadioAudioPlayer] Autoplay START (triggered by canAutoPlay): ${messageId.substring(0,8)}`);
          setIsPlaying(true);
          onPlayingChangeRef.current?.(true);
          onPlayStartRef.current?.(messageId);
          hasStartedRef.current = true;
        })
        .catch(err => console.warn('⚠️ Autoplay bloccato:', err));
    }
  }, [canAutoPlay, isAudioEnabled, messageId]);

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
          console.log(`▶️ [RadioAudioPlayer] Manual START: ${messageId}`);
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

  if (!audioUrl || audioUrl.trim() === '') return null;

  return (
    <div className="flex items-center gap-3 px-2 py-2">
      {/* Play/Pause Button */}
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

      {/* Sender Name (optional) */}
      {showSenderName && senderName && (
        <div className="text-xs text-purple-300/70 font-medium shrink-0">
          {senderName}
        </div>
      )}

      {/* Progress Bar Container */}
      {showProgress && (
        <div className="flex items-center gap-4">
        {/* Current Time */}
        <span className="text-xs text-purple-300/60 font-mono min-w-[35px] text-right">
          {formatTime(currentTime)}
        </span>

        {/* Progress Bar */}
        <div 
          className="w-32 h-1 bg-white/10 rounded-full cursor-pointer group relative"
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
      )}
    </div>
  );
};
