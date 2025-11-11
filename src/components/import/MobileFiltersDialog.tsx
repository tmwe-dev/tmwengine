import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { StickyNote, User } from 'lucide-react';

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

interface MobileFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  originFilter: string;
  setOriginFilter: (o: string) => void;
  countryFilter: string;
  setCountryFilter: (c: string) => void;
  hasNotesFilter: boolean;
  setHasNotesFilter: (h: boolean) => void;
  myContactsWithActivitiesFilter: boolean;
  setMyContactsWithActivitiesFilter: (m: boolean) => void;
  hideContactsWithTodayActivities: boolean;
  setHideContactsWithTodayActivities: (h: boolean) => void;
  allRecords: ImportedContact[];
  getUniqueValuesWithCount: (field: string) => Array<{ value: string; count: number }>;
  getCountryFullName: (code: string) => string;
  hasCompletedActivityToday: (id: string) => boolean;
  sortConfig: SortConfig;
  setSortConfig: (config: SortConfig | ((prev: SortConfig) => SortConfig)) => void;
  activeFilters: FilterTag[];
  setActiveFilters: (filters: FilterTag[] | ((prev: FilterTag[]) => FilterTag[])) => void;
}

export const MobileFiltersDialog: React.FC<MobileFiltersDialogProps> = ({
  open,
  onOpenChange,
  originFilter,
  setOriginFilter,
  countryFilter,
  setCountryFilter,
  hasNotesFilter,
  setHasNotesFilter,
  myContactsWithActivitiesFilter,
  setMyContactsWithActivitiesFilter,
  hideContactsWithTodayActivities,
  setHideContactsWithTodayActivities,
  allRecords,
  getUniqueValuesWithCount,
  getCountryFullName,
  hasCompletedActivityToday,
  sortConfig,
  setSortConfig,
  activeFilters,
  setActiveFilters,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw]">
        <DialogHeader>
          <DialogTitle>Filtri</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Filters */}
          <div className="space-y-3">
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
              <Label>Nazione</Label>
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

            <div className="flex items-center space-x-2">
              <Switch
                id="hide-today-activities-mobile"
                checked={hideContactsWithTodayActivities}
                onCheckedChange={setHideContactsWithTodayActivities}
              />
              <Label htmlFor="hide-today-activities-mobile" className="cursor-pointer">
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-notes-filter-mobile"
                checked={hasNotesFilter}
                onCheckedChange={(checked) => setHasNotesFilter(checked as boolean)}
              />
              <Label htmlFor="has-notes-filter-mobile" className="flex items-center gap-2 cursor-pointer">
                <StickyNote className="h-4 w-4 text-blue-500" />
                Solo con note
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="my-contacts-activities-filter-mobile"
                checked={myContactsWithActivitiesFilter}
                onCheckedChange={(checked) => setMyContactsWithActivitiesFilter(checked as boolean)}
              />
              <Label htmlFor="my-contacts-activities-filter-mobile" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4 text-primary" />
                Solo con mie attività
              </Label>
            </div>
          </div>
          
          {/* Confirm Button */}
          <div className="pt-4 border-t">
            <Button 
              className="w-full" 
              onClick={() => onOpenChange(false)}
            >
              Conferma
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
