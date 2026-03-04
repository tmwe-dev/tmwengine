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
  aiSidebarOpen: boolean;
  setAiSidebarOpen: (v: boolean) => void;
  aiCanvasHasMessages: boolean;
  setSidebarOpen: (v: boolean) => void;
  isAudioEnabled: boolean;
  isAutoAdvanceEnabled: boolean;
  messageViewVisible: boolean;
  setMessageViewVisible: (v: boolean) => void;
  currentMessage: RadioMessage | null;
  showAudioControls: boolean;
  setShowAudioControls: (v: boolean) => void;
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
  const hiddenBySidebar = sidebarOpen;

  // Each icon is visible if: sidebar closed AND (mouse nearby OR that feature is active)
  const showIcon = (featureActive: boolean) =>
    !hiddenBySidebar && (shouldShowLeftIcons || featureActive);

  return (
    <div
      className={cn(
        "fixed left-0 bottom-8 z-40 flex flex-col gap-1 transition-all duration-300",
        hiddenBySidebar && "opacity-0 pointer-events-none -translate-x-full"
      )}
    >
      {/* AI Assistant Trigger */}
      <AISidebarTrigger
        className={cn(
          "transition-all duration-300",
          !showIcon(aiSidebarOpen) && "opacity-0 pointer-events-none"
        )}
        isOpen={aiSidebarOpen}
        onToggle={() => setAiSidebarOpen(!aiSidebarOpen)}
        hasActiveConversation={aiCanvasHasMessages}
      />

      {/* Hamburger Sidebar */}
      <RadioSidebarTrigger
        className={cn(
          "transition-all duration-300",
          !showIcon(false) && "opacity-0 pointer-events-none"
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
          "w-12 h-14 bg-transparent rounded-r-lg border border-border/20",
          "flex items-center justify-center transition-all duration-300 hover:bg-muted/5",
          !showIcon(messageViewVisible) && "opacity-0 pointer-events-none"
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
          "transition-all duration-300",
          !showIcon(showAudioControls) && "opacity-0 pointer-events-none"
        )}
        isActive={showAudioControls}
        onClick={() => setShowAudioControls(!showAudioControls)}
      />

      {/* Keyboard Icon */}
      <button
        onClick={() => setInputVisible(!inputVisible)}
        className={cn(
          "w-12 h-14 bg-transparent rounded-r-lg border border-border/20",
          "flex items-center justify-center transition-all duration-300 hover:bg-muted/5",
          !showIcon(inputVisible) && "opacity-0 pointer-events-none"
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
    </div>
  );
};
