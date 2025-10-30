/**
 * Toolbar Email Management - Pulsanti controllo view e sync
 */

import { IconButton } from '@/components/design-system/buttons/IconButton';
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
    <div className="fixed top-2 right-6 z-10 flex gap-1">
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
    </div>
  );
}
