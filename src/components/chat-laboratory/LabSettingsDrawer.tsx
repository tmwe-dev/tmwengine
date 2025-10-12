import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';
import { TokenCounterBadge } from '@/components/chat/TokenCounterBadge';
import { ConversationCostBadge } from '@/components/chat/ConversationCostBadge';
import { ExportSummaryButton } from '@/components/chat/ExportSummaryButton';
import { LaboratoryPromptManager } from './LaboratoryPromptManager';
import { CollapsibleBarSection } from './CollapsibleBarSection';

interface Participant {
  id: string;
  type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  name: string;
  is_active: boolean;
}

interface LabSettingsDrawerProps {
  currentConversationId: string | null;
  viewMode: 'classic' | 'tabs';
  setViewMode: (mode: 'classic' | 'tabs') => void;
  participants: Participant[];
  toggleParticipant: (id: string) => void;
  isBarMode: boolean;
  setIsBarMode: (enabled: boolean) => void;
  selectedElevenLabsAgents: string[];
  setSelectedElevenLabsAgents: (agents: string[]) => void;
  activeKnowledgeBase: string | null;
  setActiveKnowledgeBase: (kb: string | null) => void;
}

const PARTICIPANT_ICONS = {
  human: { icon: '👤', color: 'text-blue-600', bg: 'bg-blue-100' },
  chatgpt: { icon: '🤖', color: 'text-green-600', bg: 'bg-green-100' },
  gemini: { icon: '🔷', color: 'text-cyan-600', bg: 'bg-cyan-100' },
  claude: { icon: '🧠', color: 'text-purple-600', bg: 'bg-purple-100' }
};

export const LabSettingsDrawer = ({ 
  currentConversationId,
  viewMode,
  setViewMode,
  participants,
  toggleParticipant,
  isBarMode,
  setIsBarMode,
  selectedElevenLabsAgents,
  setSelectedElevenLabsAgents,
  activeKnowledgeBase,
  setActiveKnowledgeBase
}: LabSettingsDrawerProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const content = (
    <Accordion type="multiple" defaultValue={['stats', 'participants']} className="w-full">
      {/* Statistiche */}
      {currentConversationId && (
        <AccordionItem value="stats">
          <AccordionTrigger>📊 Statistiche</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2">
              <TokenCounterBadge 
                labConversationId={currentConversationId} 
                variant="laboratory"
                alertThreshold={15000}
              />
              <ConversationCostBadge labConversationId={currentConversationId} />
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Esporta */}
      {currentConversationId && (
        <AccordionItem value="export">
          <AccordionTrigger>📤 Esporta</AccordionTrigger>
          <AccordionContent>
            <ExportSummaryButton 
              labConversationId={currentConversationId}
              variant="laboratory"
            />
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Vista */}
      <AccordionItem value="view">
        <AccordionTrigger>👁️ Vista</AccordionTrigger>
        <AccordionContent>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'classic' ? 'default' : 'outline'}
              onClick={() => setViewMode('classic')}
              className="flex-1"
            >
              💬 Classica
            </Button>
            <Button
              variant={viewMode === 'tabs' ? 'default' : 'outline'}
              onClick={() => setViewMode('tabs')}
              className="flex-1"
            >
              📑 Tabs
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Partecipanti */}
      <AccordionItem value="participants">
        <AccordionTrigger>
          👥 Partecipanti ({participants.filter(p => p.is_active).length}/{participants.length})
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3">
            {participants.map((participant) => {
              const config = PARTICIPANT_ICONS[participant.type];
              
              return (
                <div 
                  key={participant.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    participant.is_active ? 'bg-muted/50' : 'opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`${config.bg} p-2 rounded-lg`}>
                      <span className="text-lg">{config.icon}</span>
                    </div>
                    <div>
                      <div className={`font-medium text-sm ${config.color}`}>
                        {participant.name}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {participant.type === 'human' ? 'Utente' : 'AI Agent'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={participant.is_active ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleParticipant(participant.id)}
                    disabled={participant.type === 'human'}
                  >
                    {participant.is_active ? 'ON' : 'OFF'}
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              💡 Gli agenti AI non vedranno le risposte degli altri agenti, solo i tuoi messaggi
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Bar Mode */}
      <AccordionItem value="barmode">
        <AccordionTrigger>🎭 Bar Mode</AccordionTrigger>
        <AccordionContent>
          <CollapsibleBarSection
            conversationId={currentConversationId}
            isBarMode={isBarMode}
            onBarModeToggle={setIsBarMode}
            onAgentsChange={setSelectedElevenLabsAgents}
            onKBChange={setActiveKnowledgeBase}
          />
        </AccordionContent>
      </AccordionItem>

      {/* Prompt Manager */}
      <AccordionItem value="prompt">
        <AccordionTrigger>📝 Prompt Manager</AccordionTrigger>
        <AccordionContent>
          <LaboratoryPromptManager />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[85vw] sm:w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>⚙️ Impostazioni Laboratory</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-[400px] max-h-[70vh] overflow-y-auto">
        {content}
      </PopoverContent>
    </Popover>
  );
};
