import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { StickyNote } from 'lucide-react';

interface Filters {
  stato: string;
  periodo: string;
  hasNotes: boolean;
}

interface CampaignFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onClose: () => void;
}

export function CampaignFilters({ filters, onFiltersChange, onClose }: CampaignFiltersProps) {
  const handleFilterChange = (key: keyof Filters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      stato: '',
      periodo: '',
      hasNotes: false
    });
  };

  const hasActiveFilters = filters.stato.trim() !== '' || filters.periodo.trim() !== '' || filters.hasNotes;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="stato-filter">Stato</Label>
          <Select value={filters.stato} onValueChange={(value) => handleFilterChange('stato', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tutti gli stati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tutti gli stati</SelectItem>
              <SelectItem value="attiva">Attiva</SelectItem>
              <SelectItem value="pausa">In Pausa</SelectItem>
              <SelectItem value="completata">Completata</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="periodo-filter">Periodo</Label>
          <Select value={filters.periodo} onValueChange={(value) => handleFilterChange('periodo', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tutti i periodi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tutti i periodi</SelectItem>
              <SelectItem value="correnti">Campagne Correnti</SelectItem>
              <SelectItem value="future">Campagne Future</SelectItem>
              <SelectItem value="passate">Campagne Passate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="has-notes-campaign"
            checked={filters.hasNotes}
            onCheckedChange={(checked) => onFiltersChange({...filters, hasNotes: checked as boolean})}
          />
          <Label htmlFor="has-notes-campaign" className="flex items-center gap-2 text-sm cursor-pointer">
            <StickyNote className="h-4 w-4 text-blue-500" />
            Solo campagne con note
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