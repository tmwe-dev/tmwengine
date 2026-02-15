import { cn } from '@/lib/utils';
import { RadioConversationsSidebar } from './RadioConversationsSidebar';
import { RadioSidebar } from './RadioSidebar';
import { RadioParticipant, RadioConversation, RadioSidebarTab, RadioViewMode } from '@/types/radio';

interface RadioSidebarPanelProps {
  isOpen: boolean;
  activeSidebarTab: RadioSidebarTab;
  setActiveSidebarTab: (tab: RadioSidebarTab) => void;
  // Conversations tab
  conversations: RadioConversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onGenerateSummary: (id: string) => void;
  onGenerateFullReport: (id: string) => void;
  // Settings tab
  conversationId: string | null;
  viewMode: RadioViewMode;
  onViewModeChange: (mode: RadioViewMode) => void;
  isAutoAdvanceEnabled: boolean;
  onAutoAdvanceChange: (v: boolean) => void;
  participants: RadioParticipant[];
  onToggleParticipant: (id: string) => void;
  carouselZoom: number;
  onCarouselZoomChange: (z: number) => void;
  // Close
  onClose: () => void;
  crmMenuOpen: boolean;
  setCrmMenuOpen: (v: boolean) => void;
}

export const RadioSidebarPanel = ({
  isOpen, activeSidebarTab, setActiveSidebarTab,
  conversations, currentConversationId,
  onSelectConversation, onNewConversation, onDeleteConversation, onUpdateTitle,
  onGenerateSummary, onGenerateFullReport,
  conversationId, viewMode, onViewModeChange,
  isAutoAdvanceEnabled, onAutoAdvanceChange,
  participants, onToggleParticipant,
  carouselZoom, onCarouselZoomChange,
  onClose, crmMenuOpen, setCrmMenuOpen
}: RadioSidebarPanelProps) => {
  return (
    <div className={cn(
      "fixed left-0 top-24 md:top-28 h-[calc(100vh-6rem)] md:h-[calc(100vh-7rem)] w-[320px] bg-transparent border-r border-border/40 z-50 transition-transform duration-300",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Tab Navigation */}
      <div className="flex border-b border-border/40">
        <button
          onClick={() => setActiveSidebarTab('conversations')}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors",
            activeSidebarTab === 'conversations'
              ? 'bg-primary/10 text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveSidebarTab('settings')}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors",
            activeSidebarTab === 'settings'
              ? 'bg-primary/10 text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Impostazioni
        </button>
      </div>

      {/* Tab Content */}
      {activeSidebarTab === 'conversations' ? (
        <RadioConversationsSidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={(id) => {
            onSelectConversation(id);
            onClose();
            if (crmMenuOpen) setCrmMenuOpen(false);
          }}
          onNewConversation={() => {
            onNewConversation();
            onClose();
            if (crmMenuOpen) setCrmMenuOpen(false);
          }}
          onDeleteConversation={onDeleteConversation}
          onUpdateTitle={onUpdateTitle}
          onCloseSidebar={onClose}
          onGenerateSummary={onGenerateSummary}
          onGenerateFullReport={onGenerateFullReport}
        />
      ) : (
        <RadioSidebar
          isOpen={true}
          onClose={() => {
            onClose();
            if (crmMenuOpen) setCrmMenuOpen(false);
          }}
          conversationId={conversationId}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          isAutoAdvanceEnabled={isAutoAdvanceEnabled}
          onAutoAdvanceChange={onAutoAdvanceChange}
          participants={participants}
          onToggleParticipant={onToggleParticipant}
          carouselZoom={carouselZoom}
          onCarouselZoomChange={onCarouselZoomChange}
        />
      )}
    </div>
  );
};
