/**
 * Sidebar Email Management - Lista mittenti da classificare
 */

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, Plus, LayoutGrid, Box, RefreshCw } from 'lucide-react';
import { SenderCard } from './SenderCard';
import type { SenderAnalysis, EmailSenderGroup } from '@/types/email-management';
import { SenderSortControls, SortOption } from './SenderSortControls';
import { cn } from '@/lib/utils';
import { IconButton } from '@/components/design-system/buttons/IconButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmailSidebarProps {
  senders: SenderAnalysis[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterByAttachments: boolean;
  setFilterByAttachments: (filter: boolean) => void;
  filteredSenders: SenderAnalysis[];
  viewMode: 'grid' | 'carousel';
  setViewMode: (mode: 'grid' | 'carousel') => void;
  carouselZoom?: number;
  onCarouselZoomChange?: (zoom: number) => void;
  onCreateCategory?: () => void;
  groups: EmailSenderGroup[];
  activeCategoryId: string | null;
  onCategorySelect: (categoryId: string) => void;
  sortOption?: SortOption;
  onSortChange?: (sort: SortOption) => void;
  onSync: () => void;
  onRefresh: () => void;
  isSyncing: boolean;
  isLoading: boolean;
}

export function EmailSidebar({
  senders,
  searchQuery,
  setSearchQuery,
  filterByAttachments,
  setFilterByAttachments,
  filteredSenders,
  viewMode,
  setViewMode,
  carouselZoom = 1.0,
  onCarouselZoomChange,
  onCreateCategory,
  groups,
  activeCategoryId,
  onCategorySelect,
  sortOption = 'count-desc',
  onSortChange,
  onSync,
  onRefresh,
  isSyncing,
  isLoading,
}: EmailSidebarProps) {
  return (
    <div className="fixed left-6 top-20 z-20" style={{ width: '416px', height: 'calc(100vh - 80px)' }}>
      <div className="h-full flex flex-col">
        {/* Header semplificato */}
        <div className="p-4 mb-4 flex-shrink-0">
          <h3 className="font-semibold mb-3 flex items-center justify-between">
            <span>📮 Da Classificare ({filteredSenders.length})</span>
            {senders.length !== filteredSenders.length && (
              <span className="text-xs text-muted-foreground">
                {senders.length} totali
              </span>
            )}
          </h3>
          
          {/* Carousel Zoom Control - Solo quando carousel è attivo */}
          {viewMode === 'carousel' && (
            <div className="mb-4 pb-4 border-b border-blue-400/20">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Zoom Carousel</label>
                <span className="text-xs text-muted-foreground">
                  {Math.round(carouselZoom * 100)}%
                </span>
              </div>
              <Slider
                value={[carouselZoom]}
                onValueChange={([val]) => onCarouselZoomChange?.(val)}
                min={0.5}
                max={2.0}
                step={0.01}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>50%</span>
                <span>200%</span>
              </div>
            </div>
          )}
          
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca mittente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Riga: Ordina + 4 IconButton toolbar */}
          <div className="flex gap-2 items-center justify-between mb-3">
            {onSortChange && (
              <SenderSortControls 
                currentSort={sortOption}
                onSortChange={onSortChange}
              />
            )}
            
            <div className="flex gap-1 items-center">
              <IconButton
                icon={LayoutGrid}
                tooltip="Vista Griglia"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              />
              <IconButton
                icon={Box}
                tooltip="Carousel 3D"
                variant={viewMode === 'carousel' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('carousel')}
              />
              <IconButton
                icon={RefreshCw}
                tooltip={isSyncing ? 'Sincronizzazione...' : 'Sincronizza Email'}
                variant="default"
                size="sm"
                onClick={onSync}
                disabled={isSyncing || isLoading}
                className={cn(isSyncing && "animate-spin")}
              />
              <IconButton
                icon={RefreshCw}
                tooltip="Aggiorna"
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading || isSyncing}
                className={cn(isLoading && "animate-spin")}
              />
            </div>
          </div>
          
          {/* Riga: Pulsanti azioni */}
          <div className="flex gap-2 items-center justify-end mb-3">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 flex-shrink-0 p-0"
              onClick={onCreateCategory}
            >
              <Plus className="h-4 w-4" />
            </Button>
            
            <Button
              variant={filterByAttachments ? "default" : "outline"}
              size="sm"
              className="h-9 w-9 flex-shrink-0 p-0"
              onClick={() => setFilterByAttachments(!filterByAttachments)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Dropdown categoria */}
          <div className="mb-3">
            <Select 
              value={activeCategoryId || undefined} 
              onValueChange={onCategorySelect}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="📂 Categoria" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    <span className="flex items-center gap-2">
                      <span>{group.icon}</span>
                      <span>{group.nome_gruppo}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Lista indirizzi */}
        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {filteredSenders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">
                {senders.length === 0 
                  ? '🎉 Tutti i mittenti sono stati classificati!'
                  : '🔍 Nessun mittente trovato con questi filtri'
                }
              </p>
            </div>
          ) : (
            filteredSenders.map(sender => (
              <SenderCard key={sender.email} sender={sender} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
