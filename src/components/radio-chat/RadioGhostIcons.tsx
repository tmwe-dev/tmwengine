import { cn } from '@/lib/utils';
import { FileText, Keyboard } from 'lucide-react';
import { AISidebarTrigger } from '@/components/ai/AISidebarTrigger';
import { RadioSidebarTrigger } from './RadioSidebarTrigger';
import { RadioMicTrigger } from './RadioMicTrigger';
import { RadioMessage } from '@/types/radio';
import { useRadioChatContext } from '@/contexts/RadioChatContext';

interface RadioGhostIconsProps {
  currentMessage: RadioMessage | null;
}

export const RadioGhostIcons = ({ currentMessage }: RadioGhostIconsProps) => {
  const {
    shouldShowLeftIcons, sidebarOpen, crmMenuOpen, setCrmMenuOpen,
    aiSidebarOpen, setAiSidebarOpen, aiCanvasHasMessages,
    setSidebarOpen, isAudioEnabled, isAutoAdvanceEnabled,
    messageViewVisible, setMessageViewVisible,
    showAudioControls, setShowAudioControls,
    inputVisible, setInputVisible
  } = useRadioChatContext();

  const hiddenBySidebar = sidebarOpen;

  const showIcon = (featureActive: boolean) =>
    !hiddenBySidebar && (shouldShowLeftIcons || featureActive);

  return (
    <div
      className={cn(
        "fixed left-0 bottom-8 z-40 flex flex-col gap-0.5 transition-all duration-300",
        hiddenBySidebar && "opacity-0 pointer-events-none -translate-x-full"
      )}
    >
      {/* AI Assistant */}
      <AISidebarTrigger
        className={cn(
          "transition-all duration-300",
          !showIcon(aiSidebarOpen) && "opacity-0 pointer-events-none"
        )}
        isOpen={aiSidebarOpen}
        onToggle={() => setAiSidebarOpen(!aiSidebarOpen)}
        hasActiveConversation={aiCanvasHasMessages}
      />

      {/* Sidebar */}
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

      {/* FileText — hidden on short screens */}
      <button
        onClick={() => setMessageViewVisible(!messageViewVisible)}
        className={cn(
          "w-10 h-10 bg-transparent rounded-r-lg border border-border/20",
          "flex items-center justify-center transition-all duration-300 hover:bg-muted/5",
          "max-h-[600px]:hidden",
          !showIcon(messageViewVisible) && "opacity-0 pointer-events-none"
        )}
        aria-label="Toggle message view"
      >
        <FileText
          className={cn(
            "w-5 h-5 transition-colors",
            messageViewVisible ? 'text-primary' : (currentMessage ? 'text-primary' : 'text-muted-foreground')
          )}
          strokeWidth={1}
        />
      </button>

      {/* Mic */}
      <RadioMicTrigger
        className={cn(
          "transition-all duration-300",
          !showIcon(showAudioControls) && "opacity-0 pointer-events-none"
        )}
        isActive={showAudioControls}
        onClick={() => setShowAudioControls(!showAudioControls)}
      />

      {/* Keyboard — hidden on short screens */}
      <button
        onClick={() => setInputVisible(!inputVisible)}
        className={cn(
          "w-10 h-10 bg-transparent rounded-r-lg border border-border/20",
          "flex items-center justify-center transition-all duration-300 hover:bg-muted/5",
          "max-h-[600px]:hidden",
          !showIcon(inputVisible) && "opacity-0 pointer-events-none"
        )}
        aria-label="Toggle input"
      >
        <Keyboard
          className={cn(
            "w-5 h-5 transition-colors",
            inputVisible ? 'text-primary' : 'text-muted-foreground'
          )}
          strokeWidth={1}
        />
      </button>
    </div>
  );
};
