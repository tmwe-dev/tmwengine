import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Plus, Trash2, Eye, Edit, Mail, Users, Database, Clock, X, ChevronLeft, ChevronRight, Building, ChevronUp, ChevronDown, Search, Filter, Phone, FileText, CheckSquare, Paperclip, Activity, StickyNote, Briefcase, Settings, Monitor, RefreshCw, ArrowLeft } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ImportedContactMobileCard } from '@/components/import/ImportedContactMobileCard';
import { CompactContactCard } from '@/components/import/CompactContactCard';
import { ActivityIndicators } from '@/components/ui/activity-indicators';
import { useCompanyActivities } from '@/hooks/useCompanyActivities';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import countriesData from '@/data/countries.json';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AttivitaDialog } from '@/components/attivita/AttivitaDialog';

// Utility functions from ImportTemplates
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/;
  return phoneRegex.test(phone);
};

const cleanPhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

const capitalizeFirstLetter = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const removeDuplicates = (arr: any[], key: string): any[] => {
  const seen = new Set();
  return arr.filter(item => {
    const keyValue = item[key];
    return seen.has(keyValue) ? false : seen.add(keyValue);
  });
};

const formatCellValue = (value: any, fieldKey?: string): string => {
  if (value === null || value === undefined || value === '' || value === false || value === '-') {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'Sì' : '';
  }
  
  if (fieldKey && (typeof value === 'string' || value instanceof Date)) {
    const fieldLower = fieldKey.toLowerCase();
    
    if (fieldLower.includes('scheduled_contact') || fieldLower.includes('next_contact_date')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
        }
      } catch (e) {}
    }
    
    if (fieldLower.includes('created_at') || fieldLower.includes('updated_at')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
          const shortDate = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
          return `${time} - ${shortDate}`;
        }
      } catch (e) {}
    }
  }
  
  return String(value);
};

const getCountryFlag = (countryName: string): string => {
  if (!countryName) return '';
  
  const countryFlags: { [key: string]: string } = {
    'italy': '🇮🇹', 'italia': '🇮🇹', 'it': '🇮🇹', 'ita': '🇮🇹',
    'france': '🇫🇷', 'francia': '🇫🇷', 'fr': '🇫🇷', 'fra': '🇫🇷',
    'germany': '🇩🇪', 'germania': '🇩🇪', 'de': '🇩🇪', 'deu': '🇩🇪', 'deutsch': '🇩🇪',
    'spain': '🇪🇸', 'spagna': '🇪🇸', 'es': '🇪🇸', 'esp': '🇪🇸', 'españa': '🇪🇸',
    'united kingdom': '🇬🇧', 'uk': '🇬🇧', 'regno unito': '🇬🇧', 'gb': '🇬🇧', 'gbr': '🇬🇧',
    'england': '🇬🇧', 'inghilterra': '🇬🇧', 'great britain': '🇬🇧',
    'united states': '🇺🇸', 'usa': '🇺🇸', 'stati uniti': '🇺🇸', 'us': '🇺🇸',
    'united states of america': '🇺🇸', 'america': '🇺🇸',
    'china': '🇨🇳', 'cina': '🇨🇳', 'cn': '🇨🇳', 'chn': '🇨🇳',
    'japan': '🇯🇵', 'giappone': '🇯🇵', 'jp': '🇯🇵', 'jpn': '🇯🇵',
    'netherlands': '🇳🇱', 'olanda': '🇳🇱', 'paesi bassi': '🇳🇱', 'nl': '🇳🇱', 'nld': '🇳🇱', 'holland': '🇳🇱',
    'belgium': '🇧🇪', 'belgio': '🇧🇪', 'be': '🇧🇪', 'bel': '🇧🇪',
    'switzerland': '🇨🇭', 'svizzera': '🇨🇭', 'ch': '🇨🇭', 'che': '🇨🇭',
    'austria': '🇦🇹', 'at': '🇦🇹', 'aut': '🇦🇹',
    'poland': '🇵🇱', 'polonia': '🇵🇱', 'pl': '🇵🇱', 'pol': '🇵🇱',
  };
  
  const normalized = countryName.toLowerCase().trim();
  return countryFlags[normalized] || '';
};

