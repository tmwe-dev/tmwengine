import { X, LayoutGrid, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioVoiceSelector } from './RadioVoiceSelector';
import { RadioPromptSelector } from './RadioPromptSelector';
import { RadioStrategySelector } from './RadioStrategySelector';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface RadioSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string | null;
  viewMode: 'carousel' | 'messages';
  onViewModeChange: (mode: 'carousel' | 'messages') => void;
  isAutoAdvanceEnabled?: boolean;
  onAutoAdvanceChange?: (enabled: boolean) => void;
}

export function RadioSidebar({ 
  isOpen, 
  onClose, 
  conversationId, 
  viewMode, 
  onViewModeChange,
  isAutoAdvanceEnabled = true,
  onAutoAdvanceChange
}: RadioSidebarProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed left-0 right-0 bottom-0 top-14 bg-transparent z-40 animate-in fade-in"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-80 bg-transparent border-r z-50",
        "transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Radio Chat Settings</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <ScrollArea className="flex-1">
            <Tabs defaultValue="voice" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
                <TabsTrigger value="voice" className="text-xs">Voice</TabsTrigger>
                <TabsTrigger value="strategy" className="text-xs">Strategy</TabsTrigger>
                <TabsTrigger value="prompts" className="text-xs">Prompts</TabsTrigger>
              </TabsList>

              <TabsContent value="voice" className="mt-0">
                {/* Toggle Carousel/Messages */}
                <div className="p-4 border-b flex flex-col gap-2">
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
                </div>

                <RadioVoiceSelector 
                  conversationId={conversationId}
                  isAutoAdvanceEnabled={isAutoAdvanceEnabled}
                  onAutoAdvanceChange={onAutoAdvanceChange}
                />
              </TabsContent>

              <TabsContent value="strategy" className="mt-0">
                <RadioStrategySelector conversationId={conversationId} />
              </TabsContent>

              <TabsContent value="prompts" className="mt-0">
                <RadioPromptSelector />
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}
