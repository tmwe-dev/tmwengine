import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Filter, FilterX, StickyNote, User, Briefcase, Settings } from 'lucide-react';

interface FilterTag {
  field: string;
  value: any;
  displayValue: string;
}

interface ImportedContact {
  [key: string]: any;
}

interface SortConfig {
  primary: { column: string; direction: 'asc' | 'desc' } | null;
  secondary: { column: string; direction: 'asc' | 'desc' } | null;
}

interface VisibleColumns {
  details: boolean;
  metadata: boolean;
}

interface DesktopFiltersAreaProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  originFilter: string;
  setOriginFilter: (o: string) => void;
  countryFilter: string;
  setCountryFilter: (c: string) => void;
  countrySortMode: string;
  setCountrySortMode: React.Dispatch<React.SetStateAction<'alpha' | 'count'>>;
  hasNotesFilter: boolean;
  setHasNotesFilter: (h: boolean) => void;
  myContactsWithActivitiesFilter: boolean;
  setMyContactsWithActivitiesFilter: (m: boolean) => void;
  hideContactsWithTodayActivities: boolean;
  setHideContactsWithTodayActivities: (h: boolean) => void;
  filterOnlyWithAlias: boolean;
  setFilterOnlyWithAlias: (f: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  allRecords: ImportedContact[];
  getUniqueValuesWithCount: (field: string) => Array<{ value: string; count: number }>;
  getCountryFullName: (code: string) => string;
  hasCompletedActivityToday: (id: string) => boolean;
  sortConfig: SortConfig;
  setSortConfig: (config: SortConfig | ((prev: SortConfig) => SortConfig)) => void;
  activeFilters: FilterTag[];
  setActiveFilters: (filters: FilterTag[] | ((prev: FilterTag[]) => FilterTag[])) => void;
  visibleColumns: VisibleColumns;
  setVisibleColumns: (cols: VisibleColumns | ((prev: VisibleColumns) => VisibleColumns)) => void;
}

