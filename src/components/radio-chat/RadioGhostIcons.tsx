import { cn } from '@/lib/utils';
import { FileText, Keyboard } from 'lucide-react';
import { RadioMicTrigger } from './RadioMicTrigger';
import { RadioMessage } from '@/types/radio';
import { useRadioChatContext } from '@/contexts/RadioChatContext';
import { useCRMSidebar } from '@/contexts/CRMLayoutContext';

interface RadioGhostIconsProps {
  currentMessage: RadioMessage | null;
}

/**
 * RadioGhostIcons — quick-action icons rendered inside the CRM sidebar footer
 * via SidebarFooterPortal. No longer uses fixed positioning.
 */
export const RadioGhostIcons = ({ currentMessage }: RadioGhostIconsProps) => {
  const {
    aiSidebarOpen, setAiSidebarOpen, aiCanvasHasMessages,
    isAudioEnabled, isAutoAdvanceEnabled,
    messageViewVisible, setMessageViewVisible,
    showAudioControls, setShowAudioControls,
    inputVisible, setInputVisible
  } = useRadioChatContext();
  
  const { menuOpen, aiSidebarOpen: globalAiOpen, setAiSidebarOpen: setGlobalAiOpen, setMenuOpen } = useCRMSidebar();

  return (
    <div className="flex flex-col gap-0.5 w-full">
      {/* AI Assistant */}
      <button
        onClick={() => {
          setGlobalAiOpen(!globalAiOpen);
          if (!menuOpen) setMenuOpen(true);
        }}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg",
          "text-sm transition-all duration-200",
          "hover:bg-primary/10",
          globalAiOpen ? "text-purple-400" : "text-muted-foreground"
        )}
        aria-label="Toggle AI Assistant"
      >
        <span className="w-5 h-5 flex items-center justify-center">✨</span>
        {menuOpen && <span className="text-xs">AI</span>}
      </button>

      {/* FileText — message view */}
      <button
        onClick={() => setMessageViewVisible(!messageViewVisible)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg",
          "text-sm transition-all duration-200",
          "hover:bg-muted/10",
          messageViewVisible ? 'text-primary' : (currentMessage ? 'text-primary' : 'text-muted-foreground')
        )}
        aria-label="Toggle message view"
      >
        <FileText className="w-4 h-4" strokeWidth={1} />
        {menuOpen && <span className="text-xs">Messages</span>}
      </button>

      {/* Mic */}
      <RadioMicTrigger
        className="w-full"
        isActive={showAudioControls}
        onClick={() => setShowAudioControls(!showAudioControls)}
      />

      {/* Keyboard — input toggle */}
      <button
        onClick={() => setInputVisible(!inputVisible)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg",
          "text-sm transition-all duration-200",
          "hover:bg-muted/10",
          inputVisible ? 'text-primary' : 'text-muted-foreground'
        )}
        aria-label="Toggle input"
      >
        <Keyboard className="w-4 h-4" strokeWidth={1} />
        {menuOpen && <span className="text-xs">Input</span>}
      </button>
    </div>
  );
};
