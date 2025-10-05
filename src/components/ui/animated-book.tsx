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
      // Backward - show GIF
      console.log('AnimatedBook - Going backward, showing GIF');
      setShowGif(true);
      setGifKey(prev => prev + 1);
      
      setTimeout(() => {
        console.log('AnimatedBook - Hiding GIF after 1s');
        setShowGif(false);
      }, 1000);
    }
    
    previousPage.current = currentPage;
  }, [currentPage]);

  return (
    <div className={className} style={{ height: '140px', background: 'transparent', position: 'relative' }}>
      {showGif ? (
        <div className="w-full h-full flex items-center justify-center bg-black/10">
          <img 
            key={gifKey}
            src={libroGif} 
            alt="Book animation" 
            className="max-w-full max-h-full object-contain"
            style={{ transform: 'perspective(1000px) rotateX(20deg)' }}
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <img 
            src={libroGif} 
            alt="Book" 
            className="max-w-full max-h-full object-contain opacity-30"
            style={{ transform: 'perspective(1000px) rotateX(20deg)' }}
          />
        </div>
      )}
    </div>
  );
}
