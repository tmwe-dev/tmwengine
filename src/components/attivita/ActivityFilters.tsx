import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Filters {
  stato: string;
  tipo: string;
  priorita: string;
  scadenza: string;
}

interface ActivityFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onClose: () => void;
}

export function ActivityFilters({ filters, onFiltersChange, onClose }: ActivityFiltersProps) {
  const handleFilterChange = (key: keyof Filters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      stato: 'all',
      tipo: 'all',
      priorita: 'all',
      scadenza: 'all'
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value.trim() !== '' && value !== 'all');

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
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="aperta">Aperta</SelectItem>
              <SelectItem value="in_corso">In Corso</SelectItem>
              <SelectItem value="completata">Completata</SelectItem>
              <SelectItem value="annullata">Annullata</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="tipo-filter">Tipo</Label>
          <Select value={filters.tipo} onValueChange={(value) => handleFilterChange('tipo', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tutti i tipi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tipi</SelectItem>
              <SelectItem value="chiamata">Chiamata</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="task">Task</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priorita-filter">Priorità</Label>
          <Select value={filters.priorita} onValueChange={(value) => handleFilterChange('priorita', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tutte le priorità" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le priorità</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="bassa">Bassa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="scadenza-filter">Scadenza</Label>
          <Select value={filters.scadenza} onValueChange={(value) => handleFilterChange('scadenza', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tutte le scadenze" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le scadenze</SelectItem>
              <SelectItem value="scadute">Scadute</SelectItem>
              <SelectItem value="oggi">Oggi</SelectItem>
              <SelectItem value="domani">Domani</SelectItem>
              <SelectItem value="questa_settimana">Questa settimana</SelectItem>
              <SelectItem value="senza_scadenza">Senza scadenza</SelectItem>
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