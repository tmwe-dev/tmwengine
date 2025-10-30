/**
 * Toolbar Email Management - Pulsanti controllo view e sync
 */

import { IconButton } from '@/components/design-system/buttons/IconButton';
import { RefreshCw, LayoutGrid, Box, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAIOptimization } from '@/hooks/useAIOptimization';
import { toast } from 'sonner';

interface EmailManagementToolbarProps {
  viewMode: 'grid' | 'carousel';
  setViewMode: (mode: 'grid' | 'carousel') => void;
  onSync: () => void;
  onRefresh: () => void;
  isSyncing: boolean;
  isLoading: boolean;
  senders?: Array<{ email: string; companyName: string; isClassified?: boolean }>;
  onSendersUpdate?: (senders: Array<{ email: string; companyName: string }>) => void;
}

export function EmailManagementToolbar({
  viewMode,
  setViewMode,
  onSync,
  onRefresh,
  isSyncing,
  isLoading,
  senders = [],
  onSendersUpdate,
}: EmailManagementToolbarProps) {
  const { optimizeSenderNames, isOptimizing, progress } = useAIOptimization();

  const handleAIOptimize = async () => {
    if (!onSendersUpdate) return;
    
    const unclassifiedSenders = senders.filter(s => !s.isClassified);
    
    if (unclassifiedSenders.length === 0) {
      toast.info('Nessun mittente da ottimizzare');
      return;
    }

    toast.info(`🤖 Ottimizzazione AI avviata per ${unclassifiedSenders.length} mittenti`);

    try {
      const optimizedMap = await optimizeSenderNames(unclassifiedSenders);

      // Aggiorna nomi nella UI
      const updatedSenders = senders.map(s => {
        const newName = optimizedMap.get(s.email);
        return newName ? { ...s, companyName: newName } : s;
      });

      onSendersUpdate(updatedSenders);

      toast.success(`✅ ${optimizedMap.size} nomi migliorati con AI`);
    } catch (error) {
      console.error('AI optimization error:', error);
      toast.error('❌ Errore durante ottimizzazione AI');
    }
  };
  return (
    <div className="fixed top-2 left-6 z-10 flex items-center gap-2">
      {/* Titolo estratto da EmailManagementHeader */}
      <div className="flex items-center gap-2 mr-4">
        <span className="text-lg font-bold">📬</span>
        <span className="text-sm font-semibold">Email Management</span>
      </div>
      
      {/* Separatore visivo */}
      <div className="h-6 w-px bg-border" />
      
      {/* Icone funzionali */}
      <IconButton
        icon={LayoutGrid}
        tooltip="Vista Griglia"
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        onClick={() => setViewMode('grid')}
      />
      <IconButton
        icon={Box}
        tooltip="Carousel 3D"
        variant={viewMode === 'carousel' ? 'default' : 'ghost'}
        onClick={() => setViewMode('carousel')}
      />
      <IconButton
        icon={RefreshCw}
        tooltip={isSyncing ? 'Sincronizzazione...' : 'Sincronizza Email'}
        variant="default"
        onClick={onSync}
        disabled={isSyncing || isLoading}
        className={cn(isSyncing && "animate-spin")}
      />
      <IconButton
        icon={RefreshCw}
        tooltip="Aggiorna"
        variant="ghost"
        onClick={onRefresh}
        disabled={isLoading || isSyncing}
        className={cn(isLoading && "animate-spin")}
      />
      
      {/* AI Optimize Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAIOptimize}
        disabled={isOptimizing || isLoading || isSyncing || !onSendersUpdate}
        className="gap-2 h-9 px-3"
      >
        {isOptimizing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {progress ? `${progress.checked}/${progress.total}` : 'Analyzing...'}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            AI Optimize
          </>
        )}
      </Button>
    </div>
  );
}
