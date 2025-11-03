import { useEffect, useRef } from 'react';

interface UseSwipeNavigationProps {
  onSwipeLeft: () => void;  // Mail successiva
  onSwipeRight: () => void; // Mail precedente
  enabled: boolean;          // Abilita solo quando una mail è aperta
}

export const useSwipeNavigation = ({
  onSwipeLeft,
  onSwipeRight,
  enabled
}: UseSwipeNavigationProps) => {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isTwoFingerSwipe = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Verifica se sono 2 dita
      if (e.touches.length === 2) {
        e.preventDefault();
        isTwoFingerSwipe.current = true;
        touchStartX.current = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        touchStartY.current = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        console.info('✅ 2-finger swipe started', touchStartX.current);
      } else {
        isTwoFingerSwipe.current = false;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTwoFingerSwipe.current || e.changedTouches.length < 1) return;

      e.preventDefault();
      const touchEndX = (e.changedTouches[0].clientX + (e.changedTouches[1]?.clientX || e.changedTouches[0].clientX)) / 2;
      const touchEndY = (e.changedTouches[0].clientY + (e.changedTouches[1]?.clientY || e.changedTouches[0].clientY)) / 2;
      
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;

      // Swipe orizzontale (ignora se movimento verticale troppo grande)
      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && Math.abs(deltaX) > 50) {
        console.info('✅ Swipe detected:', deltaX > 0 ? 'RIGHT' : 'LEFT');
        if (deltaX > 0) {
          onSwipeRight(); // Swipe a destra → mail precedente
        } else {
          onSwipeLeft();  // Swipe a sinistra → mail successiva
        }
      }

      isTwoFingerSwipe.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onSwipeLeft, onSwipeRight]);
};
