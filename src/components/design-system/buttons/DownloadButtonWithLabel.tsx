/**
 * DownloadButtonWithLabel - Bottone download con etichetta tecnica
 * Mostra strategia, configurazione, edge function e funzione interna
 */

import { Button, ButtonProps } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type StrategyType = 'sequential' | 'parallel' | 'dance' | 'profile-based';

interface TechConfig {
  batchSize?: number;
  maxConcurrent?: number;
  profileName?: string;
}

interface DownloadButtonWithLabelProps extends Omit<ButtonProps, 'children'> {
  /** Testo bottone */
  label: string;
  
  /** Icona bottone (Lucide) */
  icon?: LucideIcon;
  
  /** Emoji alternativa all'icona */
  emoji?: string;
  
  /** Strategia download */
  strategy: StrategyType;
  
  /** Configurazione tecnica */
  config: TechConfig;
  
  /** Edge function utilizzata */
  edgeFunction: 'tmwe-api-proxy' | 'tmwe-email-sync-master';
  
  /** Funzione interna chiamata */
  internalFunction: string;
}

// Colori per badge strategia
const strategyColors: Record<StrategyType, string> = {
  sequential: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  parallel: 'bg-green-500/20 text-green-400 border-green-500/50',
  dance: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  'profile-based': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
};

// Nomi display strategia
const strategyNames: Record<StrategyType, string> = {
  sequential: 'Sequential',
  parallel: 'Parallel',
  dance: 'Dance',
  'profile-based': 'Profile-Based',
};

export function DownloadButtonWithLabel({
  label,
  icon: Icon,
  emoji,
  strategy,
  config,
  edgeFunction,
  internalFunction,
  className,
  ...props
}: DownloadButtonWithLabelProps) {
  const { batchSize = 1, maxConcurrent = 1, profileName } = config;
  
  // Tooltip dettagliato
  const tooltipContent = (
    <div className="space-y-1 font-mono text-xs">
      <div className="font-bold border-b border-border pb-1 mb-2">
        📋 Technical Details
      </div>
      <div>📦 <span className="text-muted-foreground">Strategy:</span> {strategyNames[strategy]}</div>
      <div>⚙️ <span className="text-muted-foreground">Config:</span> {maxConcurrent}x concurrent, batch {batchSize}</div>
      {profileName && (
        <div>🎯 <span className="text-muted-foreground">Profile:</span> {profileName}</div>
      )}
      <div>🔧 <span className="text-muted-foreground">Edge Fn:</span> {edgeFunction}</div>
      <div className="text-[10px] text-muted-foreground border-t border-border pt-1 mt-2">
        📡 {internalFunction}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col gap-2 w-full">
            <Button className={cn('w-full', className)} {...props}>
              {emoji ? (
                <span className="text-lg mr-2">{emoji}</span>
              ) : (
                Icon && <Icon className="h-5 w-5 mr-2" />
              )}
              {label}
            </Button>
            
            {/* Etichetta tecnica sotto il bottone */}
            <div className="flex flex-col gap-1 px-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <Badge 
                  variant="outline" 
                  className={cn('text-[10px] px-1.5 py-0.5', strategyColors[strategy])}
                >
                  📦 {strategyNames[strategy]}
                </Badge>
                <span className="text-muted-foreground font-mono text-[10px]">
                  ⚙️ {maxConcurrent}x | Batch {batchSize}
                </span>
                <span className="text-muted-foreground font-mono text-[10px] truncate">
                  🔧 {edgeFunction}
                </span>
              </div>
              
              {profileName && (
                <div className="text-[10px] text-muted-foreground font-mono truncate">
                  🎯 Profile: {profileName}
                </div>
              )}
              
              <div className="text-[9px] text-muted-foreground/70 font-mono truncate">
                📡 {internalFunction}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-md">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
