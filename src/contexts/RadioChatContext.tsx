import React, { createContext, useContext } from 'react';
import { RadioViewMode } from '@/types/radio';

interface RadioChatContextValue {
  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  aiSidebarOpen: boolean;
  setAiSidebarOpen: (v: boolean) => void;
  messageViewVisible: boolean;
  setMessageViewVisible: (v: boolean) => void;
  showAudioControls: boolean;
  setShowAudioControls: (v: boolean) => void;
  inputVisible: boolean;
  setInputVisible: (v: boolean) => void;
  shouldShowLeftIcons: boolean;
  // CRM
  crmMenuOpen: boolean;
  setCrmMenuOpen: (v: boolean) => void;
  // AI canvas
  aiCanvasHasMessages: boolean;
  // Preferences
  isAudioEnabled: boolean;
  isAutoAdvanceEnabled: boolean;
  viewMode: RadioViewMode;
}

const RadioChatContext = createContext<RadioChatContextValue | null>(null);

export const useRadioChatContext = () => {
  const ctx = useContext(RadioChatContext);
  if (!ctx) throw new Error('useRadioChatContext must be used within RadioChatProvider');
  return ctx;
};

interface RadioChatProviderProps {
  value: RadioChatContextValue;
  children: React.ReactNode;
}

export const RadioChatProvider = ({ value, children }: RadioChatProviderProps) => (
  <RadioChatContext.Provider value={value}>{children}</RadioChatContext.Provider>
);
