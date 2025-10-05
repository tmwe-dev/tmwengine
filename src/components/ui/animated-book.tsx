import { useRef, useEffect, useState } from 'react';
import libroVideo from '@/assets/libro.mp4';
import libroStatic from '@/assets/libro-static.png';

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
      // Going backward - show and play video
      setIsAnimating(true);
      
      // Play video when it's ready
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.playbackRate = 4; // 4x speed - adjust as needed
        videoRef.current.play();
      }
    }
    
    previousPage.current = currentPage;
  }, [currentPage]);

  const handleVideoEnd = () => {
    setIsAnimating(false);
  };

  return (
    <div 
      className={className} 
      style={{ height: '140px', background: 'transparent', position: 'relative' }}
    >
      <div className="w-full h-full flex items-center justify-center">
        {isAnimating ? (
          <video
            ref={videoRef}
            src={libroVideo}
            onEnded={handleVideoEnd}
            className="max-w-full max-h-full object-contain"
            style={{ transform: 'perspective(1000px) rotateX(20deg)' }}
            muted
            playsInline
          />
        ) : (
          <img 
            src={libroStatic} 
            alt="Book" 
            className="max-w-full max-h-full object-contain"
            style={{ transform: 'perspective(1000px) rotateX(20deg)' }}
          />
        )}
      </div>
    </div>
  );
}
