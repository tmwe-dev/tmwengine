import { useState, useEffect } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { MultiAgentMessage, StructuredAttachments } from './MultiAgentMessage';
import { TabNavigation } from './TabNavigation';
import { NewMessagesIndicator } from './NewMessagesIndicator';
import { useTabSwitching } from '@/hooks/useTabSwitching';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
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
}

export const MessageTabsView = ({
  messages,
  isAutoFollowEnabled: externalAutoFollow,
  onAutoFollowChange
}: MessageTabsViewProps) => {
  const isAutoFollowEnabled = externalAutoFollow ?? true;

  // 🎯 Hook audio playback
  const { isAudioPlaying, handleAudioStart, handleAudioEnd: audioEnd, handleAudioError } = useAudioPlayback();

  // 🎯 Hook tab switching con coda intelligente
  const {
    activeTab,
    setActiveTab,
    handleAudioEnd: tabSwitchOnAudioEnd,
    unseenMessagesQueue
  } = useTabSwitching({
    messages,
    isAutoFollowEnabled,
    isAudioPlaying
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

  // 🎯 Callback completo: quando audio finisce, setta flag per tab switch
  const onAudioEndComplete = () => {
    console.log(`🎬 [MessageTabsView] onAudioEndComplete chiamato`);
    audioEnd(); // Setta isAudioPlaying = false (asincrono)
    
    // 🔴 Delay per assicurare che isAudioPlaying sia aggiornato
    setTimeout(() => {
      setShouldSwitchTab(true);
    }, 50); // 50ms delay
  };

  // 🎯 Effetto: cambia tab DOPO che isAudioPlaying è aggiornato
  useEffect(() => {
    if (shouldSwitchTab && !isAudioPlaying) {
      console.log(`🔄 [MessageTabsView] Sincronizzazione completata, cambio tab`);
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
                onAudioStateChange={(playing) => (playing ? handleAudioStart() : audioEnd())}
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
