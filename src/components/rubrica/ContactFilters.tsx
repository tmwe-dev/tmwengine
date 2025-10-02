import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { StickyNote } from 'lucide-react';

interface Filters {
  tag: string;
  citta: string;
  nazione: string;
  hasActivities: boolean;
  hasNotes: boolean;
}

interface ContactFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onClose: () => void;
}

export function ContactFilters({ filters, onFiltersChange, onClose }: ContactFiltersProps) {
  const handleFilterChange = (key: keyof Filters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      tag: '',
      citta: '',
      nazione: '',
      hasActivities: false,
      hasNotes: false
    });
  };

  const hasActiveFilters = filters.tag.trim() !== '' || filters.citta.trim() !== '' || filters.nazione.trim() !== '' || filters.hasActivities || filters.hasNotes;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="tag-filter">Tag</Label>
          <Input
            id="tag-filter"
            value={filters.tag}
            onChange={(e) => handleFilterChange('tag', e.target.value)}
            placeholder="Filtra per tag..."
          />
        </div>

        <div>
          <Label htmlFor="city-filter">Città</Label>
          <Input
            id="city-filter"
            value={filters.citta}
            onChange={(e) => handleFilterChange('citta', e.target.value)}
            placeholder="Filtra per città..."
          />
        </div>

        <div>
          <Label htmlFor="country-filter">Nazione</Label>
          <Input
            id="country-filter"
            value={filters.nazione}
            onChange={(e) => handleFilterChange('nazione', e.target.value)}
            placeholder="Filtra per nazione..."
          />
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="has-notes"
            checked={filters.hasNotes}
            onCheckedChange={(checked) => onFiltersChange({...filters, hasNotes: checked as boolean})}
          />
          <Label htmlFor="has-notes" className="flex items-center gap-2 text-sm cursor-pointer">
            <StickyNote className="h-4 w-4 text-blue-500" />
            Solo contatti con note
          </Label>
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          Pulisci Filtri
        </Button>
        
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Chiudi
          </Button>
          <Button onClick={onClose} className="shadow-soft">
            Applica Filtri
          </Button>
        </div>
      </div>
    </div>
  );
}