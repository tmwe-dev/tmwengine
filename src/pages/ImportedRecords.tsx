import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  ChevronLeft, ChevronRight, X, Search, FilterX, Phone, 
  FileText, Paperclip, Activity, StickyNote, Briefcase, 
  Settings, Monitor, RefreshCw, Loader2, ArrowLeft, Sparkles,
  Pickaxe, Mail, MapPin
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCellValue, getCountryFlag, applySortingToRecords } from '@/lib/utils/import-utils';
import { ActivityIndicators } from '@/components/ui/activity-indicators';
import { useCompanyActivities } from '@/hooks/useCompanyActivities';
import { useUserActivities } from '@/hooks/useUserActivities';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AdvancedMultipleActivityForm } from '@/components/attivita/AdvancedMultipleActivityForm';
import { RecordDetailLayout } from '@/components/record-detail/RecordDetailLayout';
import { cn } from '@/lib/utils';
import countriesData from '@/data/countries.json';

interface ImportedContact {
  id: string;
  company_name?: string;
  company_alias?: string;
  name?: string;
  alias?: string;
  email?: string;
  phone?: string;
  cell?: string;
  country?: string;
  origin?: string;
  notes?: string;
  [key: string]: any;
}

interface ImportLog {
  id: string;
  file_name: string;
  righe_totali: number;
  righe_importate: number;
  contatti_selezionati: number;
  nome_tabella_temporanea: string | null;
}

