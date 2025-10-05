import { useRef, useEffect, useState } from 'react';
import libroVideo from '@/assets/libro.mp4';
import libroReverseVideo from '@/assets/libro-reverse.mp4';
import libroStatic from '@/assets/libro-static.png';

interface AnimatedBookProps {
  currentPage: number;
  className?: string;
}

export function AnimatedBook({ currentPage, className }: AnimatedBookProps) {
  const previousPage = useRef(currentPage);
  const videoForwardRef = useRef<HTMLVideoElement>(null);
  const videoBackwardRef = useRef<HTMLVideoElement>(null);
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
    if (isAnimating) {
      const video = direction === 'forward' ? videoForwardRef.current : videoBackwardRef.current;
      if (video) {
        video.currentTime = 0;
        video.playbackRate = 6;
        video.play();
      }
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
      <div className="w-full h-full flex items-center justify-center relative">
        <img
          src={libroStatic}
          alt="Book"
          className="max-w-full max-h-full object-contain absolute inset-0 transition-opacity duration-100"
          style={{ 
            transform: 'perspective(1000px) rotateX(20deg)',
            opacity: !isAnimating ? 1 : 0
          }}
        />
        <video
          ref={videoBackwardRef}
          src={libroVideo}
          onEnded={handleVideoEnd}
          className="max-w-full max-h-full object-contain absolute inset-0 transition-opacity duration-100"
          style={{ 
            transform: 'perspective(1000px) rotateX(20deg)',
            opacity: direction === 'backward' && isAnimating ? 1 : 0
          }}
          muted
          playsInline
        />
        <video
          ref={videoForwardRef}
          src={libroReverseVideo}
          onEnded={handleVideoEnd}
          className="max-w-full max-h-full object-contain absolute inset-0 transition-opacity duration-100"
          style={{ 
            transform: 'perspective(1000px) rotateX(20deg)',
            opacity: direction === 'forward' && isAnimating ? 1 : 0
          }}
          muted
          playsInline
        />
      </div>
    </div>
  );
}
