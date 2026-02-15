import { cn } from '@/lib/utils';
import { FileText, Keyboard } from 'lucide-react';
import { AISidebarTrigger } from '@/components/ai/AISidebarTrigger';
import { RadioSidebarTrigger } from './RadioSidebarTrigger';
import { RadioMicTrigger } from './RadioMicTrigger';
import { RadioMessage } from '@/types/radio';

interface RadioGhostIconsProps {
  shouldShowLeftIcons: boolean;
  sidebarOpen: boolean;
  crmMenuOpen: boolean;
  setCrmMenuOpen: (v: boolean) => void;
  // AI sidebar
  aiSidebarOpen: boolean;
  setAiSidebarOpen: (v: boolean) => void;
  aiCanvasHasMessages: boolean;
  // Sidebar trigger
  setSidebarOpen: (v: boolean) => void;
  isAudioEnabled: boolean;
  isAutoAdvanceEnabled: boolean;
  // Message view
  messageViewVisible: boolean;
  setMessageViewVisible: (v: boolean) => void;
  currentMessage: RadioMessage | null;
  // Mic
  showAudioControls: boolean;
  setShowAudioControls: (v: boolean) => void;
  // Input
  inputVisible: boolean;
  setInputVisible: (v: boolean) => void;
}

export const RadioGhostIcons = ({
  shouldShowLeftIcons, sidebarOpen, crmMenuOpen, setCrmMenuOpen,
  aiSidebarOpen, setAiSidebarOpen, aiCanvasHasMessages,
  setSidebarOpen, isAudioEnabled, isAutoAdvanceEnabled,
  messageViewVisible, setMessageViewVisible, currentMessage,
  showAudioControls, setShowAudioControls,
  inputVisible, setInputVisible
}: RadioGhostIconsProps) => {
  return (
    <>
      {/* AI Assistant Trigger */}
      <AISidebarTrigger
        className={cn(
          "fixed left-0 bottom-[24rem] z-40 transition-all duration-300",
          sidebarOpen && "translate-x-[320px]",
          !shouldShowLeftIcons && !aiSidebarOpen && "opacity-0 pointer-events-none",
          (shouldShowLeftIcons || aiSidebarOpen) && "opacity-100"
        )}
        isOpen={aiSidebarOpen}
        onToggle={() => setAiSidebarOpen(!aiSidebarOpen)}
        hasActiveConversation={aiCanvasHasMessages}
      />

      {/* Hamburger Sidebar */}
      <RadioSidebarTrigger
        className={cn(
          "fixed left-0 bottom-[18.5rem] z-40 transition-all duration-300",
          sidebarOpen && "translate-x-[320px]",
          !shouldShowLeftIcons && "opacity-0 pointer-events-none",
          shouldShowLeftIcons && !sidebarOpen && "opacity-100"
        )}
        isOpen={sidebarOpen}
        onToggle={() => {
          const newState = !sidebarOpen;
          setSidebarOpen(newState);
          if (newState && crmMenuOpen) setCrmMenuOpen(false);
        }}
        isAudioEnabled={isAudioEnabled}
        isAutoAdvanceEnabled={isAutoAdvanceEnabled}
      />

      {/* FileText Icon */}
      <button
        onClick={() => setMessageViewVisible(!messageViewVisible)}
        className={cn(
          "fixed left-0 bottom-[13rem] z-40 w-12 h-20 bg-transparent rounded-r-lg border border-border/20",
          "flex items-center justify-center transition-all duration-300 hover:bg-muted/5",
          sidebarOpen && "translate-x-[320px]",
          !shouldShowLeftIcons && !messageViewVisible && "opacity-0 pointer-events-none",
          (shouldShowLeftIcons || messageViewVisible) && "opacity-100"
        )}
        aria-label="Toggle message view"
      >
        <FileText
          className={cn(
            "w-6 h-6 transition-colors",
            messageViewVisible ? 'text-primary' : (currentMessage ? 'text-primary' : 'text-muted-foreground')
          )}
          strokeWidth={1}
        />
      </button>

      {/* Mic Icon */}
      <RadioMicTrigger
        className={cn(
          "fixed left-0 bottom-[7.5rem] z-40 transition-all duration-300",
          sidebarOpen && "translate-x-[320px]",
          !shouldShowLeftIcons && !showAudioControls && "opacity-0 pointer-events-none",
          (shouldShowLeftIcons || showAudioControls) && "opacity-100"
        )}
        isActive={showAudioControls}
        onClick={() => setShowAudioControls(!showAudioControls)}
      />

      {/* Keyboard Icon */}
      <button
        onClick={() => setInputVisible(!inputVisible)}
        className={cn(
          "fixed left-0 bottom-8 z-40 w-12 h-20 bg-transparent rounded-r-lg border border-border/20",
          "flex items-center justify-center transition-all duration-300 hover:bg-muted/5",
          sidebarOpen && "translate-x-[320px]",
          !shouldShowLeftIcons && !inputVisible && "opacity-0 pointer-events-none",
          (shouldShowLeftIcons || inputVisible) && "opacity-100"
        )}
        aria-label="Toggle input"
      >
        <Keyboard
          className={cn(
            "w-6 h-6 transition-colors",
            inputVisible ? 'text-primary' : 'text-muted-foreground'
          )}
          strokeWidth={1}
        />
      </button>
    </>
  );
};
