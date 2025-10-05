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

  useEffect(() => {
    if (currentPage < previousPage.current) {
      // Going backward - trigger animation
      setIsAnimating(true);
    }
    
    previousPage.current = currentPage;
  }, [currentPage]);

  // Separate effect to play video when it's mounted
  useEffect(() => {
    if (isAnimating && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.playbackRate = 6; // 6x speed
      videoRef.current.play();
    }
  }, [isAnimating]);

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
          src={libroVideo}
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
