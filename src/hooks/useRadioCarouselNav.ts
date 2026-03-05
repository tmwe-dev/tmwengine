import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { RadioMessage } from '@/types/radio';

export const useRadioCarouselNav = (
  messages: RadioMessage[],
  isAudioPlaying: boolean,
  stopCurrentAudio: () => void,
  handleAudioEnd: () => void,
  isAutoAdvanceEnabled: boolean
) => {
  const [activeMessageId, setActiveMessageId] = useState<string>('');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const swipeThreshold = 75;

  const aiMessages = useMemo(() => messages.filter(m => m.sender_type !== 'human'), [messages]);

  const firstAiMessageId = useMemo(() => aiMessages.length > 0 ? aiMessages[0].id : '', [aiMessages]);

  // Track previous AI message count to detect new arrivals
  const prevAiCountRef = useRef(0);

  // Auto-set first AI message
  useEffect(() => {
    if (firstAiMessageId && !activeMessageId) {
      setActiveMessageId(firstAiMessageId);
    }
  }, [firstAiMessageId, activeMessageId]);

  // Auto-navigate to newest AI message when new ones arrive
  useEffect(() => {
    const currentCount = aiMessages.length;
    const prevCount = prevAiCountRef.current;
    
    if (currentCount > prevCount && prevCount > 0) {
      // New AI message(s) arrived — navigate to the first new one
      const newMessage = aiMessages[prevCount]; // first new message
      if (newMessage) {
        console.log(`🎯 [CarouselNav] New AI message detected, auto-navigating to: ${newMessage.id.substring(0, 8)}`);
        setActiveMessageId(newMessage.id);
      }
    }
    
    prevAiCountRef.current = currentCount;
  }, [aiMessages]);

  // BUG 4 fix: Reset when aiMessages becomes empty (new conversation)
  useEffect(() => {
    if (aiMessages.length === 0 && activeMessageId !== '') {
      setActiveMessageId('');
      prevAiCountRef.current = 0;
    }
  }, [aiMessages.length, activeMessageId]);

  const currentMessage = useMemo(() => messages.find(m => m.id === activeMessageId) || null, [messages, activeMessageId]);

  // BUG 4 fix: Expose resetNavigation
  const resetNavigation = useCallback(() => {
    setActiveMessageId('');
    prevAiCountRef.current = 0;
  }, []);

  const handleCarouselAudioEnd = useCallback(() => {
    handleAudioEnd();
    if (!isAutoAdvanceEnabled) return;
    setTimeout(() => {
      const currentIndex = aiMessages.findIndex(m => m.id === activeMessageId);
      const nextMessage = aiMessages[currentIndex + 1];
      if (nextMessage) setActiveMessageId(nextMessage.id);
    }, 300);
  }, [handleAudioEnd, isAutoAdvanceEnabled, aiMessages, activeMessageId]);

  const handlePrevCard = useCallback(() => {
    if (aiMessages.length === 0) return;
    if (isAudioPlaying) stopCurrentAudio();
    const currentIndex = aiMessages.findIndex(m => m.id === activeMessageId);
    const newIndex = (currentIndex - 1 + aiMessages.length) % aiMessages.length;
    setActiveMessageId(aiMessages[newIndex].id);
  }, [aiMessages, activeMessageId, isAudioPlaying, stopCurrentAudio]);

  const handleNextCard = useCallback(() => {
    if (aiMessages.length === 0) return;
    if (isAudioPlaying) stopCurrentAudio();
    const currentIndex = aiMessages.findIndex(m => m.id === activeMessageId);
    const newIndex = (currentIndex + 1) % aiMessages.length;
    setActiveMessageId(aiMessages[newIndex].id);
  }, [aiMessages, activeMessageId, isAudioPlaying, stopCurrentAudio]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > swipeThreshold) handleNextCard();
    else if (distance < -swipeThreshold) handlePrevCard();
  }, [touchStart, touchEnd, handleNextCard, handlePrevCard]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      if (e.deltaX > 30) handleNextCard();
      else if (e.deltaX < -30) handlePrevCard();
    }
  }, [handleNextCard, handlePrevCard]);

  return {
    activeMessageId,
    setActiveMessageId,
    currentMessage,
    aiMessages,
    resetNavigation,
    handleCarouselAudioEnd,
    handlePrevCard,
    handleNextCard,
    touchHandlers: { handleTouchStart, handleTouchMove, handleTouchEnd },
    handleWheel
  };
};
