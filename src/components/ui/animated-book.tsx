import { useRef, useEffect, useState } from 'react';
import libroVideo from '@/assets/libro.mp4';

interface AnimatedBookProps {
  currentPage: number;
  className?: string;
}

export function AnimatedBook({ currentPage, className }: AnimatedBookProps) {
  const previousPage = useRef(currentPage);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('backward');

  useEffect(() => {
    if (currentPage < previousPage.current) {
      // Going backward - play video normally
      setDirection('backward');
      setIsAnimating(true);
    } else if (currentPage > previousPage.current) {
      // Going forward - play video in reverse
      setDirection('forward');
      setIsAnimating(true);
    }
    
    previousPage.current = currentPage;
  }, [currentPage]);

  // Separate effect to play video when it's mounted
  useEffect(() => {
    if (isAnimating && videoRef.current) {
      const video = videoRef.current;
      
      if (direction === 'backward') {
        // Play forward from start
        video.currentTime = 0;
        video.playbackRate = 6;
        video.play();
      } else {
        // Play backward from end
        video.currentTime = video.duration || 4; // fallback to 4 seconds if duration not loaded
        video.playbackRate = -6; // negative = reverse
        video.play();
      }
    }
  }, [isAnimating, direction]);

  const handleVideoEnd = () => {
    setIsAnimating(false);
  };

  // Handle reverse playback reaching start
  const handleTimeUpdate = () => {
    if (videoRef.current && direction === 'forward' && videoRef.current.currentTime <= 0) {
      videoRef.current.pause();
      setIsAnimating(false);
    }
  };

  return (
    <div 
      className={className} 
      style={{ height: '140px', background: 'transparent', position: 'relative' }}
    >
      <div className="w-full h-full flex items-center justify-center">
        <video
          ref={videoRef}
          src={libroVideo}
          onEnded={handleVideoEnd}
          onTimeUpdate={handleTimeUpdate}
          className="max-w-full max-h-full object-contain"
          style={{ transform: 'perspective(1000px) rotateX(20deg)' }}
          muted
          playsInline
        />
      </div>
    </div>
  );
}
