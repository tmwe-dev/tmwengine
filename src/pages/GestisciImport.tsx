import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Upload, Trash2, Users, Database, Search, Filter, ChevronUp, ChevronDown, X } from 'lucide-react';
import { ImportProgressMonitor } from '@/components/import/ImportProgressMonitor';
import { ImportLogMobileCard } from '@/components/import/ImportLogMobileCard';
import { CompactContactCard } from '@/components/import/CompactContactCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import countriesData from '@/data/countries.json';

// Utility function to format empty values
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

// Function to get country flag emoji
const getCountryFlag = (countryName: string): string => {
  if (!countryName) return '';
  
  const countryFlags: { [key: string]: string } = {
    'italy': '🇮🇹', 'italia': '🇮🇹', 'it': '🇮🇹', 'ita': '🇮🇹',
    'france': '🇫🇷', 'francia': '🇫🇷', 'fr': '🇫🇷', 'fra': '🇫🇷',
    'germany': '🇩🇪', 'germania': '🇩🇪', 'de': '🇩🇪', 'deu': '🇩🇪',
    'spain': '🇪🇸', 'spagna': '🇪🇸', 'es': '🇪🇸', 'esp': '🇪🇸',
    'united kingdom': '🇬🇧', 'uk': '🇬🇧', 'gb': '🇬🇧',
    'united states': '🇺🇸', 'usa': '🇺🇸', 'us': '🇺🇸',
    'china': '🇨🇳', 'cina': '🇨🇳', 'cn': '🇨🇳',
    'japan': '🇯🇵', 'giappone': '🇯🇵', 'jp': '🇯🇵'
  };
  
  const normalizedCountry = countryName.toLowerCase().trim().replace(/\s+/g, ' ');
  
  if (countryFlags[normalizedCountry]) {
    return countryFlags[normalizedCountry];
  }
  
  for (const [key, flag] of Object.entries(countryFlags)) {
    if (normalizedCountry.includes(key) || key.includes(normalizedCountry)) {
      return flag;
    }
  }
  
  return '🌍';
};

interface ImportLog {
  id: string;
  file_name: string;
  file_path: string;
  nome_tabella_temporanea: string | null;
  righe_totali: number;
  righe_importate: number;
  righe_errori: number;
  contatti_selezionati: number;
  stato: string;
  trasferiti_rubrica: boolean;
  created_at: string;
}

interface ImportedContact {
  [key: string]: any;
}

