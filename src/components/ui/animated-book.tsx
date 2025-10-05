import { useRef, useEffect, useState } from 'react';
import libroGif from '@/assets/libro.gif';

interface AnimatedBookProps {
  currentPage: number;
  className?: string;
}

export function AnimatedBook({ currentPage, className }: AnimatedBookProps) {
  const previousPage = useRef(currentPage);
  const [showGif, setShowGif] = useState(false);
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

  return (
    <div className={className} style={{ height: '140px', background: 'transparent', position: 'relative' }}>
      <div className="w-full h-full flex items-center justify-center">
        <img 
          key={gifKey}
          src={libroGif} 
          alt="Book animation" 
          className="max-w-full max-h-full object-contain"
          style={{ transform: 'perspective(1000px) rotateX(20deg)' }}
        />
      </div>
    </div>
  );
}
