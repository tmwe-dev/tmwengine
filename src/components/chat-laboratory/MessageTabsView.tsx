import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiAgentMessage } from './MultiAgentMessage';
import { User, Bot, Sparkles, Brain } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const getTabIcon = (type: string) => {
  switch (type) {
    case 'human':
      return <User className="h-3 w-3" />;
    case 'chatgpt':
      return <Sparkles className="h-3 w-3" />;
    case 'gemini':
      return <Brain className="h-3 w-3" />;
    case 'claude':
      return <Bot className="h-3 w-3" />;
    default:
      return <Bot className="h-3 w-3" />;
  }
};

const getTabLabel = (message: Message, index: number) => {
  return `${index + 1}. ${message.sender_name}`;
};

export const MessageTabsView = ({ messages }: MessageTabsViewProps) => {
  const [activeTab, setActiveTab] = useState(messages.length > 0 ? messages[0].id : '');

  if (messages.length === 0) {
    return null;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
      <ScrollArea className="w-full border-b">
        <TabsList className="inline-flex h-12 w-full justify-start rounded-none bg-muted/50 p-1">
          {messages.map((message, index) => (
            <TabsTrigger
              key={message.id}
              value={message.id}
              className="flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {getTabIcon(message.sender_type)}
              <span className="hidden sm:inline">{getTabLabel(message, index)}</span>
              <span className="sm:hidden">{index + 1}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </ScrollArea>

      <div className="flex-1 overflow-hidden">
        {messages.map((message) => (
          <TabsContent
            key={message.id}
            value={message.id}
            className="h-full m-0 p-4 overflow-y-auto focus-visible:outline-none focus-visible:ring-0"
          >
            <div className="container mx-auto max-w-4xl">
              <MultiAgentMessage message={message} />
            </div>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
};
