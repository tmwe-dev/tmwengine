import React from 'react';
import { DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, Filter } from 'lucide-react';

interface RecordImportedDialogHeaderProps {
  totalRecords: number;
  filteredCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFiltersDisplay: Array<{
    label: string;
    value: string;
    onRemove: () => void;
  }>;
  hasActiveFilters: boolean;
  onShowFilters: () => void;
  isMobile?: boolean;
}

export function RecordImportedDialogHeader({
  totalRecords,
  filteredCount,
  searchQuery,
  onSearchChange,
  activeFiltersDisplay,
  hasActiveFilters,
  onShowFilters,
  isMobile = false
}: RecordImportedDialogHeaderProps) {
  if (isMobile) {
    return (
      <div className="space-y-1">
        {/* Mobile Title with Filtered Count */}
        <div className="flex items-start justify-between relative pb-1">
          <div className="flex flex-col items-start gap-0.5">
            <div className="flex items-center gap-2">
              {hasActiveFilters && filteredCount > 0 && (
                <span className="font-medium text-white text-lg">
                  {filteredCount}
                </span>
              )}
              <DialogTitle></DialogTitle>
            </div>
            
            {/* Active Filters Badges */}
            {activeFiltersDisplay.length > 0 && (
              <div className="flex flex-wrap items-start gap-1">
                {activeFiltersDisplay.map((filter, index) => (
                  <Badge key={index} variant="secondary" className="text-[10px] h-6 px-2">
                    {filter.label}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-3 w-3 p-0 ml-1" 
                      onClick={filter.onRemove}
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Search Field and Filter Button */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="relative w-[65%]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 p-2"
                onClick={onShowFilters}
              >
                <Filter className={`h-4 w-4 ${hasActiveFilters ? 'text-sky-500 animate-pulse' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop Header
  return (
    <div className="flex items-center justify-between gap-4">
      <DialogTitle>
        Record Importati ({filteredCount !== totalRecords ? `${filteredCount} / ` : ''}{totalRecords})
      </DialogTitle>
      
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca record..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onShowFilters}
        >
          <Filter className={`h-4 w-4 mr-2 ${hasActiveFilters ? 'text-sky-500' : ''}`} />
          Filtri {hasActiveFilters && `(${activeFiltersDisplay.length})`}
        </Button>
      </div>
    </div>
  );
}
