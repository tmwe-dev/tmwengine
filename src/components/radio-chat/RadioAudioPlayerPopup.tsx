import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { RadioMessage } from '@/types/radio';

interface RadioAudioPlayerPopupProps {
  messages: RadioMessage[];
  activeMessageId: string;
  onAudioEnd: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const RadioAudioPlayerPopup = ({
  messages,
  activeMessageId,
  onAudioEnd,
  isOpen,
  onClose
}: RadioAudioPlayerPopupProps) => {
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [senderName, setSenderName] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Update audio source when activeMessageId changes
  useEffect(() => {
    const activeMessage = messages.find((m) => m.id === activeMessageId);
    
    if (activeMessage?.audio_url) {
      setCurrentAudioUrl(activeMessage.audio_url);
      setSenderName(activeMessage.sender_name);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    } else {
      setCurrentAudioUrl(null);
      setSenderName('');
    }
  }, [activeMessageId, messages]);

  // Initialize and manage audio element
  useEffect(() => {
    if (!currentAudioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    const audio = new Audio(currentAudioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onAudioEnd();
    };

    const handleError = (e: Event) => {
      console.error('Audio playback error:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Autoplay when new audio loads
    audio.play().then(() => {
      setIsPlaying(true);
    }).catch((err) => {
      console.error('Autoplay failed:', err);
    });

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [currentAudioUrl, onAudioEnd]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;

    const bounds = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - bounds.left;
    const percentage = clickX / bounds.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !currentAudioUrl) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-black/90 backdrop-blur-xl border border-purple-400/30 rounded-2xl shadow-2xl shadow-purple-500/20 p-4 min-w-[350px] max-w-[90vw]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-purple-300/70 hover:text-purple-300 transition-colors"
          aria-label="Chiudi player"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Speaker Name */}
        <div className="mb-3 text-xs text-purple-300/70 text-center font-medium flex items-center justify-center gap-2">
          <span className="text-purple-400">🎧</span>
          {senderName}
        </div>

        {/* Audio Controls */}
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 transition-all hover:scale-105"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5 text-purple-300" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-purple-300 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Progress Bar */}
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[10px] text-purple-300/50 tabular-nums min-w-[32px]">
              {formatTime(currentTime)}
            </span>

            <div 
              className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer group relative"
              onClick={handleSeek}
            >
              {/* Progress Fill */}
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
              
              {/* Playhead Circle */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50 transition-all group-hover:w-3.5 group-hover:h-3.5"
                style={{ left: `calc(${progress}% - 6px)` }}
              />
            </div>

            <span className="text-[10px] text-purple-300/50 tabular-nums min-w-[32px]">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
