import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BarModeToggle } from './BarModeToggle';
import { BarModeControls } from './BarModeControls';
import { KnowledgeBaseSelector } from './KnowledgeBaseSelector';

interface CollapsibleBarSectionProps {
  conversationId: string | null;
  isBarMode: boolean;
  onBarModeToggle: (enabled: boolean) => void;
  onKBChange: (kb: string | null) => void;
}

export const CollapsibleBarSection = ({
  conversationId,
  isBarMode,
  onBarModeToggle,
  onKBChange
}: CollapsibleBarSectionProps) => {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('bar-section-open');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('bar-section-open', String(isOpen));
  }, [isOpen]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex justify-center items-center gap-3">
        <BarModeToggle
          conversationId={conversationId}
          isBarMode={isBarMode}
          onToggle={onBarModeToggle}
        />
        
        {isBarMode && (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        )}
      </div>

      <CollapsibleContent>
        {isBarMode && (
          <div className="space-y-3 mt-2">
            {/* Controlli conversazione: Argomento, Ritmo, Interruzioni, Autoplay */}
            <div className="flex justify-center">
              <BarModeControls conversationId={conversationId} />
            </div>
            
            {/* Knowledge Base selector */}
            <div className="flex justify-center">
              <KnowledgeBaseSelector
                conversationId={conversationId}
                onKBChange={onKBChange}
              />
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
