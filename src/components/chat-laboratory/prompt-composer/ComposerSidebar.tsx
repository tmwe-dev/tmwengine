import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { SectionGroup } from './types';

interface ComposerSidebarProps {
  selectedGroup: SectionGroup | null;
  onSelectGroup: (group: SectionGroup) => void;
  sectionCounts: Record<SectionGroup, number>;
}

const GROUPS: { id: SectionGroup; label: string; icon: string; locked?: boolean }[] = [
  { id: 'global', label: 'Globale', icon: '🌐', locked: true },
  { id: 'base', label: 'Base', icon: '📚' },
  { id: 'personality', label: 'Personalità', icon: '🎭' },
  { id: 'style', label: 'Stile', icon: '💬' },
  { id: 'orchestrator', label: 'Orchestrator', icon: '🧠' },
];

export function ComposerSidebar({ selectedGroup, onSelectGroup, sectionCounts }: ComposerSidebarProps) {
  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {GROUPS.map((group) => (
            <Button
              key={group.id}
              variant={selectedGroup === group.id ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start text-left",
                group.locked && "opacity-70 cursor-help"
              )}
              onClick={() => onSelectGroup(group.id)}
              title={group.locked ? 'Prompt globale sempre visibile nel canvas' : undefined}
            >
              <span className="mr-2 text-base">{group.icon}</span>
              <span className="flex-1">{group.label}</span>
              {sectionCounts[group.id] > 0 && (
                <span className="text-xs bg-primary/20 px-1.5 py-0.5 rounded">
                  {sectionCounts[group.id]}
                </span>
              )}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
