import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ComposerSidebar } from './ComposerSidebar';
import { SectionGroup } from './types';

interface CollapsibleComposerSidebarProps {
  selectedGroup: SectionGroup | null;
  onSelectGroup: (group: SectionGroup) => void;
  sectionCounts: Record<SectionGroup, number>;
}

export function CollapsibleComposerSidebar({
  selectedGroup,
  onSelectGroup,
  sectionCounts,
}: CollapsibleComposerSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Trigger strip sempre visibile */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-5 bg-muted/30 hover:bg-primary/10 transition-colors z-10 cursor-pointer flex items-center justify-center",
          isOpen && "opacity-0 pointer-events-none"
        )}
        onMouseEnter={() => setIsOpen(true)}
        title="Apri gruppi prompt"
      >
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Sidebar overlay */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-[240px] bg-background border-r shadow-xl z-20 transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        onMouseLeave={() => setIsOpen(false)}
      >
        {/* Header con bottone chiusura */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Gruppi Prompt</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Seleziona per caricare
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Chiudi sidebar"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Contenuto sidebar */}
        <div className="flex-1 overflow-hidden">
          <ComposerSidebar
            selectedGroup={selectedGroup}
            onSelectGroup={(group) => {
              onSelectGroup(group);
              // Mantieni aperta per permettere selezioni multiple
            }}
            sectionCounts={sectionCounts}
          />
        </div>
      </div>

      {/* Spacer per mantenere spazio quando chiusa */}
      <div className="w-5 shrink-0" />
    </div>
  );
}
