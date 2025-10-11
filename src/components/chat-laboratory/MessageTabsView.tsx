import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiAgentMessage } from './MultiAgentMessage';
import { User, Bot, Sparkles, Brain } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);
  const previousMessagesLengthRef = useRef(0);

  useEffect(() => {
    const container = tabContentRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (messages.length > previousMessagesLengthRef.current) {
      const newCount = messages.length - previousMessagesLengthRef.current;
      
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShowNewMessages(false);
        setNewMessagesCount(0);
      } else {
        setShowNewMessages(true);
        setNewMessagesCount(prev => prev + newCount);
      }
    }
    
    previousMessagesLengthRef.current = messages.length;
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowNewMessages(false);
    setNewMessagesCount(0);
  };

  const handleScroll = () => {
    const container = tabContentRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (isNearBottom && showNewMessages) {
      setShowNewMessages(false);
      setNewMessagesCount(0);
    }
  };

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
              <MultiAgentMessage message={message} />
              <div ref={messagesEndRef} />
            </div>
          </TabsContent>
        ))}

        {/* New Messages Indicator */}
        {showNewMessages && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 animate-fade-in">
            <Button
              onClick={scrollToBottom}
              variant="secondary"
              size="sm"
              className="shadow-lg border border-border/40 gap-2 bg-card/95 backdrop-blur hover:bg-card"
            >
              <Badge variant="default" className="rounded-full px-1.5 py-0.5 min-w-[20px] text-xs">
                {newMessagesCount}
              </Badge>
              <span className="text-sm">Nuovi messaggi</span>
              <span className="text-lg">↓</span>
            </Button>
          </div>
        )}
      </div>
    </Tabs>
  );
};
