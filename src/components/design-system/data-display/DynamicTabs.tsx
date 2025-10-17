import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/**
 * DynamicTabs - Tabs riutilizzabili con configurazione dinamica
 * 
 * @example
 * ```tsx
 * <DynamicTabs
 *   tabs={[
 *     { value: 'tab1', label: 'Tab 1', icon: Home, content: <div>Content 1</div> },
 *     { value: 'tab2', label: 'Tab 2', badge: 5, content: <div>Content 2</div> }
 *   ]}
 * />
 * ```
 */

export interface TabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface DynamicTabsProps {
  tabs: TabItem[];
  defaultValue?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  variant?: 'default' | 'pills';
}

export function DynamicTabs({
  tabs,
  defaultValue,
  orientation = 'horizontal',
  className,
  variant = 'default'
}: DynamicTabsProps) {
  const tabsListClasses = cn(
    variant === 'pills' && 'bg-muted/50 p-1 rounded-lg',
    orientation === 'vertical' && 'flex-col h-full'
  );

  return (
    <Tabs
      defaultValue={defaultValue || tabs[0]?.value}
      orientation={orientation}
      className={cn('w-full', className)}
    >
      <TabsList className={tabsListClasses}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              disabled={tab.disabled}
              className={cn(
                'flex items-center gap-2',
                variant === 'pills' && 'data-[state=active]:bg-background'
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <Badge variant="secondary" className="ml-1 bg-transparent border-0">
                  {tab.badge}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="mt-4">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
