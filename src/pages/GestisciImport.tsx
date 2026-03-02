import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Trash2, Eye, PlayCircle, RefreshCw, Users, X, Search, Filter, ChevronDown, ChevronUp, Database, Activity, FileText, Wrench, FileDown, TableProperties } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCompanyActivities } from '@/hooks/useCompanyActivities';
import { ImportLogMobileCard } from '@/components/import/ImportLogMobileCard';
import { ImportedContactMobileCard } from '@/components/import/ImportedContactMobileCard';
import { AdvancedMultipleActivityForm } from '@/components/attivita/AdvancedMultipleActivityForm';
import { cn } from '@/lib/utils';
import { useExportImportedData } from '@/hooks/useExportImportedData';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ImportProgressMonitor } from '@/components/import/ImportProgressMonitor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MobileRecordDetailLayout } from '@/components/record-detail/MobileRecordDetailLayout';
import countriesData from '@/data/countries.json';

// Utility functions
const formatCellValue = (value: any, fieldKey?: string): string => {
  if (value === null || value === undefined || value === '' || value === false || value === '-') {
    return '-';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Sì' : 'No';
  }
  
  if (fieldKey && (fieldKey.includes('date') || fieldKey === 'scheduled_contact' || fieldKey === 'last_contact' || fieldKey === 'next_contact_date')) {
    if (value && value !== '-') {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('it-IT');
        }
      } catch (e) {
        return String(value);
      }
    }
  }
  
  return String(value);
};

