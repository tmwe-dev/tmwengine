import { useEffect, useRef } from 'react';

interface UseSwipeNavigationProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled: boolean;
  targetRef?: React.RefObject<HTMLElement>;
}

export const useSwipeNavigation = ({
  onSwipeLeft,
  onSwipeRight,
  enabled,
  targetRef
}: UseSwipeNavigationProps) => {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    const targetElement = targetRef?.current || document;
    const SWIPE_THRESHOLD = 80;
    const MAX_VERTICAL_DRIFT = 100;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isSwiping.current = true;
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        touchStartTime.current = Date.now();
        console.log('👆 Touch start:', touchStartX.current);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping.current || e.touches.length !== 1) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = Math.abs(currentX - touchStartX.current);
      const deltaY = Math.abs(currentY - touchStartY.current);

      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault();
        console.log('↔️ Swiping horizontal:', deltaX);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwiping.current || e.changedTouches.length === 0) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;
      const swipeDuration = Date.now() - touchStartTime.current;

      console.log('🏁 Touch end - deltaX:', deltaX, 'deltaY:', deltaY);

      if (
        Math.abs(deltaX) > SWIPE_THRESHOLD &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.5 &&
        Math.abs(deltaY) < MAX_VERTICAL_DRIFT &&
        swipeDuration < 500
      ) {
        if (deltaX > 0) {
          console.log('✅ SWIPE DETECTED! RIGHT');
          onSwipeRight();
        } else {
          console.log('✅ SWIPE DETECTED! LEFT');
          onSwipeLeft();
        }
      }

      isSwiping.current = false;
    };

    targetElement.addEventListener('touchstart', handleTouchStart as any, { passive: false });
    targetElement.addEventListener('touchmove', handleTouchMove as any, { passive: false });
    targetElement.addEventListener('touchend', handleTouchEnd as any);

    return () => {
      targetElement.removeEventListener('touchstart', handleTouchStart as any);
      targetElement.removeEventListener('touchmove', handleTouchMove as any);
      targetElement.removeEventListener('touchend', handleTouchEnd as any);
    };
  }, [enabled, onSwipeLeft, onSwipeRight, targetRef]);
};