export default function GestisciImport() {
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [monitoringImportId, setMonitoringImportId] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState({
    isProcessing: false
  });
  const [selectedImport, setSelectedImport] = useState<ImportLog | null>(null);
  const [loadingAllRecords, setLoadingAllRecords] = useState(false);
  const [showRecordsDialog, setShowRecordsDialog] = useState(false);
  const [allRecords, setAllRecords] = useState<ImportedContact[]>([]);
  const [viewingRecords, setViewingRecords] = useState<ImportedContact[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ImportedContact[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [recordsPerPage, setRecordsPerPage] = useState(50);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    loadImportLogs();
  }, []);

  const loadImportLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setImportLogs(data || []);
    } catch (error) {
      console.error('Errore nel caricamento log importazioni:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (stato: string) => {
    const statusMap: { [key: string]: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } } = {
      'pronto_per_elaborazione': { label: 'Pronto', variant: 'outline' },
      'file_salvato': { label: 'Salvato', variant: 'secondary' },
      'in_elaborazione': { label: 'Elaborazione...', variant: 'default' },
      'completato': { label: 'Completato', variant: 'default' },
      'errore': { label: 'Errore', variant: 'destructive' }
    };

    const status = statusMap[stato] || { label: stato, variant: 'outline' as const };
    return <Badge variant={status.variant}>{status.label}</Badge>;
  };

  const processFile = async (logId: string) => {
    try {
      setImportProgress({ isProcessing: true });
      setMonitoringImportId(logId);

      const { data, error } = await supabase.functions.invoke('process-saved-file', {
        body: { import_log_id: logId }
      });

      if (error) throw error;

      toast.success('File elaborato con successo');
      await loadImportLogs();
    } catch (error: any) {
      console.error('Errore elaborazione file:', error);
      toast.error(error.message || 'Errore durante l\'elaborazione del file');
      setMonitoringImportId(null);
    } finally {
      setImportProgress({ isProcessing: false });
    }
  };

  const loadAllRecords = async (importLog: ImportLog) => {
    setLoadingAllRecords(true);
    setSelectedImport(importLog);

    try {
      console.log('Caricamento tutti i record da imported_contacts per import_log_id:', importLog.id);
      
      const { count } = await supabase
        .from('imported_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('import_log_id', importLog.id);
      
      console.log('Totale record nel database:', count);
      
      const allRecords = [];
      const batchSize = 1000;
      let from = 0;
      
      while (from < (count || 0)) {
        const to = Math.min(from + batchSize - 1, (count || 0) - 1);
        
        console.log(`Caricamento batch: ${from}-${to}`);
        
        const { data: batchData, error } = await supabase
          .from('imported_contacts')
          .select('*')
          .eq('import_log_id', importLog.id)
          .range(from, to);
        
        if (error) {
          console.error('Errore nel batch', from, to, error);
          throw error;
        }
        
        if (batchData) {
          allRecords.push(...batchData);
          console.log(`Batch caricato: ${batchData.length} record, totale: ${allRecords.length}`);
        }
        
        from += batchSize;
        
        if (!batchData || batchData.length < batchSize) {
          break;
        }
      }
      
      console.log('Record effettivamente caricati:', allRecords.length, 'di', count);
      
      setAllRecords(allRecords);
      setTotalRecords(count || 0);
      setShowRecordsDialog(true);
      
      setSearchQuery('');
      setOriginFilter('');
      setCountryFilter('');
      setSelectedRecords(new Set());
      setCurrentPage(0);
    } catch (error) {
      console.error('Errore nel caricamento record:', error);
      toast.error('Errore nel caricamento dei record');
      setAllRecords([]);
    } finally {
      setLoadingAllRecords(false);
    }
  };

  const viewImportRecords = (log: ImportLog) => {
    loadAllRecords(log);
  };

  const getCountryFullName = (countryCode: string): string => {
    if (!countryCode) return '';
    
    const country = countriesData.find(c => 
      c.code.toLowerCase() === countryCode.toLowerCase()
    );
    
    return country ? country.name : countryCode;
  };

  const getUniqueValues = (field: string) => {
    const values = [...new Set(allRecords.map(record => record[field]))]
      .filter(value => value && String(value).trim() !== '')
      .sort();
    return values;
  };

  // Apply search and filters
  useEffect(() => {
    let result = [...allRecords];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(record => {
        const searchFields = [
          record.company_name,
          record.company_alias,
          record.name,
          record.alias,
          record.city
        ];
        
        return searchFields.some(field => 
          field && String(field).toLowerCase().includes(query)
        );
      });
    }
    
    if (originFilter && originFilter !== '__all__') {
      result = result.filter(record => record.origin === originFilter);
    }
    
    if (countryFilter && countryFilter !== '__all__') {
      result = result.filter(record => record.country === countryFilter);
    }
    
    setFilteredRecords(result);
    
    const startIndex = currentPage * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    setViewingRecords(result.slice(startIndex, endIndex));
  }, [allRecords, searchQuery, originFilter, countryFilter, recordsPerPage, currentPage]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, originFilter, countryFilter, recordsPerPage]);

  const deleteImportedContact = async (contactId: string, index: number) => {
    try {
      const { error } = await supabase
        .from('imported_contacts')
        .delete()
        .eq('id', contactId);
        
      if (error) throw error;
      
      const newAllRecords = allRecords.filter(record => record.id !== contactId);
      setAllRecords(newAllRecords);
      
      const newSelectedRecords = new Set<number>();
      selectedRecords.forEach(selectedIndex => {
        if (selectedIndex < index) {
          newSelectedRecords.add(selectedIndex);
        } else if (selectedIndex > index) {
          newSelectedRecords.add(selectedIndex - 1);
        }
      });
      setSelectedRecords(newSelectedRecords);
      
      toast.success('Record eliminato');
    } catch (error) {
      console.error('Errore eliminazione record:', error);
      toast.error('Errore eliminazione record');
    }
  };

  const deleteImportFile = async (log: ImportLog) => {
    if (!confirm(`Vuoi eliminare "${log.file_name}"?`)) return;

    try {
      const { error } = await supabase
        .from('import_logs')
        .delete()
        .eq('id', log.id);

      if (error) throw error;

      toast.success('File eliminato');
      loadImportLogs();
    } catch (error) {
      console.error('Errore eliminazione:', error);
      toast.error('Errore durante l\'eliminazione');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Gestisci Import</h1>
        <p className="text-muted-foreground">Visualizza e gestisci i file importati. Seleziona i contatti da trasferire nella rubrica principale.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Log Importazioni
          </CardTitle>
          <CardDescription>
            Gestisci i file importati e trasferisci i contatti nella rubrica principale
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            /* Mobile View - Cards */
            <div className="space-y-3">
              {importLogs.map((log) => (
                <ImportLogMobileCard
                  key={log.id}
                  log={log}
                  onProcess={() => processFile(log.id)}
                  onViewRecords={() => viewImportRecords(log)}
                  onDelete={() => deleteImportFile(log)}
                  getStatusBadge={getStatusBadge}
                  isProcessing={importProgress.isProcessing}
                  isLoading={loadingAllRecords && selectedImport?.id === log.id}
                  isSelected={selectedImport?.id === log.id}
                />
              ))}
            </div>
          ) : (
            /* Desktop View - Table */
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Errori</TableHead>
                  <TableHead>Selezionati</TableHead>
                  <TableHead>Azioni</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{log.file_name}</TableCell>
                    <TableCell>{getStatusBadge(log.stato)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-primary">{log.righe_totali}</span>
                        <span className="text-sm text-muted-foreground">record</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-red-600">{log.righe_errori}</TableCell>
                    <TableCell className="text-blue-600">{log.contatti_selezionati}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {/* Pulsante per processare file salvati */}
                        {(log.stato === 'pronto_per_elaborazione' || log.stato === 'file_salvato') && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => processFile(log.id)}
                            disabled={importProgress.isProcessing}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Elabora
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => viewImportRecords(log)}
                          disabled={loadingAllRecords || log.stato === 'pronto_per_elaborazione' || log.stato === 'file_salvato'}
                        >
                          <Users className="h-4 w-4" />
                          {loadingAllRecords && selectedImport?.id === log.id ? 'Caricamento...' : 'Gestisci'}
                        </Button>
                        
                        {log.trasferiti_rubrica && (
                          <Badge variant="outline" className="text-blue-800 bg-transparent border-transparent">
                            Trasferiti
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteImportFile(log)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {importLogs.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              Nessun file importato
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Monitor progresso importazione */}
      {monitoringImportId && (
        <ImportProgressMonitor
          importLogId={monitoringImportId}
          onComplete={() => {
            loadImportLogs();
            setMonitoringImportId(null);
          }}
        />
      )}

      {/* Dialog per visualizzare i record importati */}
      <Dialog open={showRecordsDialog} onOpenChange={(open) => {
        if (!open) {
          setShowRecordsDialog(false);
          setSelectedImport(null);
          setAllRecords([]);
          setViewingRecords([]);
          setFilteredRecords([]);
          setCurrentPage(0);
          setSelectedRecords(new Set());
          setSearchQuery('');
          setOriginFilter('');
          setCountryFilter('');
        }
      }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[85vh] flex flex-col mx-auto my-auto overflow-hidden">
          <DialogHeader>
            {isMobile ? (
              <div className="space-y-3">
                <DialogTitle className="text-lg font-semibold">
                  {selectedImport?.file_name}
                </DialogTitle>
                <div className="text-sm text-muted-foreground">
                  <span className="text-primary font-medium">{filteredRecords.length}</span> di <span className="text-primary font-medium">{totalRecords}</span> contatti
                </div>
                
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="w-full justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filtri e Ricerca
                    </div>
                    {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  
                  {showFilters && (
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Cerca..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-9"
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <Select value={originFilter} onValueChange={setOriginFilter}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Origine" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Tutte</SelectItem>
                            {getUniqueValues('origin').map((origin) => (
                              <SelectItem key={origin} value={String(origin)}>
                                {String(origin)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select value={countryFilter} onValueChange={setCountryFilter}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Paese" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Tutti</SelectItem>
                            {getUniqueValues('country').map((country) => (
                              <SelectItem key={country} value={String(country)}>
                                {getCountryFullName(String(country))}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select value={String(recordsPerPage)} onValueChange={(value) => setRecordsPerPage(Number(value))}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  
                  {(searchQuery || originFilter || countryFilter) && (
                    <div className="flex flex-wrap gap-1">
                      {searchQuery && (
                        <Badge variant="secondary" className="text-xs">
                          🔍 {searchQuery}
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1" onClick={() => setSearchQuery('')}>
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      )}
                      {originFilter && (
                        <Badge variant="secondary" className="text-xs">
                          📂 {originFilter}
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1" onClick={() => setOriginFilter('')}>
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      )}
                      {countryFilter && (
                        <Badge variant="secondary" className="text-xs">
                          🌍 {getCountryFullName(countryFilter)}
                          <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1" onClick={() => setCountryFilter('')}>
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex-1">
                  <DialogTitle>
                    Record Importati - {selectedImport?.file_name}
                  </DialogTitle>
                  <DialogDescription>
                    Visualizza e gestisci <span className="text-lg font-semibold text-primary">{filteredRecords.length}</span> di <span className="text-lg font-semibold text-primary">{totalRecords}</span> contatti importati
                  </DialogDescription>
                </div>
                
                <div className="flex gap-2 items-end flex-row">
                  <div className="w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cerca per nome azienda, alias, nome, città..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-row">
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
                    
                    <div className="w-36">
                      <Label htmlFor="records-per-page" className="text-sm font-medium">Record/pagina</Label>
                      <Select value={String(recordsPerPage)} onValueChange={(value) => setRecordsPerPage(Number(value))}>
                        <SelectTrigger id="records-per-page">
                          <SelectValue placeholder={`${recordsPerPage} record`} />
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
                </div>
              </div>
            )}
          </DialogHeader>

          {loadingAllRecords ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p>Caricamento record...</p>
              </div>
            </div>
          ) : filteredRecords.length > 0 ? (
            <div className="space-y-4 flex flex-col min-h-0 flex-1">
              {isMobile ? (
                <div className="space-y-2 flex-1 overflow-auto touch-pan-y touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {viewingRecords.map((record, viewIndex) => {
                    const actualIndex = currentPage * recordsPerPage + viewIndex;
                    return (
                      <CompactContactCard
                        key={viewIndex}
                        contact={record}
                        index={actualIndex}
                        isSelected={selectedRecords.has(actualIndex)}
                        onSelect={(index, selected) => {
                          const newSelected = new Set(selectedRecords);
                          if (selected) {
                            newSelected.add(index);
                          } else {
                            newSelected.delete(index);
                          }
                          setSelectedRecords(newSelected);
                        }}
                        onView={() => toast.info('Visualizzazione dettaglio in sviluppo')}
                        onDelete={() => deleteImportedContact(record.id, actualIndex)}
                        getCountryFlag={getCountryFlag}
                        formatCellValue={formatCellValue}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-auto flex-1">
                  <p className="text-sm text-muted-foreground mb-2">
                    Mostrando {currentPage * recordsPerPage + 1}-{Math.min((currentPage + 1) * recordsPerPage, filteredRecords.length)} di {filteredRecords.length} record
                  </p>
                </div>
              )}
              
              {/* Pagination */}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  Pagina {currentPage + 1} di {Math.ceil(filteredRecords.length / recordsPerPage)}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                  >
                    Precedente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredRecords.length / recordsPerPage) - 1, prev + 1))}
                    disabled={currentPage >= Math.ceil(filteredRecords.length / recordsPerPage) - 1}
                  >
                    Successivo
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Nessun record trovato</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
