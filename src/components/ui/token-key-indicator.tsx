import { Key } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TokenKeyIndicatorProps {
  tokenCount: number | null | undefined;
  variant?: 'input' | 'output' | 'total' | 'current';
  showLabel?: boolean;
  className?: string;
}

export const TokenKeyIndicator = ({ 
  tokenCount, 
  variant = 'total',
  showLabel = false,
  className 
}: TokenKeyIndicatorProps) => {
  const hasTokens = tokenCount && tokenCount > 0;
  
  const variantConfig = {
    input: { label: '↓ IN', color: 'text-blue-500' },
    output: { label: '↑ OUT', color: 'text-purple-500' },
    total: { label: 'TOT', color: 'text-primary' },
    current: { label: 'CURR', color: 'text-amber-500' }
  };
  
  const config = variantConfig[variant];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "inline-flex items-center gap-1.5",
            className
          )}>
            <Key 
              className={cn(
                "h-3.5 w-3.5 transition-colors",
                hasTokens 
                  ? "text-green-500 fill-green-500" 
                  : "text-red-500 fill-none"
              )}
            />
            {showLabel && (
              <span className={cn(
                "text-xs font-medium",
                config.color
              )}>
                {config.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs font-mono">
            {tokenCount ? tokenCount.toLocaleString() : '0'} token
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