const getCountryFullName = (countryName: string): string => {
  if (!countryName) return '';
  const country = countriesData.find(c => 
    c.name.toLowerCase() === countryName.toLowerCase() || 
    c.code.toLowerCase() === countryName.toLowerCase()
  );
  return country ? `${getCountryFlag(countryName)} ${country.name}` : countryName;
};

const RecordImportati = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { importLogId } = useParams<{ importLogId: string }>();
  const isMobile = useIsMobile();
  
  const [importLog, setImportLog] = useState<any>(null);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [loadingAllRecords, setLoadingAllRecords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [hasNotesFilter, setHasNotesFilter] = useState(false);
  const [hideContactsWithTodayActivities, setHideContactsWithTodayActivities] = useState(true);
  const [recordsPerPage, setRecordsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [showFiltersArea, setShowFiltersArea] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState({
    details: false,
    metadata: false
  });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [isAttivitaDialogOpen, setIsAttivitaDialogOpen] = useState(false);
  const [selectedContactIdForActivities, setSelectedContactIdForActivities] = useState<string | null>(null);

  const { getActivityCount, isLoading: loadingActivities, refreshActivities, getCompanyActivities } = useCompanyActivities();

  useEffect(() => {
    if (importLogId) {
      loadImportLog();
      loadAllRecords();
    }
  }, [importLogId]);

  const loadImportLog = async () => {
    if (!importLogId) return;
    
    const { data, error } = await supabase
      .from('import_logs')
      .select('*')
      .eq('id', importLogId)
      .single();
    
    if (error) {
      toast.error('Errore nel caricamento del log di importazione');
      return;
    }
    
    setImportLog(data);
  };

  const loadAllRecords = async () => {
    if (!importLogId) return;
    
    setLoadingAllRecords(true);
    try {
      const { data, error } = await supabase
        .from('imported_contacts')
        .select('*')
        .eq('import_log_id', importLogId)
        .order('row_number', { ascending: true });

      if (error) throw error;
      setAllRecords(data || []);
      await refreshActivities();
    } catch (error: any) {
      toast.error('Errore nel caricamento dei record');
    } finally {
      setLoadingAllRecords(false);
    }
  };


  const deleteImportedContact = async (contactId: string, index: number) => {
    try {
      const { error } = await supabase
        .from('imported_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      setAllRecords(prev => prev.filter(r => r.id !== contactId));
      setSelectedRecords(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
      
      toast.success('Record eliminato');
    } catch (error: any) {
      toast.error('Errore nell\'eliminazione del record');
    }
  };

  const getUniqueValues = (field: string): any[] => {
    const values = new Set();
    allRecords.forEach(record => {
      if (record[field]) {
        values.add(record[field]);
      }
    });
    return Array.from(values);
  };

  const hasCompletedActivityToday = (contactId: string): boolean => {
    const activities = getCompanyActivities(contactId);
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    
    return activities.some(activity => {
      if (activity.stato !== 'completata') return false;
      if (!activity.scadenza) return false;
      
      const activityDate = new Date(activity.scadenza);
      return activityDate >= todayStart && activityDate <= todayEnd;
    });
  };

  const filteredRecords = allRecords.filter(record => {
    // Filtro per contatti con attività completate oggi
    if (hideContactsWithTodayActivities && hasCompletedActivityToday(record.id)) {
      return false;
    }
    
    if (hasNotesFilter && !record.note) return false;
    if (originFilter && originFilter !== '__all__' && record.origin !== originFilter) return false;
    if (countryFilter && countryFilter !== '__all__' && record.country !== countryFilter) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (record.company_name && record.company_name.toLowerCase().includes(query)) ||
        (record.company_alias && record.company_alias.toLowerCase().includes(query)) ||
        (record.name && record.name.toLowerCase().includes(query)) ||
        (record.city && record.city.toLowerCase().includes(query))
      );
    }
    
    return true;
  });

  const sortedRecords = React.useMemo(() => {
    if (!sortConfig) return filteredRecords;

    return [...filteredRecords].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'attivita') {
        aValue = getActivityCount(a.id);
        bValue = getActivityCount(b.id);
      }

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, sortConfig, getActivityCount]);

  const totalPages = Math.ceil(sortedRecords.length / recordsPerPage);
  const viewingRecords = sortedRecords.slice(currentPage * recordsPerPage, (currentPage + 1) * recordsPerPage);

  const handleColumnSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const toggleRecordSelection = (index: number) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const currentPageIndexes = [];
    for (let i = 0; i < viewingRecords.length; i++) {
      currentPageIndexes.push(currentPage * recordsPerPage + i);
    }
    
    const allSelected = currentPageIndexes.every(index => selectedRecords.has(index));
    
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        currentPageIndexes.forEach(index => newSet.delete(index));
      } else {
        currentPageIndexes.forEach(index => newSet.add(index));
      }
      return newSet;
    });
  };

  const getVisibleColumns = (allColumns: string[]) => {
    const baseColumns = ['name', 'company_name', 'company_alias', 'country', 'title'];
    const detailColumns = ['position', 'email', 'phone', 'cell', 'address', 'city', 'zip_code'];
    const metadataColumns = ['origin', 'client_code', 'stato', 'agent_id', 'scheduled_contact', 'next_contact_date', 'last_contact', 'created_at', 'updated_at'];
    
    let columns = [...baseColumns];
    if (visibleColumns.details) {
      columns = [...columns, ...detailColumns];
    }
    if (visibleColumns.metadata) {
      columns = [...columns, ...metadataColumns];
    }
    
    return columns.filter(col => allColumns.includes(col));
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="max-w-[98vw] mx-auto">
        <CardHeader>
          {/* Header con pulsante Indietro */}
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/import-templates')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Indietro
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle>Record Importati - {importLog?.file_name}</CardTitle>
                <CardDescription className="mt-2">
                  {sortedRecords.length} record trovati
                </CardDescription>
              </div>
              
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={loadAllRecords}
                        className="h-8 px-2 gap-1"
                        disabled={loadingAllRecords}
                      >
                        <RefreshCw className={cn("h-4 w-4", loadingAllRecords && "animate-spin")} />
                        <span className="text-xs">Refresh</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ricarica i dati</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowFiltersArea(!showFiltersArea)}
                        className="h-8 px-2 gap-1"
                      >
                        <Monitor className="h-4 w-4" />
                        {showFiltersArea ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <span className="text-xs">{showFiltersArea ? 'Full screen' : 'Show filters'}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{showFiltersArea ? 'Nascondi filtri' : 'Mostra filtri'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            {showFiltersArea && (
              <div className="flex flex-col gap-3">
                
                <div className="flex items-end justify-center relative">
                  <div className="flex gap-2 items-end">
                    <div className="w-48">
                      <Label htmlFor="origin-filter" className="text-sm font-medium">Origine</Label>
                      <Select value={originFilter} onValueChange={setOriginFilter}>
                        <SelectTrigger id="origin-filter">
                          <SelectValue placeholder="Tutte le origini" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Tutte le origini</SelectItem>
                          {getUniqueValues('origin').map((origin) => (
                            <SelectItem key={origin} value={String(origin)}>
                              {String(origin)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-48">
                      <Label htmlFor="country-filter" className="text-sm font-medium">Paese</Label>
                      <Select value={countryFilter} onValueChange={setCountryFilter}>
                        <SelectTrigger id="country-filter">
                          <SelectValue placeholder="Tutti i paesi" />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          <SelectItem value="__all__">Tutti i paesi</SelectItem>
                          {getUniqueValues('country').map((country) => (
                            <SelectItem key={country} value={String(country)}>
                              {getCountryFullName(String(country))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-32">
                      <Label htmlFor="records-per-page" className="text-sm font-medium">Per pagina</Label>
                      <Select value={String(recordsPerPage)} onValueChange={(value) => {
                        setRecordsPerPage(Number(value));
                        setCurrentPage(0);
                      }}>
                        <SelectTrigger id="records-per-page">
                          <SelectValue placeholder={`${recordsPerPage}`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="250">250</SelectItem>
                          <SelectItem value="500">500</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="absolute right-0 flex items-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant={visibleColumns.details ? "default" : "outline"}
                            onClick={() => setVisibleColumns(prev => ({ ...prev, details: !prev.details }))}
                            className="h-8 w-8 p-0"
                          >
                            <Briefcase className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Dettagli Commerciali</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant={visibleColumns.metadata ? "default" : "outline"}
                            onClick={() => setVisibleColumns(prev => ({ ...prev, metadata: !prev.metadata }))}
                            className="h-8 w-8 p-0"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Metadata & Sistema</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                <div className="flex justify-center items-center relative">
                  {(searchQuery || originFilter || countryFilter || hasNotesFilter) && (
                    <div className="absolute left-0 flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('');
                          setOriginFilter('');
                          setCountryFilter('');
                          setHasNotesFilter(false);
                        }}
                        className="h-10 px-2 text-xs bg-blue-500 text-white hover:bg-blue-600"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Pulisci filtri
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {filteredRecords.length} trovati
                      </span>
                    </div>
                  )}
                  
                  <div className="w-96">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Cerca per nome azienda, alias, nome, città..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Checkbox e Switch sotto la barra di ricerca */}
                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasNotes"
                      checked={hasNotesFilter}
                      onCheckedChange={(checked) => setHasNotesFilter(checked === true)}
                    />
                    <Label htmlFor="hasNotes" className="text-sm cursor-pointer flex items-center gap-1">
                      <StickyNote className="h-4 w-4" />
                      Solo con note
                    </Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      id="hide-today-activities"
                      checked={hideContactsWithTodayActivities}
                      onCheckedChange={setHideContactsWithTodayActivities}
                    />
                    <Label htmlFor="hide-today-activities" className="text-sm cursor-pointer">
                      Nascondi attività eseguite oggi
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {loadingAllRecords ? (
            <div className="text-center py-8 text-muted-foreground">
              Caricamento in corso...
            </div>
          ) : viewingRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun record trovato
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {viewingRecords.map((record, index) => {
                const globalIndex = currentPage * recordsPerPage + index;
                return (
                  <CompactContactCard
                    key={record.id}
                    contact={record}
                    index={globalIndex}
                    isSelected={selectedRecords.has(globalIndex)}
                    onSelect={(idx, selected) => {
                      if (selected) {
                        setSelectedRecords(prev => new Set(prev).add(idx));
                      } else {
                        setSelectedRecords(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(idx);
                          return newSet;
                        });
                      }
                    }}
                    onView={() => {
                      setSelectedContactIdForActivities(record.id);
                      setIsAttivitaDialogOpen(true);
                    }}
                    onDelete={() => deleteImportedContact(record.id, globalIndex)}
                    onCreateActivity={() => {
                      setSelectedContactIdForActivities(record.id);
                      setIsAttivitaDialogOpen(true);
                    }}
                    getCountryFlag={getCountryFlag}
                    formatCellValue={formatCellValue}
                  />
                );
              })}
            </div>
          )}
          
          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Precedente
            </Button>
            
            <span className="text-sm text-muted-foreground">
              Pagina {currentPage + 1} di {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              Successiva
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <AttivitaDialog
        open={isAttivitaDialogOpen}
        onOpenChange={setIsAttivitaDialogOpen}
        filterByContactId={selectedContactIdForActivities}
      />
    </div>
  );
};

export default RecordImportati;
