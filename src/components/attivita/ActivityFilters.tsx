import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { StickyNote, User } from 'lucide-react';

interface Activity {
  rubrica_origine?: string;
  stato: string;
  tipo: string;
  priorita: string;
  scadenza?: string;
  note?: string;
}

interface Filters {
  stato: string;
  tipo: string;
  priorita: string;
  scadenza: string;
  hasNotes: boolean;
  origine: string;
  myActivitiesOnly: boolean;
}

interface ActivityFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onClose: () => void;
  activities?: Activity[];
}

export function ActivityFilters({ filters, onFiltersChange, onClose, activities = [] }: ActivityFiltersProps) {
  // Calcola i conteggi per origine
  const origineConteggi = useMemo(() => {
    const conteggi: Record<string, number> = {};
    activities.forEach(activity => {
      const origine = activity.rubrica_origine || 'Senza origine';
      conteggi[origine] = (conteggi[origine] || 0) + 1;
    });
    return conteggi;
  }, [activities]);

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
      scadenza: 'all',
      hasNotes: false,
      origine: 'all',
      myActivitiesOnly: false
    });
  };

  const hasActiveFilters = filters.stato !== 'all' || filters.tipo !== 'all' || filters.priorita !== 'all' || filters.scadenza !== 'all' || filters.hasNotes || filters.origine !== 'all' || filters.myActivitiesOnly;

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

        <div>
          <Label htmlFor="origine-filter">Origine</Label>
          <Select value={filters.origine} onValueChange={(value) => handleFilterChange('origine', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tutte le origini" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le origini ({activities.length})</SelectItem>
              {Object.entries(origineConteggi)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([origine, conteggio]) => (
                  <SelectItem key={origine} value={origine}>
                    {origine} ({conteggio})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="has-notes-activity"
            checked={filters.hasNotes}
            onCheckedChange={(checked) => onFiltersChange({...filters, hasNotes: checked as boolean})}
          />
          <Label htmlFor="has-notes-activity" className="flex items-center gap-2 text-sm cursor-pointer">
            <StickyNote className="h-4 w-4 text-blue-500" />
            Solo attività con note
          </Label>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="my-activities-only"
            checked={filters.myActivitiesOnly}
            onCheckedChange={(checked) => onFiltersChange({...filters, myActivitiesOnly: checked as boolean})}
          />
          <Label htmlFor="my-activities-only" className="flex items-center gap-2 text-sm cursor-pointer">
            <User className="h-4 w-4 text-primary" />
            Solo mie attività
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