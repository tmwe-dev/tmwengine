/**
 * Toolbar Email Management - Pulsanti controllo view e sync
 */

import { Button } from '@/components/ui/button';
import { RefreshCw, LayoutGrid, Box } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailManagementToolbarProps {
  viewMode: 'grid' | 'carousel';
  setViewMode: (mode: 'grid' | 'carousel') => void;
  onSync: () => void;
  onRefresh: () => void;
  isSyncing: boolean;
  isLoading: boolean;
}

export function EmailManagementToolbar({
  viewMode,
  setViewMode,
  onSync,
  onRefresh,
  isSyncing,
  isLoading,
}: EmailManagementToolbarProps) {
  return (
    <div className="fixed top-6 right-6 z-10 flex gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-lg border shadow-lg">
      <Button
        variant={viewMode === 'grid' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setViewMode('grid')}
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        Griglia
      </Button>
      <Button
        variant={viewMode === 'carousel' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setViewMode('carousel')}
      >
        <Box className="h-4 w-4 mr-2" />
        Carousel 3D
      </Button>
      <Button 
        variant="default" 
        onClick={onSync} 
        disabled={isSyncing || isLoading}
      >
        <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
        {isSyncing ? 'Sincronizzazione...' : 'Sincronizza Email'}
      </Button>
      <Button variant="outline" onClick={onRefresh} disabled={isLoading || isSyncing}>
        <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
        Aggiorna
      </Button>
    </div>
  );
}
