import { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import { RadioViewMode } from '@/types/radio';

export const useRadioPreferences = () => {
  const [viewMode, setViewMode] = useState<RadioViewMode>(() => {
    return (localStorage.getItem('radio-view-mode') as RadioViewMode) || 'carousel';
  });

  const [isAutoAdvanceEnabled, setIsAutoAdvanceEnabled] = useState(() => {
    const saved = localStorage.getItem('radio-auto-advance');
    return saved ? JSON.parse(saved) : true;
  });

  const [carouselZoom, setCarouselZoom] = useState(() => {
    const saved = localStorage.getItem('radio-carousel-zoom');
    return saved ? parseFloat(saved) : 1.0;
  });

  const [carouselVerticalOffset, setCarouselVerticalOffset] = useState(() => {
    const saved = localStorage.getItem('radio-carousel-vertical-offset');
    return saved ? parseFloat(saved) : 0;
  });

  // Persist all preferences
  useEffect(() => { localStorage.setItem('radio-view-mode', viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem('radio-auto-advance', JSON.stringify(isAutoAdvanceEnabled)); }, [isAutoAdvanceEnabled]);
  useEffect(() => { localStorage.setItem('radio-carousel-vertical-offset', carouselVerticalOffset.toString()); }, [carouselVerticalOffset]);

  // Debounced zoom
  const debouncedSetZoom = useCallback(
    debounce((zoom: number) => {
      setCarouselZoom(zoom);
      localStorage.setItem('radio-carousel-zoom', zoom.toString());
    }, 50),
    []
  );

  const handleZoomChange = useCallback((zoom: number) => {
    debouncedSetZoom(zoom);
  }, [debouncedSetZoom]);

  return {
    viewMode, setViewMode,
    isAutoAdvanceEnabled, setIsAutoAdvanceEnabled,
    carouselZoom, setCarouselZoom,
    carouselVerticalOffset, setCarouselVerticalOffset,
    handleZoomChange
  };
};
