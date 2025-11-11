import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { StickyNote } from 'lucide-react';

interface FilterConfig {
  searchQuery: string;
  originFilter: string;
  countryFilter: string;
  hasNotesFilter: boolean;
  myContactsWithActivitiesFilter: boolean;
  hideContactsWithTodayActivities: boolean;
  filterOnlyWithAlias: boolean;
  sortConfig: {
    primary: { column: string; direction: 'asc' | 'desc' } | null;
    secondary: { column: string; direction: 'asc' | 'desc' } | null;
  };
}

interface RecordFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterConfig;
  onFiltersChange: (filters: Partial<FilterConfig>) => void;
  allRecords: any[];
  getUniqueValuesWithCount: (field: string) => Array<{ value: any; count: number }>;
  getCountryFullName: (code: string) => string;
  activeFilters: Array<{ field: string; value: any; displayValue: string }>;
  setActiveFilters: (filters: Array<{ field: string; value: any; displayValue: string }>) => void;
  hasCompletedActivityToday?: (contactId: string) => boolean;
}

export function RecordFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  allRecords,
  getUniqueValuesWithCount,
  getCountryFullName,
  activeFilters,
  setActiveFilters,
  hasCompletedActivityToday
}: RecordFiltersDialogProps) {
  const hiddenTodayCount = hasCompletedActivityToday 
    ? allRecords.filter(record => hasCompletedActivityToday(record.id)).length 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw]">
        <DialogHeader>
          <DialogTitle>Filtri</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            {/* Origin Filter */}
            <div className="space-y-2">
              <Label>Origine</Label>
              <Select 
                value={filters.originFilter} 
                onValueChange={(value) => onFiltersChange({ originFilter: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le origini" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tutte ({allRecords.length})</SelectItem>
                  {getUniqueValuesWithCount('origin').map(({ value, count }) => (
                    <SelectItem key={value} value={value}>
                      {value} ({count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country Filter */}
            <div className="space-y-2">
              <Label>Nazione</Label>
              <Select 
                value={filters.countryFilter} 
                onValueChange={(value) => onFiltersChange({ countryFilter: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le nazioni" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tutte ({allRecords.length})</SelectItem>
                  {getUniqueValuesWithCount('nazione').map(({ value, count }) => (
                    <SelectItem key={value} value={value}>
                      {getCountryFullName(value)} ({count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Primary */}
            <div className="space-y-2">
              <Label>Ordina per</Label>
              <Select 
                value={filters.sortConfig.primary ? `${filters.sortConfig.primary.column}-${filters.sortConfig.primary.direction}` : "NONE"} 
                onValueChange={(value) => {
                  if (value === "NONE") {
                    onFiltersChange({ sortConfig: { primary: null, secondary: null } });
                    return;
                  }
                  const [column, direction] = value.split('-');
                  onFiltersChange({ 
                    sortConfig: { 
                      ...filters.sortConfig,
                      primary: { column, direction: direction as 'asc' | 'desc' } 
                    } 
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nessun ordinamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Nessun ordinamento</SelectItem>
                  <SelectItem value="company_name-asc">Azienda ↑</SelectItem>
                  <SelectItem value="company_name-desc">Azienda ↓</SelectItem>
                  <SelectItem value="nazione-asc">Paese ↑</SelectItem>
                  <SelectItem value="nazione-desc">Paese ↓</SelectItem>
                  <SelectItem value="attivita-asc">Attività ↑</SelectItem>
                  <SelectItem value="attivita-desc">Attività ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Secondary */}
            {filters.sortConfig.primary && (
              <div className="space-y-2">
                <Label>Poi per</Label>
                <Select 
                  value={filters.sortConfig.secondary ? `${filters.sortConfig.secondary.column}-${filters.sortConfig.secondary.direction}` : "NONE"} 
                  onValueChange={(value) => {
                    if (value === "NONE") {
                      onFiltersChange({ sortConfig: { ...filters.sortConfig, secondary: null } });
                      return;
                    }
                    const [column, direction] = value.split('-');
                    onFiltersChange({ 
                      sortConfig: { 
                        ...filters.sortConfig,
                        secondary: { column, direction: direction as 'asc' | 'desc' } 
                      } 
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nessuno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Nessuno</SelectItem>
                    <SelectItem value="company_name-asc">Azienda ↑</SelectItem>
                    <SelectItem value="company_name-desc">Azienda ↓</SelectItem>
                    <SelectItem value="nazione-asc">Paese ↑</SelectItem>
                    <SelectItem value="nazione-desc">Paese ↓</SelectItem>
                    <SelectItem value="attivita-asc">Attività ↑</SelectItem>
                    <SelectItem value="attivita-desc">Attività ↓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Activity Filter */}
            <div className="space-y-2">
              <Label>Filtra per attività</Label>
              <Select 
                value={(() => {
                  const hasActivityFilter = activeFilters.find(f => f.field === 'has_activities');
                  if (hasActivityFilter) {
                    return hasActivityFilter.value ? 'with_activities' : 'without_activities';
                  }
                  return 'all';
                })()} 
                onValueChange={(value) => {
                  setActiveFilters(activeFilters.filter(f => f.field !== 'has_activities'));
                  
                  if (value === 'with_activities') {
                    setActiveFilters([...activeFilters, {
                      field: 'has_activities',
                      value: true,
                      displayValue: 'Con attività'
                    }]);
                  } else if (value === 'without_activities') {
                    setActiveFilters([...activeFilters, {
                      field: 'has_activities',
                      value: false,
                      displayValue: 'Senza attività'
                    }]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="with_activities">Con attività</SelectItem>
                  <SelectItem value="without_activities">Senza attività</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Hide Today Activities */}
            {hasCompletedActivityToday && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="hide-today-activities"
                  checked={filters.hideContactsWithTodayActivities}
                  onCheckedChange={(checked) => onFiltersChange({ hideContactsWithTodayActivities: checked })}
                />
                <Label htmlFor="hide-today-activities" className="cursor-pointer">
                  Nascondi attività oggi
                </Label>
                {filters.hideContactsWithTodayActivities && hiddenTodayCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {hiddenTodayCount} nascosti
                  </Badge>
                )}
              </div>
            )}

            {/* Notes Filter */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-notes-filter"
                checked={filters.hasNotesFilter}
                onCheckedChange={(checked) => onFiltersChange({ hasNotesFilter: checked as boolean })}
              />
              <Label htmlFor="has-notes-filter" className="flex items-center gap-2 cursor-pointer">
                <StickyNote className="h-4 w-4 text-blue-500" />
                Solo con note
              </Label>
            </div>

            {/* My Activities Filter */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="my-activities-filter"
                checked={filters.myContactsWithActivitiesFilter}
                onCheckedChange={(checked) => onFiltersChange({ myContactsWithActivitiesFilter: checked as boolean })}
              />
              <Label htmlFor="my-activities-filter" className="cursor-pointer">
                Solo mie attività
              </Label>
            </div>

            {/* Alias Filter */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="alias-filter"
                checked={filters.filterOnlyWithAlias}
                onCheckedChange={(checked) => onFiltersChange({ filterOnlyWithAlias: checked as boolean })}
              />
              <Label htmlFor="alias-filter" className="cursor-pointer">
                Solo con alias
              </Label>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
