import { useRef, useState } from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { User, Bot, Sparkles, Brain, ChevronLeft, ChevronRight } from 'lucide-react';

interface Message {
  id: string;
  sender_type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  sender_name: string;
}

interface TabNavigationProps {
  messages: Message[];
  activeTab: string;
  onTabChange: (id: string) => void;
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

export const TabNavigation = ({ messages, activeTab, onTabChange }: TabNavigationProps) => {
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

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
    const walk = (x - startX) * 2;
    tabsContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (!tabsContainerRef.current) return;
    const scrollAmount = 200;
    tabsContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="relative w-full border-b bg-muted/50">
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 z-10 bg-background/80 hover:bg-background"
        onClick={() => scrollTabs('left')}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

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

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 z-10 bg-background/80 hover:bg-background"
        onClick={() => scrollTabs('right')}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
