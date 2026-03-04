import { cn } from '@/lib/utils';
import { X, LayoutGrid, MessageSquare, Columns } from 'lucide-react';
import { RadioConversationsSidebar } from './RadioConversationsSidebar';
import { RadioParticipantSelector } from './RadioParticipantSelector';
import { RadioVoiceSelector } from './RadioVoiceSelector';
import { RadioStrategySelector } from './RadioStrategySelector';
import { RadioPromptSelector } from './RadioPromptSelector';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
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

type PanelTab = 'conversations' | 'agents' | 'config';

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
  // Map the external tab type to our internal 3-tab system
  const activeTab: PanelTab = activeSidebarTab === 'conversations' ? 'conversations' : 
    activeSidebarTab === 'settings' ? 'agents' : 'agents';
  
  const [internalTab, setInternalTab] = React.useState<PanelTab>(activeTab);

  // Sync external tab changes
  React.useEffect(() => {
    if (activeSidebarTab === 'conversations') setInternalTab('conversations');
    else setInternalTab('agents');
  }, [activeSidebarTab]);

  const tabs: { id: PanelTab; label: string }[] = [
    { id: 'conversations', label: 'Chat' },
    { id: 'agents', label: 'Agenti' },
    { id: 'config', label: 'Config' },
  ];

  return (
    <div className={cn(
      "fixed left-0 top-24 md:top-28 h-[calc(100vh-6rem)] md:h-[calc(100vh-7rem)] w-[320px] bg-transparent border-r border-border/40 z-50 transition-transform duration-300",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Tab Navigation + Close */}
      <div className="flex items-center border-b border-border/40">
        <div className="flex flex-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setInternalTab(tab.id)}
              className={cn(
                "flex-1 px-3 py-3 text-sm font-medium transition-colors",
                internalTab === tab.id
                  ? 'bg-primary/10 text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="p-2 mr-1 rounded-lg hover:bg-muted/10 transition-colors"
          aria-label="Chiudi sidebar"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Tab Content */}
      {internalTab === 'conversations' && (
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
      )}

      {internalTab === 'agents' && (
        <ScrollArea className="h-[calc(100%-3rem)]">
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium mb-3">Active Agents</h3>
            <RadioParticipantSelector
              participants={participants}
              onToggle={onToggleParticipant}
            />
          </div>
          <RadioVoiceSelector
            conversationId={conversationId}
            isAutoAdvanceEnabled={isAutoAdvanceEnabled}
            onAutoAdvanceChange={onAutoAdvanceChange}
          />
        </ScrollArea>
      )}

      {internalTab === 'config' && (
        <ScrollArea className="h-[calc(100%-3rem)]">
          {/* View Mode Selector */}
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium mb-3">View Mode</h3>
            <div className="flex flex-col gap-2">
              <Button
                variant={viewMode === 'carousel' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('carousel')}
                className="w-full justify-start"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Carousel
              </Button>
              <Button
                variant={viewMode === 'messages' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('messages')}
                className="w-full justify-start"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Messages
              </Button>
              <Button
                variant={viewMode === 'tabs' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('tabs')}
                className="w-full justify-start"
              >
                <Columns className="w-4 h-4 mr-2" />
                Tabs
              </Button>
            </div>
          </div>

          <RadioStrategySelector conversationId={conversationId} />
          <RadioPromptSelector conversationId={conversationId} />
        </ScrollArea>
      )}
    </div>
  );
};

// Need React import for useState/useEffect
import React from 'react';
