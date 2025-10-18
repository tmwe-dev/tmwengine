import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiAgentMessage } from './MultiAgentMessage';
import { User, Bot, Sparkles, Brain, ChevronLeft, ChevronRight } from 'lucide-react';
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
  isAutoFollowEnabled?: boolean;
  onAutoFollowChange?: (enabled: boolean) => void;
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

export const MessageTabsView = ({ 
  messages,
  isAutoFollowEnabled: externalAutoFollow,
  onAutoFollowChange 
}: MessageTabsViewProps) => {
  // Usa lo stato esterno se fornito, altrimenti usa lo stato interno
  const isAutoFollowEnabled = externalAutoFollow ?? true;
  
  const [activeTab, setActiveTab] = useState(messages.length > 0 ? messages[0].id : '');
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);
  const previousMessagesLengthRef = useRef(0);
  
  
  // Drag-to-scroll state
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // ✅ Monitora cambio tab e triggera audio se disponibile
  useEffect(() => {
    const currentMessage = messages.find(m => m.id === activeTab);
    if (currentMessage?.sender_type !== 'human') {
      console.log(`🔊 Tab attivo: ${currentMessage?.sender_name} - Audio pronto per partire`);
    }
  }, [activeTab, messages]);

  useEffect(() => {
    if (messages.length > previousMessagesLengthRef.current) {
      const newMessage = messages[previousMessagesLengthRef.current];
      
      if (!newMessage) {
        previousMessagesLengthRef.current = messages.length;
        return;
      }
      
      // Determina se è il primo messaggio AI
      const aiMessagesBeforeThis = messages
        .slice(0, previousMessagesLengthRef.current)
        .filter(m => m.sender_type !== 'human').length;
      const isFirstMessage = newMessage.sender_type !== 'human' && aiMessagesBeforeThis === 0;
      
      if (isAutoFollowEnabled) {
        // ✅ MESSAGGIO HUMAN: attiva sempre immediatamente
        if (newMessage.sender_type === 'human') {
          console.log(`📨 Messaggio user → Attivo tab immediatamente`);
          setActiveTab(newMessage.id);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
        // ✅ PRIMO MESSAGGIO AI: attiva tab e avvia audio
        else if (isFirstMessage) {
          console.log(`📨 Primo messaggio AI da ${newMessage.sender_name} → Cambio tab`);
          setActiveTab(newMessage.id);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
        // ⏳ MESSAGGI AI SUCCESSIVI: NON cambiare tab (aspetta handleAudioEnd)
        else {
          console.log(`📨 Messaggio AI da ${newMessage.sender_name} → In coda (audio in corso)`);
        }
      } else {
        // Auto-follow disabilitato: mostra indicatore se necessario
        const container = tabContentRef.current;
        if (!container) {
          previousMessagesLengthRef.current++;
          return;
        }
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        
        if (isNearBottom) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          setShowNewMessages(false);
          setNewMessagesCount(0);
        } else {
          setShowNewMessages(true);
          setNewMessagesCount(prev => prev + 1);
        }
      }
      
      previousMessagesLengthRef.current++;
    }
  }, [messages, isAutoFollowEnabled]);

  const handleAudioEnd = () => {
    if (!isAutoFollowEnabled) return;
    
    const currentIndex = messages.findIndex(m => m.id === activeTab);
    const nextMessage = messages[currentIndex + 1];
    
    if (nextMessage) {
      console.log(`🎵 Audio finito → Passo al tab successivo: ${nextMessage.sender_name}`);
      setActiveTab(nextMessage.id);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

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

  // Drag-to-scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tabsContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - tabsContainerRef.current.offsetLeft);
    setScrollLeft(tabsContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tabsContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabsContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Moltiplicatore per velocità scroll
    tabsContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Scroll con frecce
  const scrollTabs = (direction: 'left' | 'right') => {
    if (!tabsContainerRef.current) return;
    const scrollAmount = 200;
    tabsContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
      <div className="relative w-full border-b bg-muted/50">
        {/* Freccia Sinistra */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 z-10 bg-background/80 hover:bg-background"
          onClick={() => scrollTabs('left')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Container Tabs con drag-to-scroll */}
        <div
          ref={tabsContainerRef}
          className="overflow-x-auto px-12 pb-2 tabs-scroll-container"
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
            scrollbarWidth: 'thin',
            scrollbarColor: 'transparent transparent'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <TabsList className="inline-flex h-12 bg-transparent p-1 w-auto">
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
        </div>

        {/* Freccia Destra */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 z-10 bg-background/80 hover:bg-background"
          onClick={() => scrollTabs('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

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
                onAudioEnd={handleAudioEnd}
              />
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
