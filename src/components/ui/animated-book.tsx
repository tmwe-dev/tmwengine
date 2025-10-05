import { useRef, useEffect, useState } from 'react';
import libroGif from '@/assets/libro.gif';
import libroStatic from '@/assets/libro-static.png';

interface AnimatedBookProps {
  currentPage: number;
  className?: string;
}

export function AnimatedBook({ currentPage, className }: AnimatedBookProps) {
  const previousPage = useRef(currentPage);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gifKey, setGifKey] = useState(0);

  useEffect(() => {
    if (currentPage < previousPage.current) {
      // Going backward - show and activate GIF
      setIsAnimating(true);
      setGifKey(prev => prev + 1);
      
      // Stop animation after 1 second
      setTimeout(() => {
        setIsAnimating(false);
      }, 1000);
    }
    
    previousPage.current = currentPage;
  }, [currentPage]);

  return (
    <div 
      className={className} 
      style={{ height: '140px', background: 'transparent', position: 'relative' }}
    >
      <div className="w-full h-full flex items-center justify-center">
        <img 
          key={isAnimating ? gifKey : 'static'}
          src={isAnimating ? libroGif : libroStatic} 
          alt="Book animation" 
          className="max-w-full max-h-full object-contain"
          style={{ transform: 'perspective(1000px) rotateX(20deg)' }}
        />
      </div>
    </div>
  );
}
