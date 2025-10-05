import { useRef, useEffect, useState } from 'react';
import libroVideo from '@/assets/libro.mp4';
import libroReverseVideo from '@/assets/libro-reverse.mp4';

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
      video.currentTime = 0;
      video.playbackRate = 6;
      video.play();
    }
  }, [isAnimating, direction]);

  const handleVideoEnd = () => {
    setIsAnimating(false);
  };

  return (
    <div 
      className={className} 
      style={{ height: '140px', background: 'transparent', position: 'relative' }}
    >
      <div className="w-full h-full flex items-center justify-center">
        <video
          ref={videoRef}
          src={direction === 'forward' ? libroReverseVideo : libroVideo}
          onEnded={handleVideoEnd}
          className="max-w-full max-h-full object-contain"
          style={{ transform: 'perspective(1000px) rotateX(20deg)' }}
          muted
          playsInline
        />
      </div>
    </div>
  );
}
