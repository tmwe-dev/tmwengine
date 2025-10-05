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
  const animationFrameRef = useRef<number>();

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
        // Simulate reverse by manually decreasing currentTime
        video.currentTime = video.duration || 4;
        video.pause();
        
        const reversePlay = () => {
          if (video.currentTime > 0) {
            video.currentTime -= 0.1; // Decrease time (6x speed ≈ 0.1s per frame at 60fps)
            animationFrameRef.current = requestAnimationFrame(reversePlay);
          } else {
            video.currentTime = 0;
            setIsAnimating(false);
          }
        };
        
        animationFrameRef.current = requestAnimationFrame(reversePlay);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
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