const getCountryFlag = (countryName: string): string => {
  if (!countryName) return '';
  
  // Map country code to flag emoji
  const countryFlags: { [key: string]: string } = {
    'IT': '🇮🇹', 'FR': '🇫🇷', 'DE': '🇩🇪', 'ES': '🇪🇸', 'GB': '🇬🇧',
    'US': '🇺🇸', 'CN': '🇨🇳', 'JP': '🇯🇵', 'NL': '🇳🇱', 'BE': '🇧🇪',
    'CH': '🇨🇭', 'AT': '🇦🇹', 'PL': '🇵🇱', 'PT': '🇵🇹', 'GR': '🇬🇷',
  };
  
  const code = countryName.toUpperCase();
  return countryFlags[code] || '🌍';
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importToDelete, setImportToDelete] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { getActivityCount, getCompanyActivities } = useCompanyActivities();
  const navigate = useNavigate();
  const { download_original_file, download_imported_contacts, exporting_original, exporting_contacts } = useExportImportedData();

  // States for record viewing dialog
  const [showRecordsDialog, setShowRecordsDialog] = useState(false);
  const [selectedImport, setSelectedImport] = useState<ImportLog | null>(null);
  const [allRecords, setAllRecords] = useState<ImportedContact[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ImportedContact[]>([]);
  const [loadingAllRecords, setLoadingAllRecords] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(50);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [hasActivitiesFilter, setHasActivitiesFilter] = useState(false);
  
  // Column visibility
  const [visibleColumns] = useState({
    company: true,
    details: false,
    metadata: false
  });
  
  // Record detail dialog
  const [showRecordDetail, setShowRecordDetail] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ImportedContact | null>(null);
  
  // Multiple activity dialog
  const [showMultipleActivityDialog, setShowMultipleActivityDialog] = useState(false);
  const [creatingMultipleActivities, setCreatingMultipleActivities] = useState(false);

  useEffect(() => {
    loadImportLogs();
  }, []);

  // Function to handle creating multiple activities
  const handleCreateMultipleActivities = async (activityData: any) => {
    setCreatingMultipleActivities(true);
    
    try {
      const selectedContacts = Array.from(selectedRecords).map(index => {
        const record = allRecords[index];
        return {
          id: record.id,
          name: record.company_name || record.name || 'Azienda non specificata',
          source: 'imported_contacts'
        };
      });

      // Create one activity for each selected contact
      const activities = selectedContacts.map(contact => ({
        rubrica_id: contact.id,
        tipo: activityData.tipo,
        descrizione: activityData.descrizione,
        stato: activityData.stato || 'aperta',
        scadenza: activityData.scadenza || null,
        priorita: activityData.priorita || 'media',
        assegnato_a: activityData.assegnato_a || null,
        creato_da: activityData.creato_da || null
      }));

      const { error } = await supabase
        .from('attivita')
        .insert(activities);

      if (error) throw error;

      toast.success(`${activities.length} attività create con successo`);
      setShowMultipleActivityDialog(false);
      setSelectedRecords(new Set());
    } catch (error) {
      console.error('Error creating multiple activities:', error);
      toast.error('Errore durante la creazione delle attività');
    } finally {
      setCreatingMultipleActivities(false);
    }
  };

  // Apply search and filters
  useEffect(() => {
    let result = [...allRecords];
    
    // Apply search filter
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
    
    // Apply origin filter
    if (originFilter && originFilter !== '__all__') {
      result = result.filter(record => String(record.origin) === originFilter);
    }
    
    // Apply country filter
    if (countryFilter && countryFilter !== '__all__') {
      result = result.filter(record => String(record.country) === countryFilter);
    }
    
    // Apply activities filter
    if (hasActivitiesFilter) {
      result = result.filter(record => getActivityCount(record.id) > 0);
    }
    
    setFilteredRecords(result);
    setCurrentPage(0);
  }, [searchQuery, originFilter, countryFilter, hasActivitiesFilter, allRecords]);

  const loadImportLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImportLogs(data || []);
    } catch (error) {
      console.error('Error loading import logs:', error);
      toast.error('Errore nel caricamento degli import');
    } finally {
      setLoading(false);
    }
  };

  const processFile = async (importLogId: string) => {
    try {
      setMonitoringImportId(importLogId);

      const { error: invokeError } = await supabase.functions.invoke(
        'process-ai-import',
        {
          body: { 
            importLogId,
            aiPrompt: 'Analizza i dati importati e normalizzali nella tabella temporanea.'
          }
        }
      );

      if (invokeError) throw invokeError;

      toast.success('Elaborazione AI avviata');
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast.error(error.message || 'Errore durante l\'elaborazione del file');
      setMonitoringImportId(null);
    }
  };

  const handleDeleteImport = async () => {
    if (!importToDelete) return;

    try {
      const { error } = await supabase
        .from('import_logs')
        .delete()
        .eq('id', importToDelete);

      if (error) throw error;

      toast.success('Import eliminato con successo');
      loadImportLogs();
    } catch (error) {
      console.error('Error deleting import:', error);
      toast.error('Errore durante l\'eliminazione dell\'import');
    } finally {
      setDeleteDialogOpen(false);
      setImportToDelete(null);
    }
  };

  const viewImportRecords = async (importLog: ImportLog) => {
    setLoadingAllRecords(true);
    setSelectedImport(importLog);

    try {
      console.log('Caricamento tutti i record da imported_contacts per import_log_id:', importLog.id);
      
      const { count } = await supabase
        .from('imported_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('import_log_id', importLog.id);
      
      console.log('Totale record nel database:', count);
      
      const allRecordsData = [];
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
          allRecordsData.push(...batchData);
          console.log(`Batch caricato: ${batchData.length} record, totale: ${allRecordsData.length}`);
        }
        
        from += batchSize;
        
        if (!batchData || batchData.length < batchSize) {
          break;
        }
      }
      
      console.log('Record effettivamente caricati:', allRecordsData.length, 'di', count);
      
      setAllRecords(allRecordsData);
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

  const deleteImportedContact = async (contactId: string) => {
    try {
      // Prima elimina le attività associate
      const { error: activitiesError } = await supabase
        .from('attivita')
        .delete()
        .eq('rubrica_id', contactId);
        
      if (activitiesError) {
        console.error('Error deleting activities:', activitiesError);
        // Continua comunque con l'eliminazione del contatto
      }

      // Poi elimina il contatto importato
      const { error } = await supabase
        .from('imported_contacts')
        .delete()
        .eq('id', contactId);
        
      if (error) throw error;
      
      const newAllRecords = allRecords.filter(record => record.id !== contactId);
      setAllRecords(newAllRecords);
      setSelectedRecords(new Set());
      
      toast.success('Record e attività associate eliminati con successo');
    } catch (error) {
      console.error('Errore nell\'eliminazione del record:', error);
      toast.error('Errore nell\'eliminazione del record');
    }
  };

  const deleteSelectedRecords = async () => {
    if (selectedRecords.size === 0) {
      toast.error('Nessun record selezionato');
      return;
    }
    
    try {
      const recordsToDelete = Array.from(selectedRecords).map(index => {
        if (index >= 0 && index < allRecords.length) {
          return allRecords[index]?.id;
        }
        return null;
      }).filter(Boolean);
      
      if (recordsToDelete.length === 0) {
        toast.error('Nessun record valido selezionato');
        return;
      }

      // Prima elimina le attività associate
      const { error: activitiesError } = await supabase
        .from('attivita')
        .delete()
        .in('rubrica_id', recordsToDelete);
        
      if (activitiesError) {
        console.error('Error deleting activities:', activitiesError);
        // Continua comunque con l'eliminazione dei contatti
      }
      
      // Poi elimina i contatti importati
      const { error } = await supabase
        .from('imported_contacts')
        .delete()
        .in('id', recordsToDelete);
        
      if (error) throw error;
      
      const newAllRecords = allRecords.filter(record => 
        !recordsToDelete.includes(record.id)
      );
      setAllRecords(newAllRecords);
      setSelectedRecords(new Set());
      
      toast.success(`${recordsToDelete.length} record e attività associate eliminati con successo`);
    } catch (error) {
      console.error('Errore nell\'eliminazione dei record:', error);
      toast.error('Errore nell\'eliminazione dei record');
    }
  };

  const importSelectedRecords = async () => {
    if (selectedRecords.size === 0) {
      toast.error('Nessun record selezionato');
      return;
    }

    try {
      const recordsToImport = Array.from(selectedRecords).map(index => allRecords[index]);
      
      const contactsToTransfer = recordsToImport.map(record => ({
        nome: record.name || '',
        azienda: record.company_name || '',
        company_alias: record.company_alias || '',
        email: record.email || '',
        telefono: record.phone || '',
        cellulare: record.cell || '',
        indirizzo: record.address || '',
        citta: record.city || '',
        paese: record.country || '',
        zip_code: record.zip_code || '',
        origine: record.origin || 'imported',
        responsabile: '',
        position: record.position || '',
        title: record.title || '',
        alias: record.alias || '',
      }));

      const { error } = await supabase
        .from('rubrica')
        .insert(contactsToTransfer);

      if (error) throw error;

      await supabase
        .from('imported_contacts')
        .update({ is_imported_to_rubrica: true })
        .in('id', recordsToImport.map(r => r.id));

      toast.success(`${contactsToTransfer.length} contatti importati in rubrica`);
      
      loadImportLogs();
      setShowRecordsDialog(false);
      setSelectedImport(null);
      setAllRecords([]);
      setSelectedRecords(new Set());
      
    } catch (error) {
      console.error('Errore importazione:', error);
      toast.error('Errore durante l\'importazione');
    }
  };

  const getCountryFullName = (countryCode: string): string => {
    if (!countryCode) return '';
    const country = countriesData.find(
      c => c.code.toLowerCase() === countryCode.toLowerCase() || 
           c.name.toLowerCase() === countryCode.toLowerCase()
    );
    return country?.name || countryCode;
  };

  const getUniqueValues = (field: string) => {
    const values = [...new Set(allRecords.map(record => record[field]))]
      .filter(value => value !== null && value !== undefined && value !== '');
    return values;
  };

  const getStateBadgeColor = (stato: string) => {
    switch (stato) {
      case 'completato':
        return 'bg-green-500';
      case 'elaborazione':
        return 'bg-blue-500';
      case 'errore':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadge = (stato: string) => {
    const color = getStateBadgeColor(stato);
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${color}`}>
        {stato}
      </span>
    );
  };

  // Pagination
  const paginatedRecords = filteredRecords.slice(
    currentPage * recordsPerPage,
    (currentPage + 1) * recordsPerPage
  );

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestisci Import</h1>
        <Button onClick={loadImportLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      {monitoringImportId && (
        <Card className="bg-card-transparent">
          <CardContent className="pt-6">
            <ImportProgressMonitor
              importLogId={monitoringImportId}
              onComplete={() => {
                setMonitoringImportId(null);
                loadImportLogs();
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card className="bg-card-transparent">
        <CardHeader>
          <CardTitle>Storico Import</CardTitle>
        </CardHeader>
        <CardContent>
          {importLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun import trovato
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {importLogs.map((log) => (
                <ImportLogMobileCard
                  key={log.id}
                  log={log}
                  onViewRecords={() => viewImportRecords(log)}
                  onProcess={() => processFile(log.id)}
                  onDownloadOriginal={() => download_original_file(log.id)}
                  onDownloadContacts={() => download_imported_contacts(log.id)}
                  getStatusBadge={getStatusBadge}
                  isProcessing={monitoringImportId === log.id}
                  isLoading={loadingAllRecords && selectedImport?.id === log.id}
                  isSelected={selectedImport?.id === log.id}
                  isExportingOriginal={exporting_original}
                  isExportingContacts={exporting_contacts}
                />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                  <TableHead className="text-right">Importati</TableHead>
                  <TableHead className="text-right">Errori</TableHead>
                  <TableHead className="text-right">Selezionati</TableHead>
                  <TableHead className="text-center">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.file_name}</TableCell>
                    <TableCell>
                      {new Date(log.created_at).toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(log.stato)}
                    </TableCell>
                    <TableCell className="text-right">{log.righe_totali}</TableCell>
                    <TableCell className="text-right">{log.righe_importate}</TableCell>
                    <TableCell className="text-right">{log.righe_errori}</TableCell>
                    <TableCell className="text-right">
                      {log.contatti_selezionati}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewImportRecords(log)}
                          disabled={loadingAllRecords || log.stato === 'pronto_per_elaborazione' || log.stato === 'file_salvato'}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(log.stato === 'pronto_per_elaborazione' ||
                          log.stato === 'file_salvato') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => processFile(log.id)}
                          >
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {log.righe_errori > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/import-errors-monitor?import_log_id=${log.id}`)}
                            className="text-orange-500 hover:text-orange-600"
                          >
                            <Wrench className="h-4 w-4" />
                          </Button>
                        )}
                        {log.stato !== 'pronto_per_elaborazione' && log.stato !== 'file_salvato' && (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => download_original_file(log.id)}
                                    disabled={exporting_original}
                                  >
                                    <FileDown className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Scarica CSV originale</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => download_imported_contacts(log.id)}
                                    disabled={exporting_contacts}
                                  >
                                    <TableProperties className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Esporta contatti elaborati CSV</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setImportToDelete(log.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo import? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteImport}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Records Dialog */}
      <Dialog open={showRecordsDialog} onOpenChange={(open) => {
        if (!open) {
          setShowRecordsDialog(false);
          setSelectedImport(null);
          setAllRecords([]);
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
                              <SelectItem key={String(origin)} value={String(origin)}>
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
                              <SelectItem key={String(country)} value={String(country)}>
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
                      
                      {/* Activities Filter */}
                      <div className="flex items-center space-x-2 pt-2 border-t mt-2">
                        <input
                          type="checkbox"
                          id="hasActivitiesGestisci"
                          checked={hasActivitiesFilter}
                          onChange={(e) => setHasActivitiesFilter(e.target.checked)}
                          className="h-4 w-4"
                        />
                        <label htmlFor="hasActivitiesGestisci" className="text-xs font-medium">
                          Solo con attività associate
                        </label>
                      </div>
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
                    Visualizza e gestisci <span className="text-lg font-semibold text-blue-600">{filteredRecords.length}</span> di <span className="text-lg font-semibold text-blue-600">{totalRecords}</span> contatti importati da questo file.
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
                            <SelectItem key={String(origin)} value={String(origin)}>
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
                        <SelectContent>
                          <SelectItem value="__all__">Tutti i paesi</SelectItem>
                          {getUniqueValues('country').map((country) => (
                            <SelectItem key={String(country)} value={String(country)}>
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
                </div>
              </div>
            )}
          </DialogHeader>

          {!isMobile && (
            <div className="flex justify-between items-center gap-2 py-4 border-b">
              <div className="flex items-center gap-2">
                {selectedRecords.size > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={importSelectedRecords}
                          className="text-xs px-2"
                        >
                          <Database className="h-4 w-4 text-green-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Importa {selectedRecords.size} record in rubrica</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={deleteSelectedRecords}
                        disabled={selectedRecords.size === 0}
                        className="text-xs px-2"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {selectedRecords.size === 0 
                          ? 'Seleziona record da eliminare' 
                          : `Elimina ${selectedRecords.size} record selezionati`
                        }
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}

          {loadingAllRecords ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto">
                {isMobile ? (
                  <div className="space-y-3 p-4">
                    {paginatedRecords.map((record, index) => {
                      const actualIndex = currentPage * recordsPerPage + index;
                      return (
                        <ImportedContactMobileCard
                          key={record.id}
                          contact={record}
                          index={actualIndex}
                          isSelected={selectedRecords.has(actualIndex)}
                          onSelect={(idx, selected) => {
                            const newSelected = new Set(selectedRecords);
                            if (selected) {
                              newSelected.add(actualIndex);
                            } else {
                              newSelected.delete(actualIndex);
                            }
                            setSelectedRecords(newSelected);
                          }}
                          onView={() => {
                            setSelectedRecord(record);
                            setShowRecordDetail(true);
                          }}
                          onCreateActivity={() => {
                            setSelectedRecord(record);
                            setShowRecordDetail(true);
                          }}
                          getCompanyActivities={() => []}
                          getCountryFlag={getCountryFlag}
                          formatCellValue={formatCellValue}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={paginatedRecords.length > 0 && paginatedRecords.every((_, idx) => 
                            selectedRecords.has(currentPage * recordsPerPage + idx)
                          )}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedRecords);
                            paginatedRecords.forEach((_, idx) => {
                              const actualIndex = currentPage * recordsPerPage + idx;
                              if (checked) {
                                newSelected.add(actualIndex);
                              } else {
                                newSelected.delete(actualIndex);
                              }
                            });
                            setSelectedRecords(newSelected);
                          }}
                        />
                      </TableHead>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Azienda</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefono</TableHead>
                        <TableHead>Paese</TableHead>
                      <TableHead>Città</TableHead>
                      <TableHead>Indirizzo</TableHead>
                      <TableHead>Origine</TableHead>
                      <TableHead className="w-20">Attività</TableHead>
                      <TableHead className="w-20">Azioni</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRecords.map((record, index) => {
                        const actualIndex = currentPage * recordsPerPage + index;
                        const activities = getCompanyActivities(record.id);
                        const hasOpenActivities = activities.some((a: any) => 
                          a.stato === 'aperta' || a.stato === 'in_corso'
                        );
                        const hasOverdueActivities = activities.some((a: any) => 
                          a.scadenza && new Date(a.scadenza) < new Date() && a.stato !== 'completata'
                        );
                        
                        const rowBgColor = hasOverdueActivities 
                          ? 'bg-gradient-to-bl from-red-800/10 from-20% to-black/20 to-60% dark:from-red-900/10 dark:to-black/30' 
                          : hasOpenActivities 
                          ? 'bg-gradient-to-bl from-green-800/10 from-20% to-black/20 to-60% dark:from-green-900/10 dark:to-black/30'
                          : '';
                        
                        const rowOverlayStyle = (hasOverdueActivities || hasOpenActivities) ? {
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)',
                          opacity: 0.2
                        } : {};
                          
                        return (
                          <TableRow 
                            key={record.id} 
                            className={cn("relative", rowBgColor)}
                            style={{
                              backgroundImage: rowOverlayStyle.backgroundImage,
                              backgroundSize: '100% 100%'
                            }}
                          >
                            <TableCell>
                              <Checkbox
                                className="relative z-10"
                                checked={selectedRecords.has(actualIndex)}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(selectedRecords);
                                  if (checked) {
                                    newSelected.add(actualIndex);
                                  } else {
                                    newSelected.delete(actualIndex);
                                  }
                                  setSelectedRecords(newSelected);
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono relative z-10">
                              #{actualIndex + 1}
                            </TableCell>
                            <TableCell>{formatCellValue(record.company_name)}</TableCell>
                            <TableCell>{formatCellValue(record.name)}</TableCell>
                            <TableCell>{formatCellValue(record.email)}</TableCell>
                            <TableCell>{formatCellValue(record.phone)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className="text-base">{getCountryFlag(record.country)}</span>
                                <span>{formatCellValue(record.country)}</span>
                              </div>
                            </TableCell>
                            <TableCell>{formatCellValue(record.city)}</TableCell>
                            <TableCell>{formatCellValue(record.address)}</TableCell>
                            <TableCell>{formatCellValue(record.origin)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1 relative z-10">
                                {getActivityCount(record.id) > 0 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => navigate('/attivita', { state: { filterByContact: record.id } })}
                                          className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                                        >
                                          <Activity className="h-3 w-3 mr-1" />
                                          {getActivityCount(record.id)}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Visualizza {getActivityCount(record.id)} attività</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-500/10"
                                        onClick={() => {
                                          setSelectedRecords(new Set([actualIndex]));
                                          setShowMultipleActivityDialog(true);
                                        }}
                                      >
                                        <FileText className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Crea nuova attività</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRecord(record);
                                    setShowRecordDetail(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteImportedContact(record.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-muted-foreground">
                    Pagina {currentPage + 1} di {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                    >
                      Precedente
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                      disabled={currentPage >= totalPages - 1}
                    >
                      Successiva
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Detail Dialog */}
      <Dialog open={showRecordDetail} onOpenChange={setShowRecordDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dettaglio Record</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <MobileRecordDetailLayout 
              record={selectedRecord} 
              formatCellValue={formatCellValue} 
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Multiple Activity Dialog */}
      <Dialog open={showMultipleActivityDialog} onOpenChange={setShowMultipleActivityDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Crea Attività</DialogTitle>
            <DialogDescription>
              Crea una nuova attività per i contatti selezionati
            </DialogDescription>
          </DialogHeader>
          
          {showMultipleActivityDialog && (
            <AdvancedMultipleActivityForm
              contacts={Array.from(selectedRecords).map(index => {
                const record = allRecords[index];
                return {
                  id: record.id,
                  company_name: record.company_name,
                  company_alias: record.company_alias,
                  name: record.name,
                  alias: record.alias,
                  email: record.email,
                  phone: record.phone,
                  cell: record.cell,
                  address: record.address,
                  city: record.city,
                  country: record.country,
                  zip_code: record.zip_code,
                  origin: record.origin
                };
              })}
              onSubmit={handleCreateMultipleActivities}
              onCancel={() => setShowMultipleActivityDialog(false)}
              isSubmitting={creatingMultipleActivities}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
