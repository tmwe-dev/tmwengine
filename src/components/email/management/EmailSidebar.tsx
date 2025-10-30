/**
 * Sidebar Email Management - Lista mittenti da classificare
 */

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, Plus } from 'lucide-react';
import { SenderCard } from './SenderCard';
import type { SenderAnalysis } from '@/types/email-management';
import { cn } from '@/lib/utils';

interface EmailSidebarProps {
  senders: SenderAnalysis[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterByAttachments: boolean;
  setFilterByAttachments: (filter: boolean) => void;
  filteredSenders: SenderAnalysis[];
  viewMode?: 'grid' | 'carousel';
  carouselZoom?: number;
  onCarouselZoomChange?: (zoom: number) => void;
  onCreateCategory?: () => void;
}

export function EmailSidebar({
  senders,
  searchQuery,
  setSearchQuery,
  filterByAttachments,
  setFilterByAttachments,
  filteredSenders,
  viewMode,
  carouselZoom = 1.0,
  onCarouselZoomChange,
  onCreateCategory,
}: EmailSidebarProps) {
  return (
    <div className="fixed left-6 top-20 w-80 z-20" style={{ height: 'calc(100vh - 100px)' }}>
      <div className="h-full flex flex-col">
        {/* Header con stile glassmorphism carousel */}
        <div className={cn(
          "relative p-4 mb-4 rounded-lg flex-shrink-0",
          "backdrop-blur-md",
          "bg-gradient-to-br from-blue-500/10 via-blue-600/5 to-blue-700/10",
          "border border-blue-500/20",
          "shadow-lg"
        )}>
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
          
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca mittente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="space-y-2">
            <Button
              variant={filterByAttachments ? "default" : "outline"}
              size="sm"
              className="w-full"
              onClick={() => setFilterByAttachments(!filterByAttachments)}
            >
              <Filter className="h-3 w-3 mr-2" />
              Solo con allegati
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onCreateCategory}
            >
              <Plus className="h-3 w-3 mr-2" />
              Nuova Categoria
            </Button>
          </div>
        </div>
        
        {/* Lista indirizzi con sfondo trasparente e scroll snap */}
        <div className="flex-1 overflow-y-auto px-4 space-y-3 bg-transparent snap-y snap-proximity" style={{ perspective: '1000px' }}>
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
