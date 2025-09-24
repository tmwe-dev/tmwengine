import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Filters {
  stato: string;
  periodo: string;
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
      periodo: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value.trim() !== '');

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