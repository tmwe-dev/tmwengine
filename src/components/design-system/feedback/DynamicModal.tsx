import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * DynamicModal - Modale riutilizzabile con configurazione dinamica
 * 
 * @example
 * ```tsx
 * <DynamicModal
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Conferma"
 *   description="Sei sicuro?"
 *   variant="destructive"
 *   primaryAction={{ label: 'Conferma', onClick: handleConfirm }}
 *   secondaryAction={{ label: 'Annulla', onClick: handleCancel }}
 * />
 * ```
 */

interface ModalAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

interface DynamicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
  variant?: 'default' | 'destructive' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function DynamicModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  primaryAction,
  secondaryAction,
  variant = 'default',
  size = 'md',
  className
}: DynamicModalProps) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  const variantClasses = {
    default: '',
    destructive: 'border-destructive/50',
    success: 'border-green-500/50'
  };

  const primaryVariants = {
    default: 'default' as const,
    destructive: 'destructive' as const,
    success: 'default' as const
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sizes[size], variantClasses[variant], className)}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        
        {children}
        
        {(primaryAction || secondaryAction) && (
          <DialogFooter>
            {secondaryAction && (
              <Button
                variant="outline"
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
              >
                {secondaryAction.label}
              </Button>
            )}
            {primaryAction && (
              <Button
                variant={primaryVariants[variant]}
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled || primaryAction.loading}
              >
                {primaryAction.loading ? 'Caricamento...' : primaryAction.label}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