export const DesktopFiltersArea: React.FC<DesktopFiltersAreaProps> = ({
  showFilters,
  setShowFilters,
  originFilter,
  setOriginFilter,
  countryFilter,
  setCountryFilter,
  countrySortMode,
  setCountrySortMode,
  hasNotesFilter,
  setHasNotesFilter,
  myContactsWithActivitiesFilter,
  setMyContactsWithActivitiesFilter,
  hideContactsWithTodayActivities,
  setHideContactsWithTodayActivities,
  filterOnlyWithAlias,
  setFilterOnlyWithAlias,
  searchQuery,
  setSearchQuery,
  allRecords,
  getUniqueValuesWithCount,
  getCountryFullName,
  hasCompletedActivityToday,
  sortConfig,
  setSortConfig,
  activeFilters,
  setActiveFilters,
  visibleColumns,
  setVisibleColumns,
}) => {
  return (
    <div className="flex items-center gap-1">
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogTrigger asChild>
          <Button
            variant={(originFilter || countryFilter || hasNotesFilter || myContactsWithActivitiesFilter) ? "default" : "outline"}
            size="sm"
            className={`shrink-0 p-2 ${(originFilter || countryFilter || hasNotesFilter || myContactsWithActivitiesFilter) ? 'border-yellow-500 bg-yellow-500 hover:bg-yellow-600 animate-pulse' : 'border-0'}`}
          >
            <Filter className={`h-4 w-4 ${(originFilter || countryFilter || hasNotesFilter || myContactsWithActivitiesFilter) ? 'text-white' : ''}`} />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filtri e Opzioni</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Filters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origine</Label>
                <Select value={originFilter} onValueChange={setOriginFilter}>
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Nazione</Label>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={countrySortMode === 'alpha' ? 'default' : 'ghost'}
                      onClick={() => setCountrySortMode('alpha')}
                      className="h-6 px-2 text-xs"
                    >
                      A-Z
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={countrySortMode === 'count' ? 'default' : 'ghost'}
                      onClick={() => setCountrySortMode('count')}
                      className="h-6 px-2 text-xs"
                    >
                      #
                    </Button>
                  </div>
                </div>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
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

              <div className="space-y-2">
                <Label>Ordina per</Label>
                <Select 
                  value={sortConfig.primary ? `${sortConfig.primary.column}-${sortConfig.primary.direction}` : "NONE"} 
                  onValueChange={(value) => {
                    if (value === "NONE") {
                      setSortConfig({ primary: null, secondary: null });
                      return;
                    }
                    const [column, direction] = value.split('-');
                    setSortConfig(prev => ({ 
                      ...prev, 
                      primary: { column, direction: direction as 'asc' | 'desc' } 
                    }));
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

              {sortConfig.primary && (
                <div className="space-y-2">
                  <Label>Poi per</Label>
                  <Select 
                    value={sortConfig.secondary ? `${sortConfig.secondary.column}-${sortConfig.secondary.direction}` : "NONE"} 
                    onValueChange={(value) => {
                      if (value === "NONE") {
                        setSortConfig(prev => ({ ...prev, secondary: null }));
                        return;
                      }
                      const [column, direction] = value.split('-');
                      setSortConfig(prev => ({ 
                        ...prev, 
                        secondary: { column, direction: direction as 'asc' | 'desc' } 
                      }));
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
                    setActiveFilters(prev => prev.filter(f => f.field !== 'has_activities'));
                    if (value === 'with_activities') {
                      setActiveFilters(prev => [...prev, {
                        field: 'has_activities',
                        value: true,
                        displayValue: 'Con attività'
                      }]);
                    } else if (value === 'without_activities') {
                      setActiveFilters(prev => [...prev, {
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
            </div>

            <Separator />

            {/* Toggle Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-notes-filter-desktop-popup"
                  checked={hasNotesFilter}
                  onCheckedChange={(checked) => setHasNotesFilter(checked as boolean)}
                />
                <Label htmlFor="has-notes-filter-desktop-popup" className="flex items-center gap-2 cursor-pointer">
                  <StickyNote className="h-4 w-4 text-blue-500" />
                  Solo con note
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="my-contacts-activities-filter-desktop-popup"
                  checked={myContactsWithActivitiesFilter}
                  onCheckedChange={(checked) => setMyContactsWithActivitiesFilter(checked as boolean)}
                />
                <Label htmlFor="my-contacts-activities-filter-desktop-popup" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4 text-primary" />
                  Solo con mie attività
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="filter-only-with-alias-desktop"
                  checked={filterOnlyWithAlias}
                  onCheckedChange={setFilterOnlyWithAlias}
                />
                <Label htmlFor="filter-only-with-alias-desktop" className="cursor-pointer">
                  Solo con alias azienda
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="hide-today-activities-desktop"
                  checked={hideContactsWithTodayActivities}
                  onCheckedChange={setHideContactsWithTodayActivities}
                />
                <Label htmlFor="hide-today-activities-desktop" className="cursor-pointer">
                  Nascondi attività oggi
                </Label>
                {hideContactsWithTodayActivities && (() => {
                  const hiddenCount = allRecords.filter(record => hasCompletedActivityToday(record.id)).length;
                  return hiddenCount > 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      {hiddenCount} nascosti
                    </Badge>
                  ) : null;
                })()}
              </div>
            </div>

            <Separator />

            {/* Column Visibility */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Visibilità Colonne</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={visibleColumns.details ? "default" : "outline"}
                  onClick={() => setVisibleColumns(prev => ({ ...prev, details: !prev.details }))}
                  className="flex items-center gap-2"
                >
                  <Briefcase className="h-4 w-4" />
                  Dettagli Commerciali
                </Button>
                
                <Button
                  size="sm"
                  variant={visibleColumns.metadata ? "default" : "outline"}
                  onClick={() => setVisibleColumns(prev => ({ ...prev, metadata: !prev.metadata }))}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Metadata & Sistema
                </Button>
              </div>
            </div>
            
            {/* Confirm Button */}
            <div className="pt-4 border-t">
              <Button 
                className="w-full" 
                onClick={() => setShowFilters(false)}
              >
                Applica Filtri
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Clear Filters Button */}
      {(searchQuery || originFilter || countryFilter || hasNotesFilter || myContactsWithActivitiesFilter) && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 p-2"
          onClick={() => {
            setSearchQuery('');
            setOriginFilter('');
            setCountryFilter('');
            setHasNotesFilter(false);
            setMyContactsWithActivitiesFilter(false);
            setFilterOnlyWithAlias(true);
          }}
        >
          <FilterX className="h-4 w-4 text-red-500" />
        </Button>
      )}
    </div>
  );
};