export default function ImportedRecords() {
  const { importLogId } = useParams<{ importLogId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [importLog, setImportLog] = useState<ImportLog | null>(null);
  const [allRecords, setAllRecords] = useState<ImportedContact[]>([]);
  const [viewingRecords, setViewingRecords] = useState<ImportedContact[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ImportedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [recordsPerPage] = useState(50);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stati per filtri
  const [sortConfig, setSortConfig] = useState<{
    primary: { column: string; direction: 'asc' | 'desc' } | null;
    secondary: { column: string; direction: 'asc' | 'desc' } | null;
  }>({
    primary: null,
    secondary: null
  });
  
  // Stati per visualizzazione
  const [visibleColumns, setVisibleColumns] = useState({
    company: true,
    details: false, 
    metadata: false
  });
  
  // Stati per record detail e attività
  const [showRecordDetail, setShowRecordDetail] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ImportedContact | null>(null);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);
  const [showMultipleActivityDialog, setShowMultipleActivityDialog] = useState(false);
  const [creatingMultipleActivities, setCreatingMultipleActivities] = useState(false);
  
  const { getCompanyActivities, hasActivities, refreshActivities, getActivityCount } = useCompanyActivities();
  const { hasUserActivitiesForContact } = useUserActivities();

  // Carica i dettagli dell'import log
  useEffect(() => {
    if (importLogId) {
      loadImportLog();
      loadRecords();
    }
  }, [importLogId]);

  const loadImportLog = async () => {
    try {
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .eq('id', importLogId)
        .single();

      if (error) throw error;
      setImportLog(data);
    } catch (error: any) {
      console.error('Errore caricamento import log:', error);
      toast.error('Errore nel caricamento dei dettagli');
      navigate('/import-templates');
    }
  };

  const loadRecords = async () => {
    if (!importLogId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('imported_contacts')
        .select('*')
        .eq('import_log_id', importLogId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAllRecords(data || []);
      
      // CRITICO: NON resettare selectedRecords qui
      // Manteniamo le selezioni esistenti
      
    } catch (error: any) {
      console.error('Errore caricamento record:', error);
      toast.error('Errore nel caricamento dei record');
    } finally {
      setLoading(false);
    }
  };

  // Applica filtri client-side  
  useEffect(() => {
    let filtered = [...allRecords];
    
    // Applica ricerca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        Object.values(r).some(v => 
          v && v.toString().toLowerCase().includes(query)
        )
      );
    }
    
    setFilteredRecords(filtered);
  }, [allRecords, searchQuery]);

  // Applica sorting e paginazione ai record filtrati
  useEffect(() => {
    let sorted = [...filteredRecords];
    
    if (sortConfig.primary || sortConfig.secondary) {
      sorted = applySortingToRecords(sorted, sortConfig);
    }
    
    const startIndex = currentPage * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    setViewingRecords(sorted.slice(startIndex, endIndex));
  }, [filteredRecords, currentPage, recordsPerPage, sortConfig]);

  const handleSort = (column: string) => {
    setSortConfig(prev => {
      if (!prev.primary || prev.primary.column !== column) {
        return {
          primary: { column, direction: 'asc' },
          secondary: prev.primary
        };
      }
      
      if (prev.primary.direction === 'asc') {
        return {
          primary: { column, direction: 'desc' },
          secondary: prev.secondary
        };
      }
      
      return {
        primary: prev.secondary,
        secondary: null
      };
    });
  };

  const hasActiveFilters = () => {
    return searchQuery.length > 0;
  };
  
  const resetFilters = () => {
    setSearchQuery('');
  };
  
  const toggleRecordSelection = (recordId: string) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };
  
  const clearSelection = () => {
    setSelectedRecords(new Set());
  };

  const handleCreateMultipleActivities = async (activityData: any) => {
    setCreatingMultipleActivities(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Utente non autenticato');

      const contactsToCreate = Array.from(selectedRecords)
        .map(recordId => allRecords.find(r => r.id === recordId))
        .filter(record => record !== undefined);

      for (const contact of contactsToCreate) {
        const activityPayload = {
          ...activityData,
          company_id: contact.id,
          user_id: userData.user.id,
          created_at: new Date().toISOString()
        };

        if (activityData.save_to_rubrica) {
          const rubricaData = {
            company_name: contact.company_name,
            company_alias: contact.company_alias,
            name: contact.name,
            alias: contact.alias,
            email: contact.email,
            phone: contact.phone,
            cell: contact.cell,
            country: contact.country,
            origin: contact.origin,
            notes: contact.notes,
            user_id: userData.user.id
          };

          const { data: rubricaRecord, error: rubricaError } = await supabase
            .from('rubrica')
            .insert([rubricaData])
            .select()
            .single();

          if (rubricaError) throw rubricaError;
          activityPayload.company_id = rubricaRecord.id;
        }

        const { error: activityError } = await supabase
          .from('attivita')
          .insert([activityPayload]);

        if (activityError) throw activityError;
      }

      toast.success(`${contactsToCreate.length} attività create con successo`);
      setShowMultipleActivityDialog(false);
      clearSelection();
      refreshActivities();
    } catch (error: any) {
      console.error('Errore creazione attività:', error);
      toast.error('Errore nella creazione delle attività');
    } finally {
      setCreatingMultipleActivities(false);
    }
  };

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/import-templates')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Record Importati</h1>
            {importLog && (
              <p className="text-sm text-muted-foreground">
                {importLog.file_name} - {filteredRecords.length} record
              </p>
            )}
          </div>
        </div>
        
        {selectedRecords.size > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedRecords.size} selezionati
            </Badge>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowMultipleActivityDialog(true)}
              disabled={selectedRecords.size === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Crea Attività
            </Button>
          </div>
        )}
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Cerca..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
        />
        {hasActiveFilters() && (
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <FilterX className="h-4 w-4 mr-2" />
            Reset Filtri
          </Button>
        )}
      </div>

      {/* Lista Record */}
      <div className="space-y-2">
        {viewingRecords.map((contact, index) => (
          <Card key={contact.id} className={cn(
            "border transition-all duration-200 hover:shadow-sm relative w-[95%] mx-auto",
            "bg-gradient-to-l from-purple-500/10 via-purple-500/5 via-35% to-transparent border-purple-500/20",
            "hover:from-purple-500/10 hover:via-purple-500/5 hover:via-35% hover:to-transparent hover:border-purple-500/30",
            selectedRecords.has(contact.id) && "ring-1 ring-purple-500 border-purple-500/40 from-purple-500/20 via-purple-500/10 via-35% to-transparent"
          )}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedRecords.has(contact.id)}
                  onCheckedChange={(checked) => toggleRecordSelection(contact.id)}
                />
                <div className="flex-1 cursor-pointer" onClick={() => {
                  setSelectedRecord(contact);
                  setSelectedRecordIndex(index);
                  setShowRecordDetail(true);
                }}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{contact.company_name || contact.name || 'N/A'}</div>
                      {contact.email && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </div>
                      )}
                      {contact.phone && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </div>
                      )}
                    </div>
                    {contact.country && (
                      <Badge variant="outline" className="text-xs">
                        {getCountryFlag(contact.country)} {contact.country}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {currentPage + 1} di {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Dialog Attività Multiple */}
      <Dialog open={showMultipleActivityDialog} onOpenChange={setShowMultipleActivityDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crea Attività Multiple</DialogTitle>
            <DialogDescription>
              Crea una nuova attività per {selectedRecords.size} contatti selezionati
            </DialogDescription>
          </DialogHeader>
          
          <AdvancedMultipleActivityForm
            contacts={Array.from(selectedRecords)
              .map(recordId => allRecords.find(r => r.id === recordId))
              .filter(record => record !== undefined)
              .map(record => ({
                id: record.id,
                company_name: record.company_name,
                company_alias: record.company_alias,
                name: record.name,
                alias: record.alias,
                email: record.email,
                phone: record.phone,
                cell: record.cell,
                ...record
              }))
            }
            onSubmit={handleCreateMultipleActivities}
            onCancel={() => setShowMultipleActivityDialog(false)}
            isSubmitting={creatingMultipleActivities}
            showSaveToRubrica={true}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog Dettaglio Record */}
      {showRecordDetail && selectedRecord && (
        <Dialog open={showRecordDetail} onOpenChange={setShowRecordDetail}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
            <RecordDetailLayout
              record={selectedRecord}
              formatCellValue={formatCellValue}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
