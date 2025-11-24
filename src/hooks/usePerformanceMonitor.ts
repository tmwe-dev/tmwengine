/**
 * Performance Monitor Hook
 * Detects infinite render loops and excessive re-renders
 */
import { useEffect, useRef } from 'react';

export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    // Alert if >10 renders in <1 second (possible infinite loop)
    if (renderCount.current > 10 && timeSinceLastRender < 1000) {
      console.error(
        `🔴 [PERFORMANCE] ${componentName} renderizó ${renderCount.current} veces en ${timeSinceLastRender}ms - POSIBLE BUCLE INFINITO`
      );
      renderCount.current = 0; // Reset counter
    }
    
    // Reset after 5 seconds of no renders
    if (timeSinceLastRender > 5000) {
      renderCount.current = 0;
    }
    
    lastRenderTime.current = now;
  });
  
  return { renderCount: renderCount.current };
};
