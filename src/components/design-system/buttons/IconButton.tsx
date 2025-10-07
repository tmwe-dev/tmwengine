import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * IconButton - Bottone con solo icona e tooltip
 * 
 * @example
 * ```tsx
 * <IconButton
 *   icon={Edit}
 *   tooltip="Modifica"
 *   onClick={handleEdit}
 *   variant="ghost"
 * />
 * ```
 */

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  tooltip?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function IconButton({
  icon: Icon,
  tooltip,
  variant = 'ghost',
  size = 'icon',
  className,
  ...props
}: IconButtonProps) {
  const button = (
    <Button
      variant={variant}
      size={size}
      className={cn('h-9 w-9', className)}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
