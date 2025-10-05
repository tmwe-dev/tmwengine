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
      // Backward - start animation
      console.log('AnimatedBook - Going backward, starting animation');
      setIsAnimating(true);
      setGifKey(prev => prev + 1);
      
      setTimeout(() => {
        console.log('AnimatedBook - Animation complete');
        setIsAnimating(false);
      }, 1000);
    }
    
    previousPage.current = currentPage;
  }, [currentPage]);

  return (
    <div className={className} style={{ height: '140px', background: 'transparent', position: 'relative' }}>
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
