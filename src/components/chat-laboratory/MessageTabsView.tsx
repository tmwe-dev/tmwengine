import { useRef, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MultiAgentMessage } from './MultiAgentMessage';
import { Bot, User, Sparkles, Brain } from 'lucide-react';
import { TabNavigation } from './TabNavigation';
import { useTabSwitching } from '@/hooks/useTabSwitching';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  sender_name: string;
  content: string;
  is_visible_to_ai: boolean;
  attachments?: any[];
  images?: string[];
  generated_images?: string[];
  token_input?: number;
  token_output?: number;
  tempo_risposta_ms?: number;
  created_at: string;
}

interface MessageTabsViewProps {
  messages: Message[];
}

export const MessageTabsView = ({
  messages
}: MessageTabsViewProps) => {
  // Tab switching logic
  const { activeTab, setActiveTab } = useTabSwitching({ messages });

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
            className="absolute inset-0 m-0 overflow-y-auto data-[state=inactive]:hidden focus-visible:outline-none focus-visible:ring-0"
          >
            <div className="container mx-auto max-w-4xl p-4">
              <MultiAgentMessage
                message={message}
                onAudioEnd={() => {
                  const currentIdx = messages.findIndex(m => m.id === activeTab);
                  if (currentIdx >= 0 && currentIdx < messages.length - 1) {
                    setActiveTab(messages[currentIdx + 1].id);
                  }
                }}
              />
            </div>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
};
