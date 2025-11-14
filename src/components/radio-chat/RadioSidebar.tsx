import { X, LayoutGrid, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioVoiceSelector } from './RadioVoiceSelector';
import { RadioPromptSelector } from './RadioPromptSelector';
import { RadioStrategySelector } from './RadioStrategySelector';
import { RadioParticipantSelector } from './RadioParticipantSelector';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface RadioParticipant {
  id: string;
  type: 'chatgpt' | 'gemini' | 'claude';
  name: string;
  is_active: boolean;
}

interface RadioSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string | null;
  viewMode: 'carousel' | 'messages';
  onViewModeChange: (mode: 'carousel' | 'messages') => void;
  isAutoAdvanceEnabled?: boolean;
  onAutoAdvanceChange?: (enabled: boolean) => void;
  participants: RadioParticipant[];
  onToggleParticipant: (id: string) => void;
  carouselZoom?: number;
  onCarouselZoomChange?: (zoom: number) => void;
}

export function RadioSidebar({ 
  isOpen, 
  onClose, 
  conversationId, 
  viewMode, 
  onViewModeChange,
  isAutoAdvanceEnabled = true,
  onAutoAdvanceChange,
  participants,
  onToggleParticipant,
  carouselZoom = 1.0,
  onCarouselZoomChange
}: RadioSidebarProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed left-0 right-0 bottom-0 top-14 bg-transparent backdrop-blur-sm z-40 animate-in fade-in"
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
          <div className="flex items-center justify-between p-4 border-b bg-transparent">
            <h2 className="text-lg font-semibold">Radio Chat Settings</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-transparent transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <ScrollArea className="flex-1">
            {/* Agent Selection - First in Sidebar */}
            <div className="p-4 border-b">
              <h3 className="text-sm font-medium mb-3">Active Agents</h3>
              <RadioParticipantSelector
                participants={participants}
                onToggle={onToggleParticipant}
              />
            </div>

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

                {/* Carousel Zoom Control */}
                {viewMode === 'carousel' && (
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Carousel Zoom</label>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(carouselZoom * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[carouselZoom]}
                      onValueChange={([val]) => onCarouselZoomChange?.(val)}
                      min={0.5}
                      max={2.0}
                      step={0.01}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>50%</span>
                      <span>200%</span>
                    </div>
                  </div>
                )}

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
                <RadioPromptSelector conversationId={conversationId} />
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}
