import { PageGroup } from '@/data/siteMapData';
import { PageCard } from './PageCard';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PageGroupAccordionProps {
  group: PageGroup;
  defaultOpen?: boolean;
}

const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
  blue: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-600 dark:text-blue-400' },
  purple: { bg: 'bg-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-600 dark:text-purple-400' },
  green: { bg: 'bg-green-500/5', border: 'border-green-500/20', text: 'text-green-600 dark:text-green-400' },
  orange: { bg: 'bg-orange-500/5', border: 'border-orange-500/20', text: 'text-orange-600 dark:text-orange-400' },
  gray: { bg: 'bg-muted/30', border: 'border-muted', text: 'text-muted-foreground' },
  red: { bg: 'bg-red-500/5', border: 'border-red-500/20', text: 'text-red-600 dark:text-red-400' },
  cyan: { bg: 'bg-cyan-500/5', border: 'border-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400' },
  yellow: { bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400' },
};

export function PageGroupAccordion({ group, defaultOpen = true }: PageGroupAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Icon = group.icon;
  const colors = colorClasses[group.color] || colorClasses.gray;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(
        "rounded-lg border-2 transition-all duration-300",
        colors.bg,
        colors.border
      )}
    >
      <CollapsibleTrigger className="w-full p-4 sm:p-6 hover:bg-muted/10 transition-colors">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn("p-2 rounded-lg", colors.bg)}>
              <Icon className={cn("h-6 w-6", colors.text)} />
            </div>
            <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={cn("text-lg sm:text-xl font-bold", colors.text)}>
                  {group.name}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {group.pages.length} {group.pages.length === 1 ? 'página' : 'páginas'}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground text-left line-clamp-1">
                {group.description}
              </p>
            </div>
          </div>
          <ChevronDown 
            className={cn(
              "h-5 w-5 transition-transform duration-300 shrink-0",
              isOpen ? "transform rotate-180" : "",
              colors.text
            )}
          />
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {group.pages.map((page) => (
            <PageCard key={page.path} page={page} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
