import { Play, Pause, Maximize2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface RadioAudioPlayerMiniProps {
  audioUrl: string;
  messageId: string;
  onExpand: () => void;
  isAudioEnabled?: boolean;
  isPlaying?: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
  audioProgress?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  autoPlay?: boolean;
  canAutoPlay?: boolean;
  onPlayStart?: (messageId: string) => void;
  onPlayEnd?: () => void;
  /** Shared ref for centralized audio control */
  sharedAudioRef?: React.MutableRefObject<HTMLAudioElement | null>;
}

export const RadioAudioPlayerMini = ({
  audioUrl,
  messageId,
  onExpand,
  isAudioEnabled = true,
  isPlaying: externalIsPlaying,
  onPlayingChange,
  audioProgress,
  onTimeUpdate,
  autoPlay = false,
  canAutoPlay = false,
  onPlayStart,
  onPlayEnd,
  sharedAudioRef
}: RadioAudioPlayerMiniProps) => {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const isPlaying = externalIsPlaying ?? internalIsPlaying;
  const setIsPlaying = onPlayingChange ?? setInternalIsPlaying;

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Register in shared ref for centralized control
    if (sharedAudioRef) {
      sharedAudioRef.current = audio;
    }

    if (autoPlay && canAutoPlay && isAudioEnabled) {
      console.log(`🔊 [Mini Player] Autoplay: ${messageId}`);
      audio.play()
        .then(() => {
          console.log(`✅ [Mini Player] Autoplay OK: ${messageId}`);
          setIsPlaying(true);
          if (onPlayStart) onPlayStart(messageId);
        })
        .catch(err => console.error(`❌ [Mini Player] Autoplay FAILED:`, err));
    }

    const handleEnded = () => {
      console.log(`⏹️ [Mini Player] ENDED: ${messageId}`);
      setIsPlaying(false);
      if (onPlayEnd) onPlayEnd();
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      // Deregister from shared ref only if it's still this audio
      if (sharedAudioRef && sharedAudioRef.current === audio) {
        sharedAudioRef.current = null;
      }
    };
  }, [audioUrl, autoPlay, canAutoPlay, isAudioEnabled, messageId]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          if (onPlayStart) onPlayStart(messageId);
        })
        .catch(err => console.error('Play failed:', err));
    }
  };

  return (
    <div className="bg-black/95 backdrop-blur-lg 
                    border-2 border-purple-400/40 
                    rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.25)]
                    p-2 flex items-center gap-2 w-24">
      <button
        onClick={togglePlay}
        disabled={!isAudioEnabled}
        className="w-8 h-8 rounded-full bg-purple-500/20 hover:bg-purple-500/30 
                   flex items-center justify-center transition-all 
                   border border-purple-400/30 disabled:opacity-50"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-purple-300" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 text-purple-300" fill="currentColor" />
        )}
      </button>

      <button
        onClick={onExpand}
        className="w-8 h-8 rounded-full bg-purple-500/10 hover:bg-purple-500/20 
                   flex items-center justify-center transition-all"
        aria-label="Expand player"
      >
        <Maximize2 className="w-4 h-4 text-purple-300" />
      </button>
    </div>
  );
};
