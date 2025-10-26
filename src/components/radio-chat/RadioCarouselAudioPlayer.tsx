import { useEffect, useState, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { RadioMessage } from '@/types/radio';

interface RadioCarouselAudioPlayerProps {
  messages: RadioMessage[];
  activeMessageId: string;
  onAudioEnd: () => void;
}

export const RadioCarouselAudioPlayer = ({
  messages,
  activeMessageId,
  onAudioEnd
}: RadioCarouselAudioPlayerProps) => {
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAutoPlayedRef = useRef(false);

  // Update audio when activeMessageId changes
  useEffect(() => {
    const activeMessage = messages.find(m => m.id === activeMessageId);
    
    if (activeMessage?.audio_url) {
      console.log('🎵 [RadioCarouselAudioPlayer] Changing audio:', activeMessage.sender_name);
      setCurrentAudioUrl(activeMessage.audio_url);
      setSenderName(activeMessage.sender_name);
      hasAutoPlayedRef.current = false;
    } else {
      setCurrentAudioUrl('');
      setSenderName('');
    }
  }, [activeMessageId, messages]);

  // Audio element setup and autoplay
  useEffect(() => {
    if (!currentAudioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const audio = new Audio(currentAudioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      
      // Autoplay when metadata is loaded
      if (!hasAutoPlayedRef.current) {
        audio.play()
          .then(() => {
            console.log('▶️ [RadioCarouselAudioPlayer] Autoplay started');
            setIsPlaying(true);
            hasAutoPlayedRef.current = true;
          })
          .catch(err => console.warn('⚠️ Autoplay blocked:', err));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      console.log('🏁 [RadioCarouselAudioPlayer] Audio ended');
      setIsPlaying(false);
      onAudioEnd();
    };

    const handleError = () => {
      console.error('❌ [RadioCarouselAudioPlayer] Audio error');
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

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
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('❌ Play failed:', err));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentAudioUrl) {
    return null; // Don't show player if no audio
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-2">
      {/* Speaker Name */}
      <div className="mb-1.5 text-xs text-purple-300/70 text-center font-medium">
        {senderName}
      </div>
      
      {/* Audio Controls */}
      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="shrink-0 w-10 h-10 rounded-full bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center transition-all border border-purple-400/30"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-purple-300" fill="currentColor" />
          ) : (
            <Play className="w-5 h-5 text-purple-300" fill="currentColor" />
          )}
        </button>

        {/* Progress Bar Container */}
        <div className="flex-1 flex items-center gap-3">
          {/* Current Time */}
          <span className="text-xs text-purple-300/60 font-mono min-w-[40px]">
            {formatTime(currentTime)}
          </span>

          {/* Progress Bar */}
          <div 
            className="flex-1 h-0.5 bg-white/10 rounded-full cursor-pointer group relative"
            onClick={handleSeek}
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
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50 transition-all group-hover:w-3 group-hover:h-3"
              style={{ left: `calc(${progress}% - 5px)` }}
            />
          </div>

          {/* Duration */}
          <span className="text-xs text-purple-300/60 font-mono min-w-[40px]">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};
