import { useState, useEffect } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { MultiAgentMessage, StructuredAttachments } from './MultiAgentMessage';
import { TabNavigation } from './TabNavigation';
import { NewMessagesIndicator } from './NewMessagesIndicator';
import { useTabSwitching } from '@/hooks/useTabSwitching';
import { useNewMessagesIndicator } from '@/hooks/useNewMessagesIndicator';
import { UploadedFile } from '@/components/chat/FileUploader';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  sender_name: string;
  content: string;
  is_visible_to_ai: boolean;
  attachments?: UploadedFile[] | StructuredAttachments;
  images?: string[];
  generated_images?: string[];
  token_input?: number;
  token_output?: number;
  tempo_risposta_ms?: number;
  created_at: string;
}

interface MessageTabsViewProps {
  messages: Message[];
  isAutoFollowEnabled?: boolean;
  onAutoFollowChange?: (enabled: boolean) => void;
  // 🔴 FASE 2: Unified audio controller from parent (Radio Chat)
  isAudioPlaying?: boolean;
  onAudioStart?: (messageId: string) => void;
  onAudioEnd?: () => void;
  conversationId?: string | null;
}

export const MessageTabsView = ({
  messages,
  isAutoFollowEnabled: externalAutoFollow,
  onAutoFollowChange,
  isAudioPlaying: externalAudioPlaying,
  onAudioStart: externalAudioStart,
  onAudioEnd: externalAudioEnd,
  conversationId
}: MessageTabsViewProps) => {
  const isAutoFollowEnabled = externalAutoFollow ?? true;

  // 🔴 FASE 2: Use external audio state if provided, otherwise local fallback
  const [localAudioPlaying, setLocalAudioPlaying] = useState(false);
  const isAudioPlaying = externalAudioPlaying ?? localAudioPlaying;

  const handleAudioStart = (messageId: string) => {
    if (externalAudioStart) {
      externalAudioStart(messageId);
    } else {
      setLocalAudioPlaying(true);
    }
  };

  const handleAudioEndLocal = () => {
    if (externalAudioEnd) {
      externalAudioEnd();
    } else {
      setLocalAudioPlaying(false);
    }
  };

  // 🎯 Hook tab switching con coda intelligente
  const {
    activeTab,
    setActiveTab,
    handleAudioEnd: tabSwitchOnAudioEnd,
    unseenMessagesQueue
  } = useTabSwitching({
    messages,
    isAutoFollowEnabled,
    isAudioPlaying,
    conversationId
  });

  // 🎯 Hook indicatore nuovi messaggi
  const {
    showNewMessages,
    newMessagesCount,
    scrollToBottom,
    handleScroll,
    messagesEndRef,
    tabContentRef
  } = useNewMessagesIndicator({
    isAutoFollowEnabled
  });

  // 🎯 State per sincronizzare tab switch dopo audio end
  const [shouldSwitchTab, setShouldSwitchTab] = useState(false);

  // 🔴 FASE 3: Callback completo — audio finisce, marca per tab switch
  const onAudioEndComplete = () => {
    console.log(`🎬 [MessageTabsView] onAudioEndComplete — audio ended for active tab`);
    handleAudioEndLocal();
    // Delay per assicurare che isAudioPlaying sia aggiornato
    setTimeout(() => {
      setShouldSwitchTab(true);
    }, 50);
  };

  // 🎯 Effetto: cambia tab DOPO che isAudioPlaying è aggiornato
  useEffect(() => {
    if (shouldSwitchTab && !isAudioPlaying) {
      console.log(`🔄 [MessageTabsView] Audio confirmed stopped, advancing tab`);
      tabSwitchOnAudioEnd();
      setShouldSwitchTab(false);
    }
  }, [shouldSwitchTab, isAudioPlaying, tabSwitchOnAudioEnd]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
      <TabNavigation messages={messages} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 relative">
        {messages.map((message) => (
          <TabsContent
            key={message.id}
            value={message.id}
            ref={activeTab === message.id ? tabContentRef : null}
            onScroll={handleScroll}
            className="absolute inset-0 m-0 overflow-y-auto data-[state=inactive]:hidden focus-visible:outline-none focus-visible:ring-0"
          >
            <div className="container mx-auto max-w-4xl p-4">
              <MultiAgentMessage
                message={message}
                onAudioEnd={onAudioEndComplete}
                onAudioStateChange={(playing) => {
                  if (playing) {
                    handleAudioStart(message.id);
                  }
                  // Don't call audioEnd on false — let onAudioEndComplete handle it
                }}
              />
              <div ref={messagesEndRef} />
            </div>
          </TabsContent>
        ))}

        <NewMessagesIndicator
          showIndicator={showNewMessages}
          newMessagesCount={newMessagesCount}
          onScrollToBottom={scrollToBottom}
        />
      </div>
    </Tabs>
  );
};
