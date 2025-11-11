/**
 * Sidebar Email Management - Lista mittenti da classificare
 */

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, Plus, LayoutGrid, Box, RefreshCw, Lightbulb } from 'lucide-react';
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
  onSenderDoubleClick?: (sender: SenderAnalysis) => void;
  aiSuggestionsCount?: number;
  onOpenAISuggestions?: () => void;
  onDragStart?: (sender: SenderAnalysis) => void;
  onDragEnd?: (clientX: number, clientY: number) => void;
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
  onSenderDoubleClick,
  aiSuggestionsCount = 0,
  onOpenAISuggestions,
  onDragStart,
  onDragEnd,
}: EmailSidebarProps) {
  // 🆕 Filtro soglia email per visualizzazione
  const [minEmailsFilter, setMinEmailsFilter] = useState(1);
  
  // Applica filtro soglia ai mittenti visualizzati
  const displayedSenders = useMemo(() => 
    filteredSenders.filter(s => s.emailCount >= minEmailsFilter),
    [filteredSenders, minEmailsFilter]
  );
  
  return (
    <div className="flex-shrink-0 w-[416px] z-20">
      <div className="h-full flex flex-col">
        {/* Header semplificato */}
        <div className="px-4 pb-2 flex-shrink-0">
          <h3 className="font-semibold mb-1 flex items-center justify-between">
            <span>📮 Da Classificare ({displayedSenders.length})</span>
            {senders.length !== displayedSenders.length && (
              <span className="text-xs text-muted-foreground">
                {senders.length} totali
              </span>
            )}
          </h3>
          
          
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca mittente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* 🆕 Filtro soglia email minime per visualizzazione */}
          <div className="mb-2">
            <Select 
              value={minEmailsFilter.toString()} 
              onValueChange={(val) => setMinEmailsFilter(parseInt(val))}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Tutti i mittenti</SelectItem>
                <SelectItem value="2">≥2 email</SelectItem>
                <SelectItem value="3">≥3 email</SelectItem>
                <SelectItem value="5">≥5 email</SelectItem>
                <SelectItem value="10">≥10 email</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Riga: Ordina + 4 IconButton toolbar */}
          <div className="flex gap-2 items-center justify-between mb-2">
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
              {onOpenAISuggestions && aiSuggestionsCount > 0 && (
                <div className="relative">
                  <IconButton
                    icon={Lightbulb}
                    tooltip={`${aiSuggestionsCount} Suggerimenti AI`}
                    variant="ghost"
                    size="sm"
                    onClick={onOpenAISuggestions}
                  />
                  <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
                    {aiSuggestionsCount}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Riga compatta: Dropdown + Pulsanti azioni */}
          <div className="flex gap-2 items-center justify-between mb-2">
            {/* Dropdown categoria a sinistra */}
            <Select 
              key={activeCategoryId}
              value={activeCategoryId || undefined} 
              onValueChange={onCategorySelect}
            >
              <SelectTrigger className="h-9 flex-1">
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
            
            {/* Pulsanti a destra */}
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={onCreateCategory}
              >
                <Plus className="h-4 w-4" />
              </Button>
              
              <Button
                variant={filterByAttachments ? "default" : "outline"}
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setFilterByAttachments(!filterByAttachments)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Lista indirizzi */}
        <div id="email-sidebar-scroll-container" className="flex-1 overflow-y-auto px-4 space-y-4">
          {displayedSenders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">
                {senders.length === 0 
                  ? '🎉 Tutti i mittenti sono stati classificati!'
                  : minEmailsFilter > 1
                  ? `🔍 Nessun mittente con ≥${minEmailsFilter} email`
                  : '🔍 Nessun mittente trovato con questi filtri'
                }
              </p>
            </div>
          ) : (
            displayedSenders.map(sender => (
              <SenderCard 
                key={sender.email} 
                sender={sender}
                onDoubleClick={onSenderDoubleClick}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
