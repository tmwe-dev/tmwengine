import { useState, useEffect } from 'react';
import { RadioSidebarTab } from '@/types/radio';

export const useRadioUIState = () => {
  const [isNearLeftEdge, setIsNearLeftEdge] = useState(false);
  const [isHoveringInputZone, setIsHoveringInputZone] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [messageViewVisible, setMessageViewVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<RadioSidebarTab>('settings');
  const [debugPopupOpen, setDebugPopupOpen] = useState(false);
  const [showAudioControls, setShowAudioControls] = useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);

  // Ghost Icons: mouse proximity detection
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setIsNearLeftEdge(e.clientX <= 100);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Debug popup toggle from header
  useEffect(() => {
    const handleToggleDebug = () => setDebugPopupOpen(prev => !prev);
    window.addEventListener('toggle-debug-popup', handleToggleDebug);
    return () => window.removeEventListener('toggle-debug-popup', handleToggleDebug);
  }, []);

  // Hotkey Ctrl+M for audio controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        setShowAudioControls(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const shouldShowLeftIcons = isNearLeftEdge || sidebarOpen;

  return {
    isNearLeftEdge,
    isHoveringInputZone, setIsHoveringInputZone,
    inputVisible, setInputVisible,
    messageViewVisible, setMessageViewVisible,
    sidebarOpen, setSidebarOpen,
    activeSidebarTab, setActiveSidebarTab,
    debugPopupOpen, setDebugPopupOpen,
    showAudioControls, setShowAudioControls,
    aiSidebarOpen, setAiSidebarOpen,
    shouldShowLeftIcons
  };
};
