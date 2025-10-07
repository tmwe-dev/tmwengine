import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * ActionButton - Bottone per azioni con icona opzionale
 * 
 * @example
 * ```tsx
 * <ActionButton
 *   icon={Plus}
 *   onClick={handleAdd}
 *   variant="primary"
 * >
 *   Aggiungi
 * </ActionButton>
 * ```
 */

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'ghost' | 'outline';
  size?: 'sm' | 'default' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function ActionButton({
  icon: Icon,
  iconPosition = 'left',
  variant = 'primary',
  size = 'default',
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ActionButtonProps) {
  const variantMap = {
    primary: 'default',
    secondary: 'secondary',
    success: 'default',
    warning: 'default',
    destructive: 'destructive',
    ghost: 'ghost',
    outline: 'outline'
  } as const;

  const variantClasses = {
    success: 'bg-gradient-to-bl from-green-400/25 via-green-400/15 to-transparent hover:from-green-400/30 hover:via-green-400/20',
    warning: 'bg-gradient-to-bl from-yellow-400/25 via-yellow-400/15 to-transparent hover:from-yellow-400/30 hover:via-yellow-400/20'
  };

  return (
    <Button
      variant={variantMap[variant]}
      size={size}
      disabled={disabled || loading}
      className={cn(
        (variant === 'success' || variant === 'warning') && variantClasses[variant],
        className
      )}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon className="h-4 w-4 mr-2" />}
      {children}
      {Icon && iconPosition === 'right' && <Icon className="h-4 w-4 ml-2" />}
    </Button>
  );
}
