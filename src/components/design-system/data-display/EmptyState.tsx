import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * EmptyState - Stato vuoto con icona e messaggio
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   icon={Inbox}
 *   title="Nessun dato"
 *   description="Non ci sono elementi da visualizzare"
 *   action={<Button>Aggiungi Nuovo</Button>}
 * />
 * ```
 */

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      <div className="rounded-full bg-muted/50 p-6 mb-4">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-center max-w-md mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}
