/**
 * Sidebar Email Management - Lista mittenti da classificare
 */

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, Plus, LayoutGrid, Box, RefreshCw, Lightbulb, X } from 'lucide-react';
import { SenderCard } from './SenderCard';
import type { SenderAnalysis, EmailSenderGroup } from '@/types/email-management';
import { SenderSortControls, SortOption } from './SenderSortControls';
import { cn } from '@/lib/utils';
import { IconButton } from '@/components/design-system/buttons/IconButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmailSidebarProps {
  isOpen: boolean;
  onClose: () => void;
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
  isOpen,
  onClose,
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
    <>
      {/* Backdrop - UNIFORMATO */}
      {isOpen && (
        <div 
          className="fixed left-0 right-0 bottom-0 top-14 bg-transparent backdrop-blur-sm z-40 animate-in fade-in"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar - UNIFORMATO */}
      <div className={cn(
        "fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-80 bg-background border-r z-50",
        "transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          {/* Header uniforme */}
          <div className="px-4 py-3 border-b flex items-center justify-between bg-background">
            <h3 className="font-semibold flex items-center gap-2">
              <span>📮 Da Classificare ({displayedSenders.length})</span>
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <Tabs defaultValue="senders" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 mb-2">
              <TabsTrigger value="senders">Mittenti</TabsTrigger>
              <TabsTrigger value="filters">Filtri</TabsTrigger>
            </TabsList>

            <TabsContent value="senders" className="flex-1 flex flex-col mt-0 px-4">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca mittente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {displayedSenders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">
                      {senders.length === 0 
                        ? '🎉 Tutti i mittenti classificati!'
                        : '🔍 Nessun mittente trovato'
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
            </TabsContent>

            <TabsContent value="filters" className="flex-1 overflow-y-auto mt-0 px-4 space-y-3 pb-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Soglia minima email</label>
                <Select 
                  value={minEmailsFilter.toString()} 
                  onValueChange={(val) => setMinEmailsFilter(parseInt(val))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Min 1 email</SelectItem>
                    <SelectItem value="3">Min 3 email</SelectItem>
                    <SelectItem value="5">Min 5 email</SelectItem>
                    <SelectItem value="10">Min 10 email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {onSortChange && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Ordinamento</label>
                  <SenderSortControls currentSort={sortOption} onSortChange={onSortChange} />
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Vista</label>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="flex-1"
                  >
                    <LayoutGrid className="h-4 w-4 mr-1" />
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'carousel' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('carousel')}
                    className="flex-1"
                  >
                    <Box className="h-4 w-4 mr-1" />
                    Carousel
                  </Button>
                </div>
              </div>

              {viewMode === 'carousel' && onCarouselZoomChange && (
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">
                    Zoom: {carouselZoom.toFixed(1)}x
                  </label>
                  <Slider
                    value={[carouselZoom]}
                    onValueChange={([val]) => onCarouselZoomChange(val)}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onSync} disabled={isSyncing} className="flex-1">
                  <RefreshCw className={cn("h-4 w-4 mr-1", isSyncing && "animate-spin")} />
                  Sync
                </Button>
                <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading} className="flex-1">
                  <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
                  Refresh
                </Button>
              </div>

              {onOpenAISuggestions && aiSuggestionsCount > 0 && (
                <Button variant="outline" size="sm" onClick={onOpenAISuggestions} className="w-full">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  AI Suggestions ({aiSuggestionsCount})
                </Button>
              )}

              <Button
                variant={filterByAttachments ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterByAttachments(!filterByAttachments)}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                {filterByAttachments ? 'Solo con allegati' : 'Tutti'}
              </Button>

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Categoria</label>
                <Select value={activeCategoryId || 'all'} onValueChange={onCategorySelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.nome_gruppo} ({groups.filter(g => g.id === group.id).length || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {onCreateCategory && (
                  <Button variant="outline" size="sm" onClick={onCreateCategory} className="w-full mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuova Categoria
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
