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
}

export const RadioAudioPlayerMini = ({
  audioUrl,
  messageId,
  onExpand,
  isAudioEnabled = true,
  isPlaying: externalIsPlaying,
  onPlayingChange,
  audioProgress,
  onTimeUpdate
}: RadioAudioPlayerMiniProps) => {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const isPlaying = externalIsPlaying ?? internalIsPlaying;
  const setIsPlaying = onPlayingChange ?? setInternalIsPlaying;

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Play failed:', err));
    }
  };

  return (
    <div className="fixed bottom-4 left-[calc(50%-22.5%)] z-50 
                    bg-black/95 backdrop-blur-lg 
                    border-2 border-purple-400/40 
                    rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.25)]
                    p-2 flex items-center gap-2 w-24">
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        disabled={!isAudioEnabled}
        className="w-10 h-10 rounded-full bg-purple-500/20 hover:bg-purple-500/30 
                   flex items-center justify-center transition-all 
                   border border-purple-400/30 disabled:opacity-50"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-purple-300" fill="currentColor" />
        ) : (
          <Play className="w-5 h-5 text-purple-300" fill="currentColor" />
        )}
      </button>

      {/* Expand Button */}
      <button
        onClick={onExpand}
        className="w-10 h-10 rounded-full bg-purple-500/10 hover:bg-purple-500/20 
                   flex items-center justify-center transition-all"
        aria-label="Expand player"
      >
        <Maximize2 className="w-4 h-4 text-purple-300" />
      </button>
    </div>
  );
};
