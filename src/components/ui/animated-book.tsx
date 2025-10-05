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
    console.log('AnimatedBook - currentPage changed:', currentPage, 'previousPage:', previousPage.current);
    
    if (currentPage < previousPage.current) {
      // Backward - reload GIF
      console.log('AnimatedBook - Going backward, reloading GIF');
      setGifKey(prev => prev + 1);
    }
    
    previousPage.current = currentPage;
  }, [currentPage]);

  const handleClick = () => {
    setIsAnimating(true);
    setGifKey(prev => prev + 1);
    
    // Stop animation after 1 second
    setTimeout(() => {
      setIsAnimating(false);
    }, 1000);
  };

  return (
    <div 
      className={className} 
      style={{ height: '140px', background: 'transparent', position: 'relative', cursor: 'pointer' }}
      onClick={handleClick}
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
