import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Plus, Trash2, Eye, Edit, Mail, Users, Database, Clock, X, ChevronLeft, ChevronRight, Building, ChevronUp, ChevronDown, Search, Filter, Phone } from 'lucide-react';
import { ImportProgressMonitor } from '@/components/import/ImportProgressMonitor';
import countriesData from '@/data/countries.json';

// Utility function to format empty values
const formatCellValue = (value: any, fieldKey?: string): string => {
  if (value === null || value === undefined || value === '' || value === false || value === '-') {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'Sì' : '';
  }
  
  // Format dates based on field type
  if (fieldKey && (typeof value === 'string' || value instanceof Date)) {
    const fieldLower = fieldKey.toLowerCase();
    
    // For scheduled_contact and next_contact_date: only day and month
    if (fieldLower.includes('scheduled_contact') || fieldLower.includes('next_contact_date')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
        }
      } catch (e) {
        // If date parsing fails, fall back to original value
      }
    }
    
    // For created_at and updated_at: time + short date
    if (fieldLower.includes('created_at') || fieldLower.includes('updated_at')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
          const shortDate = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
          return `${time} - ${shortDate}`;
        }
      } catch (e) {
        // If date parsing fails, fall back to original value
      }
    }
  }
  
  return String(value);
};

// Function to get country flag emoji
const getCountryFlag = (countryName: string): string => {
  if (!countryName) return '';
  
  const countryFlags: { [key: string]: string } = {
    // Italy
    'italy': '🇮🇹', 'italia': '🇮🇹', 'it': '🇮🇹', 'ita': '🇮🇹',
    // France
    'france': '🇫🇷', 'francia': '🇫🇷', 'fr': '🇫🇷', 'fra': '🇫🇷',
    // Germany
    'germany': '🇩🇪', 'germania': '🇩🇪', 'de': '🇩🇪', 'deu': '🇩🇪', 'deutsch': '🇩🇪',
    // Spain
    'spain': '🇪🇸', 'spagna': '🇪🇸', 'es': '🇪🇸', 'esp': '🇪🇸', 'españa': '🇪🇸',
    // UK
    'united kingdom': '🇬🇧', 'uk': '🇬🇧', 'regno unito': '🇬🇧', 'gb': '🇬🇧', 'gbr': '🇬🇧',
    'england': '🇬🇧', 'inghilterra': '🇬🇧', 'great britain': '🇬🇧',
    // USA
    'united states': '🇺🇸', 'usa': '🇺🇸', 'stati uniti': '🇺🇸', 'us': '🇺🇸',
    'united states of america': '🇺🇸', 'america': '🇺🇸',
    // China
    'china': '🇨🇳', 'cina': '🇨🇳', 'cn': '🇨🇳', 'chn': '🇨🇳', 'people\'s republic of china': '🇨🇳',
    // Japan
    'japan': '🇯🇵', 'giappone': '🇯🇵', 'jp': '🇯🇵', 'jpn': '🇯🇵',
    // Netherlands
    'netherlands': '🇳🇱', 'olanda': '🇳🇱', 'paesi bassi': '🇳🇱', 'nl': '🇳🇱', 'nld': '🇳🇱', 'holland': '🇳🇱',
    // Belgium
    'belgium': '🇧🇪', 'belgio': '🇧🇪', 'be': '🇧🇪', 'bel': '🇧🇪',
    // Switzerland
    'switzerland': '🇨🇭', 'svizzera': '🇨🇭', 'ch': '🇨🇭', 'che': '🇨🇭',
    // Austria
    'austria': '🇦🇹', 'at': '🇦🇹', 'aut': '🇦🇹',
    // Poland
    'poland': '🇵🇱', 'polonia': '🇵🇱', 'pl': '🇵🇱', 'pol': '🇵🇱',
    // Portugal
    'portugal': '🇵🇹', 'portogallo': '🇵🇹', 'pt': '🇵🇹', 'prt': '🇵🇹',
    // Greece
    'greece': '🇬🇷', 'grecia': '🇬🇷', 'gr': '🇬🇷', 'grc': '🇬🇷',
    // Turkey
    'turkey': '🇹🇷', 'turchia': '🇹🇷', 'tr': '🇹🇷', 'tur': '🇹🇷',
    // Russia
    'russia': '🇷🇺', 'russian federation': '🇷🇺', 'ru': '🇷🇺', 'rus': '🇷🇺',
    // Canada
    'canada': '🇨🇦', 'ca': '🇨🇦', 'can': '🇨🇦',
    // Australia
    'australia': '🇦🇺', 'au': '🇦🇺', 'aus': '🇦🇺',
    // Brazil
    'brazil': '🇧🇷', 'brasile': '🇧🇷', 'br': '🇧🇷', 'bra': '🇧🇷', 'brasil': '🇧🇷',
    // India
    'india': '🇮🇳', 'in': '🇮🇳', 'ind': '🇮🇳',
    // South Korea
    'south korea': '🇰🇷', 'corea del sud': '🇰🇷', 'kr': '🇰🇷', 'kor': '🇰🇷', 'korea': '🇰🇷',
    // Mexico
    'mexico': '🇲🇽', 'messico': '🇲🇽', 'mx': '🇲🇽', 'mex': '🇲🇽',
    // Argentina
    'argentina': '🇦🇷', 'ar': '🇦🇷', 'arg': '🇦🇷',
    // Nordic countries
    'sweden': '🇸🇪', 'svezia': '🇸🇪', 'se': '🇸🇪', 'swe': '🇸🇪',
    'norway': '🇳🇴', 'norvegia': '🇳🇴', 'no': '🇳🇴', 'nor': '🇳🇴',
    'denmark': '🇩🇰', 'danimarca': '🇩🇰', 'dk': '🇩🇰', 'dnk': '🇩🇰',
    'finland': '🇫🇮', 'finlandia': '🇫🇮', 'fi': '🇫🇮', 'fin': '🇫🇮',
    'iceland': '🇮🇸', 'islanda': '🇮🇸', 'is': '🇮🇸', 'isl': '🇮🇸',
    // Ireland
    'ireland': '🇮🇪', 'irlanda': '🇮🇪', 'ie': '🇮🇪', 'irl': '🇮🇪',
    // Eastern Europe
    'czech republic': '🇨🇿', 'repubblica ceca': '🇨🇿', 'cz': '🇨🇿', 'cze': '🇨🇿', 'czechia': '🇨🇿',
    'hungary': '🇭🇺', 'ungheria': '🇭🇺', 'hu': '🇭🇺', 'hun': '🇭🇺',
    'romania': '🇷🇴', 'ro': '🇷🇴', 'rou': '🇷🇴',
    'slovenia': '🇸🇮', 'si': '🇸🇮', 'svn': '🇸🇮',
    'croatia': '🇭🇷', 'croazia': '🇭🇷', 'hr': '🇭🇷', 'hrv': '🇭🇷',
    'slovakia': '🇸🇰', 'slovacchia': '🇸🇰', 'sk': '🇸🇰', 'svk': '🇸🇰',
    'lithuania': '🇱🇹', 'lituania': '🇱🇹', 'lt': '🇱🇹', 'ltu': '🇱🇹',
    'latvia': '🇱🇻', 'lettonia': '🇱🇻', 'lv': '🇱🇻', 'lva': '🇱🇻',
    'estonia': '🇪🇪', 'ee': '🇪🇪', 'est': '🇪🇪',
    // Middle East
    'israel': '🇮🇱', 'il': '🇮🇱', 'isr': '🇮🇱',
    'united arab emirates': '🇦🇪', 'ae': '🇦🇪', 'are': '🇦🇪', 'uae': '🇦🇪',
    'saudi arabia': '🇸🇦', 'sa': '🇸🇦', 'sau': '🇸🇦',
    // Africa
    'south africa': '🇿🇦', 'za': '🇿🇦', 'zaf': '🇿🇦',
    'egypt': '🇪🇬', 'egitto': '🇪🇬', 'eg': '🇪🇬', 'egy': '🇪🇬',
    // Asia
    'singapore': '🇸🇬', 'sg': '🇸🇬', 'sgp': '🇸🇬',
    'thailand': '🇹🇭', 'th': '🇹🇭', 'tha': '🇹🇭',
    'vietnam': '🇻🇳', 'vn': '🇻🇳', 'vnm': '🇻🇳',
    'malaysia': '🇲🇾', 'my': '🇲🇾', 'mys': '🇲🇾',
    'indonesia': '🇮🇩', 'id': '🇮🇩', 'idn': '🇮🇩',
    'philippines': '🇵🇭', 'ph': '🇵🇭', 'phl': '🇵🇭',
    // Others
    'new zealand': '🇳🇿', 'nz': '🇳🇿', 'nzl': '🇳🇿',
    'chile': '🇨🇱', 'cile': '🇨🇱', 'cl': '🇨🇱', 'chl': '🇨🇱',
    'colombia': '🇨🇴', 'co': '🇨🇴', 'col': '🇨🇴',
    'peru': '🇵🇪', 'perù': '🇵🇪', 'pe': '🇵🇪', 'per': '🇵🇪',
    'uruguay': '🇺🇾', 'uy': '🇺🇾', 'ury': '🇺🇾',
    'venezuela': '🇻🇪', 've': '🇻🇪', 'ven': '🇻🇪'
  };
  
  // Normalize input: lowercase, trim, remove extra spaces
  const normalizedCountry = countryName.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Try exact match first
  if (countryFlags[normalizedCountry]) {
    return countryFlags[normalizedCountry];
  }
  
  // Try partial matches
  for (const [key, flag] of Object.entries(countryFlags)) {
    if (normalizedCountry.includes(key) || key.includes(normalizedCountry)) {
      return flag;
    }
  }
  
  // If no match found, show the globe
  return '🌍';
};
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RecordDetailLayout } from '@/components/record-detail/RecordDetailLayout';

interface EmailTemplate {
  id: string;
  nome: string;
  oggetto: string;
  contenuto: string;
  placeholder_disponibili: any;
  attivo: boolean;
  created_at: string;
}

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

interface FilterTag {
  field: string;
  value: any;
  displayValue: string;
}

export default function ImportTemplates() {
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [viewingRecords, setViewingRecords] = useState<ImportedContact[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ImportedContact[]>([]);
  const [selectedImport, setSelectedImport] = useState<ImportLog | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [showRecordsDialog, setShowRecordsDialog] = useState(false);
  const [currentRecordIndex, setCurrentRecordIndex] = useState(0);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [importingSelected, setImportingSelected] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreRecords, setHasMoreRecords] = useState(false);
  const [loadingMoreRecords, setLoadingMoreRecords] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterTag[]>([]);
  
  // New search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [recordsPerPage, setRecordsPerPage] = useState(50);
  const [allRecords, setAllRecords] = useState<ImportedContact[]>([]);
  const [loadingAllRecords, setLoadingAllRecords] = useState(false);
  
  // Stato per l'ordinamento delle colonne
  const [sortConfig, setSortConfig] = useState<{
    primary: { column: string; direction: 'asc' | 'desc' } | null;
    secondary: { column: string; direction: 'asc' | 'desc' } | null;
  }>({
    primary: null,
    secondary: null
  });
  
  // Stato per il monitoraggio dell'importazione
  const [monitoringImportId, setMonitoringImportId] = useState<string | null>(null);
  // Stato per controllare la visibilità delle colonne
  const [visibleColumns, setVisibleColumns] = useState({
    company: true,
    details: false, 
    metadata: false
  });
  
  // Stato per la visualizzazione del record singolo
  const [showRecordDetail, setShowRecordDetail] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ImportedContact | null>(null);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);
  
  // Stato per progress dell'importazione
  const [importProgress, setImportProgress] = useState<{
    currentImportId: string | null;
    totalRows: number;
    processedRows: number;
    isProcessing: boolean;
    startTime: number;
  }>({
    currentImportId: null,
    totalRows: 0,
    processedRows: 0,
    isProcessing: false,
    startTime: 0
  });
  
  // Form per nuovo template email
  const [newTemplate, setNewTemplate] = useState({
    nome: '',
    oggetto: '',
    contenuto: 'Gentile {{responsabile}},\n\nScrivo a nome di {{nome_azienda}} per...\n\nCordiali saluti',
  });

  // Form per modifica template
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    loadEmailTemplates();
    loadImportLogs();
  }, []);

  // Apply search and filters to records
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
          record.citta
        ];
        
        return searchFields.some(field => 
          field && String(field).toLowerCase().includes(query)
        );
      });
    }
    
    // Apply origin filter
    if (originFilter && originFilter !== '__all__') {
      result = result.filter(record => record.origin === originFilter);
    }
    
    // Apply country filter  
    if (countryFilter && countryFilter !== '__all__') {
      result = result.filter(record => record.country === countryFilter);
    }
    
    // Apply legacy filters
    result = applyFilters(result, activeFilters);
    
    // Apply sorting
    result = applySorting(result, sortConfig);
    
    setFilteredRecords(result);
    
    // Calculate current page items
    const startIndex = currentPage * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    setViewingRecords(result.slice(startIndex, endIndex));
  }, [allRecords, searchQuery, originFilter, countryFilter, recordsPerPage, activeFilters, sortConfig, currentPage]);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, originFilter, countryFilter, activeFilters, recordsPerPage]);

  const loadEmailTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmailTemplates(data || []);
    } catch (error) {
      console.error('Errore nel caricamento templates email:', error);
      toast.error('Errore nel caricamento dei templates email');
    }
  };

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

  const createEmailTemplate = async () => {
    try {
      if (!newTemplate.nome || !newTemplate.oggetto || !newTemplate.contenuto) {
        toast.error('Compila tutti i campi obbligatori');
        return;
      }

      const { error } = await supabase
        .from('email_templates')
        .insert({
          nome: newTemplate.nome,
          oggetto: newTemplate.oggetto,
          contenuto: newTemplate.contenuto
        });

      if (error) throw error;

      toast.success('Template email creato con successo');
      setNewTemplate({
        nome: '',
        oggetto: '',
        contenuto: 'Gentile {{responsabile}},\n\nScrivo a nome di {{nome_azienda}} per...\n\nCordiali saluti',
      });
      loadEmailTemplates();
    } catch (error) {
      console.error('Errore nella creazione template email:', error);
      toast.error('Errore nella creazione del template email');
    }
  };

  const updateEmailTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          nome: editingTemplate.nome,
          oggetto: editingTemplate.oggetto,
          contenuto: editingTemplate.contenuto,
          attivo: editingTemplate.attivo
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      toast.success('Template aggiornato con successo');
      setEditingTemplate(null);
      loadEmailTemplates();
    } catch (error) {
      console.error('Errore nell\'aggiornamento template:', error);
      toast.error('Errore nell\'aggiornamento del template');
    }
  };

  const deleteEmailTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Template eliminato');
      loadEmailTemplates();
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error);
      toast.error('Errore nell\'eliminazione del template');
    }
  };

  const handleFileUpload = async () => {
    if (!importFile) {
      toast.error('Seleziona un file da importare');
      return;
    }

    setUploadingFile(true);

    try {
      // Upload file to storage
      const fileName = `${Date.now()}_${importFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('import-files')
        .upload(fileName, importFile);

      if (uploadError) throw uploadError;

      // Phase 1: Save file to database
      const { data: saveResult, error: saveError } = await supabase.functions
        .invoke('process-import-file', {
          body: {
            filePath: fileName,
            fileName: importFile.name
          }
        });

      if (saveError) throw saveError;

      if (saveResult.success) {
        const { importLogId, totalRows, separator } = saveResult.data;
        
        toast.success(`File salvato: ${totalRows} righe rilevate. Avvio elaborazione...`);
        
        // Phase 2: Process the saved file
        setImportProgress({
          currentImportId: importLogId,
          totalRows,
          processedRows: 0,
          isProcessing: true,
          startTime: Date.now()
        });

        // Start processing the saved file
        const { data: processResult, error: processError } = await supabase.functions
          .invoke('process-saved-file', {
            body: {
              importLogId
            }
          });

        if (processError) {
          console.error('Processing error:', processError);
          // Don't throw here, let the polling handle the status
        }

        if (processResult?.success) {
          const { importedRows, errorRows } = processResult.data;
          
          setImportProgress({
            currentImportId: importLogId,
            totalRows,
            processedRows: importedRows,
            isProcessing: false,
            startTime: 0
          });
          
          if (errorRows > 0) {
            toast.success(`Elaborazione completata con alcuni errori: ${importedRows}/${totalRows} righe elaborate.`);
          } else {
            toast.success(`Elaborazione completata: ${importedRows} righe elaborate.`);
          }
        }
      } else {
        throw new Error(saveResult.error);
      }

      setImportFile(null);
      loadImportLogs();
    } catch (error: any) {
      console.error('Errore nel caricamento file:', error);
      toast.error(`Errore nel caricamento del file: ${error.message}`);
      setImportProgress({
        currentImportId: null,
        totalRows: 0,
        processedRows: 0,
        isProcessing: false,
        startTime: 0
      });
    } finally {
      setUploadingFile(false);
    }
  };

  // Polling per il progresso dell'importazione
  useEffect(() => {
    if (!importProgress.currentImportId || !importProgress.isProcessing) return;

    const checkProgress = async () => {
      try {
        const { data, error } = await supabase
          .from('import_logs')
          .select('righe_totali, righe_importate, stato')
          .eq('id', importProgress.currentImportId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setImportProgress(prev => ({
            ...prev,
            totalRows: data.righe_totali || 0,
            processedRows: data.righe_importate || 0,
            isProcessing: data.stato === 'elaborazione'
          }));

          // Se completato, ferma il polling e ricarica i log
          if (data.stato !== 'elaborazione') {
            setImportProgress(prev => ({ ...prev, isProcessing: false }));
            loadImportLogs();
          }
        }
      } catch (error) {
        console.error('Errore nel controllo progresso:', error);
      }
    };

    const interval = setInterval(checkProgress, 1000);
    return () => clearInterval(interval);
  }, [importProgress.currentImportId, importProgress.isProcessing]);

  // Function to manually process a saved file
  const processFile = async (importLogId: string) => {
    try {
      // Attiva il monitor dell'importazione
      setMonitoringImportId(importLogId);
      
      setImportProgress({
        currentImportId: importLogId,
        totalRows: 0,
        processedRows: 0,
        isProcessing: true,
        startTime: Date.now()
      });

      const { data: processResult, error: processError } = await supabase.functions
        .invoke('process-saved-file', {
          body: {
            importLogId
          }
        });

      if (processError) throw processError;

      if (processResult.success) {
        const { totalRows, importedRows, errorRows } = processResult.data;
        
        setImportProgress({
          currentImportId: importLogId,
          totalRows,
          processedRows: importedRows,
          isProcessing: false,
          startTime: 0
        });
        
        if (errorRows > 0) {
          toast.success(`Elaborazione completata con alcuni errori: ${importedRows}/${totalRows} righe elaborate.`);
        } else {
          toast.success(`Elaborazione completata: ${importedRows} righe elaborate.`);
        }
        
        loadImportLogs();
      } else {
        throw new Error(processResult.error);
      }
    } catch (error: any) {
      console.error('Errore nell\'elaborazione:', error);
      toast.error(`Errore nell'elaborazione: ${error.message}`);
      setImportProgress({
        currentImportId: null,
        totalRows: 0,
        processedRows: 0,
        isProcessing: false,
        startTime: 0
      });
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById('contenuto-template') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + `{{${placeholder}}}` + text.substring(end);
      
      if (editingTemplate) {
        setEditingTemplate({...editingTemplate, contenuto: newText});
      } else {
        setNewTemplate({...newTemplate, contenuto: newText});
      }
    }
  };

  // Funzioni per gestire i filtri
  const applyFilters = (records: ImportedContact[], filters: FilterTag[]) => {
    if (filters.length === 0) return records;
    
    return records.filter(record => {
      return filters.every(filter => {
        const recordValue = record[filter.field];
        return recordValue === filter.value;
      });
    });
  };

  const addFilter = (field: string, value: any) => {
    const formattedValue = formatCellValue(value, field);
    const displayValue = formattedValue || '(vuoto)';
    
    // Non aggiungere lo stesso filtro se già esiste
    const existingFilter = activeFilters.find(f => f.field === field && f.value === value);
    if (existingFilter) return;
    
    const newFilter: FilterTag = { field, value, displayValue };
    const newFilters = [...activeFilters, newFilter];
    setActiveFilters(newFilters);
    
    // Applica i filtri e l'ordinamento ai record correnti
    let result = applyFilters(viewingRecords, newFilters);
    result = applySorting(result, sortConfig);
    setFilteredRecords(result);
  };

  // Funzioni per gestire l'ordinamento gerarchico/raggruppato
  const applySorting = (records: ImportedContact[], sorting: typeof sortConfig) => {
    if (!sorting.primary) return records;
    
    // Se c'è solo ordinamento primario, ordina normalmente
    if (!sorting.secondary) {
      return [...records].sort((a, b) => 
        compareValues(a[sorting.primary!.column], b[sorting.primary!.column], sorting.primary!.direction)
      );
    }
    
    // Ordinamento gerarchico: raggruppa per colonna primaria, ordina gruppi, poi ordina all'interno
    const groups = new Map<string, ImportedContact[]>();
    
    // Raggruppa i record per il valore della colonna primaria
    records.forEach(record => {
      const primaryValue = String(record[sorting.primary!.column] || '').toLowerCase();
      if (!groups.has(primaryValue)) {
        groups.set(primaryValue, []);
      }
      groups.get(primaryValue)!.push(record);
    });
    
    // Ordina le chiavi dei gruppi (ordinamento primario)
    const sortedGroupKeys = Array.from(groups.keys()).sort((a, b) => {
      return compareValues(a, b, sorting.primary!.direction);
    });
    
    // Per ogni gruppo, ordina i record interni per la colonna secondaria
    const result: ImportedContact[] = [];
    sortedGroupKeys.forEach(groupKey => {
      const groupRecords = groups.get(groupKey)!;
      const sortedGroupRecords = groupRecords.sort((a, b) => 
        compareValues(a[sorting.secondary!.column], b[sorting.secondary!.column], sorting.secondary!.direction)
      );
      result.push(...sortedGroupRecords);
    });
    
    return result;
  };
  
  // Function to delete a single imported contact
  const deleteImportedContact = async (contactId: string, index: number) => {
    try {
      const { error } = await supabase
        .from('imported_contacts')
        .delete()
        .eq('id', contactId);
        
      if (error) throw error;
      
      // Remove from local state
      const newAllRecords = allRecords.filter(record => record.id !== contactId);
      setAllRecords(newAllRecords);
      
      // Update selected records if necessary
      const newSelectedRecords = new Set<number>();
      selectedRecords.forEach(selectedIndex => {
        if (selectedIndex < index) {
          newSelectedRecords.add(selectedIndex);
        } else if (selectedIndex > index) {
          newSelectedRecords.add(selectedIndex - 1);
        }
      });
      setSelectedRecords(newSelectedRecords);
      
      toast.success('Record eliminato con successo');
    } catch (error) {
      console.error('Errore nell\'eliminazione del record:', error);
      toast.error('Errore nell\'eliminazione del record');
    }
  };
  
  // Function to delete multiple selected records
  const deleteSelectedRecords = async () => {
    if (selectedRecords.size === 0) {
      toast.error('Nessun record selezionato');
      return;
    }
    
    try {
      // Get the IDs of selected records
      const recordsToDelete = Array.from(selectedRecords).map(index => 
        viewingRecords[index]?.id
      ).filter(Boolean);
      
      if (recordsToDelete.length === 0) {
        toast.error('Nessun record valido selezionato');
        return;
      }
      
      const { error } = await supabase
        .from('imported_contacts')
        .delete()
        .in('id', recordsToDelete);
        
      if (error) throw error;
      
      // Remove from local state
      const newAllRecords = allRecords.filter(record => 
        !recordsToDelete.includes(record.id)
      );
      setAllRecords(newAllRecords);
      
      // Clear selected records
      setSelectedRecords(new Set());
      
      toast.success(`${recordsToDelete.length} record eliminati con successo`);
    } catch (error) {
      console.error('Errore nell\'eliminazione dei record:', error);
      toast.error('Errore nell\'eliminazione dei record');
    }
  };

  const compareValues = (a: any, b: any, direction: 'asc' | 'desc'): number => {
    // Gestione valori null/undefined
    if (a == null && b == null) return 0;
    if (a == null) return direction === 'asc' ? -1 : 1;
    if (b == null) return direction === 'asc' ? 1 : -1;
    
    // Conversione a stringa per confronto uniforme
    const aStr = String(a).toLowerCase();
    const bStr = String(b).toLowerCase();
    
    // Confronto numerico se entrambi sono numeri
    const aNum = Number(a);
    const bNum = Number(b);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return direction === 'asc' ? aNum - bNum : bNum - aNum;
    }
    
    // Confronto date se sono date valide
    const aDate = new Date(a);
    const bDate = new Date(b);
    if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
      return direction === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
    }
    
    // Confronto stringhe
    const result = aStr.localeCompare(bStr);
    return direction === 'asc' ? result : -result;
  };

  const handleColumnSort = (column: string) => {
    setSortConfig(prev => {
      // Se clicco sulla colonna primaria corrente, cambia direzione
      if (prev.primary?.column === column) {
        return {
          ...prev,
          primary: {
            column,
            direction: prev.primary.direction === 'asc' ? 'desc' : 'asc'
          }
        };
      }
      
      // Se clicco sulla colonna secondaria corrente, la promuove a primaria
      if (prev.secondary?.column === column) {
        return {
          primary: { column, direction: 'asc' },
          secondary: prev.primary
        };
      }
      
      // Nuova colonna: diventa primaria, la vecchia primaria diventa secondaria
      return {
        primary: { column, direction: 'asc' },
        secondary: prev.primary
      };
    });
  };

  const getSortIcon = (column: string) => {
    const { primary, secondary } = sortConfig;
    
    if (primary?.column === column) {
      return primary.direction === 'asc' ? 
        <ChevronUp className="h-4 w-4 text-primary" /> : 
        <ChevronDown className="h-4 w-4 text-primary" />;
    }
    
    if (secondary?.column === column) {
      return secondary.direction === 'asc' ? 
        <ChevronUp className="h-4 w-4 text-muted-foreground" /> : 
        <ChevronDown className="h-4 w-4 text-muted-foreground" />;
    }
    
    return null;
  };

  // Funzione per aprire il dettaglio del record (non applica filtri)
  const openRecordDetail = (record: ImportedContact, index: number) => {
    setSelectedRecord(record);
    setSelectedRecordIndex(index);
    setShowRecordDetail(true);
  };

  // Navigazione nel dettaglio record
  const navigateRecord = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, selectedRecordIndex - 1)
      : Math.min(filteredRecords.length - 1, selectedRecordIndex + 1);
    
    setSelectedRecordIndex(newIndex);
    setSelectedRecord(filteredRecords[newIndex]);
  };

  const removeFilter = (filterToRemove: FilterTag) => {
    const newFilters = activeFilters.filter(f => 
      !(f.field === filterToRemove.field && f.value === filterToRemove.value)
    );
    setActiveFilters(newFilters);
    
    // Riapplica i filtri e l'ordinamento rimanenti
    let result = applyFilters(viewingRecords, newFilters);
    result = applySorting(result, sortConfig);
    setFilteredRecords(result);
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    let result = applyFilters(viewingRecords, []);
    result = applySorting(result, sortConfig);
    setFilteredRecords(result);
  };
  
  // Define DEFAULT always visible columns (priority for contact selection)
  const getDefaultColumns = () => [
    'company_name', 'company_alias', 'alias',
    'name', 'title', 'origin', 'city', 'country', 'position',
    'email',
    'phone', 'cell', // one of these will be shown based on availability
    'stato', 'agent_id',
    'last_contact', 'next_contact_date'
  ];

  // Define column groups for toggle visibility
  const getColumnGroups = (columns: string[]) => {
    const defaultCols = getDefaultColumns();
    
    return {
      company: ['address', 'zip_code'], // Additional company & contact fields
      details: columns.filter(col => [
        'client_code', 'source', 'tag', 'note', 'priority', 'budget', 'lead_score',
        'completed', 'archiviata', 'has_actions', 'created_by', 'scheduled_contact'
      ].includes(col)),
      metadata: columns.filter(col => 
        col.startsWith('meta_') || 
        col.includes('created_at') || 
        col.includes('updated_at') || 
        col.includes('row_number') ||
        col.includes('original_id') ||
        col.includes('commercial_anagrafiche_id') ||
        (!defaultCols.includes(col) && 
         !['address', 'zip_code', 'client_code', 'source', 'tag', 'note', 'priority', 
           'budget', 'lead_score', 'completed', 'archiviata', 'has_actions', 'created_by', 
           'scheduled_contact', 'id', 'import_log_id', 'is_imported_to_rubrica'].includes(col))
      )
    };
  };
  
  // Get visible columns: DEFAULT + toggle states
  const getVisibleColumns = (allColumns: string[]) => {
    const defaultCols = getDefaultColumns().filter(col => allColumns.includes(col));
    const groups = getColumnGroups(allColumns);
    let additionalCols: string[] = [];
    
    if (visibleColumns.company) additionalCols = [...additionalCols, ...groups.company];
    if (visibleColumns.details) additionalCols = [...additionalCols, ...groups.details];
    if (visibleColumns.metadata) additionalCols = [...additionalCols, ...groups.metadata];
    
    // Combine DEFAULT + additional columns, ensure phone OR cell (prefer phone)
    const finalCols = [...defaultCols];
    if (finalCols.includes('phone') && finalCols.includes('cell') && allColumns.includes('phone')) {
      const cellIndex = finalCols.indexOf('cell');
      if (cellIndex > -1) finalCols.splice(cellIndex, 1);
    }
    
    return [...new Set([...finalCols, ...additionalCols])].filter(col => allColumns.includes(col));
  };

  const getStatusBadge = (stato: string) => {
    switch (stato) {
      case 'completato':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completato</Badge>;
      case 'errore':
        return <Badge variant="destructive">Errore</Badge>;
      case 'in_corso':
      case 'elaborazione':
        return <Badge variant="outline">In elaborazione</Badge>;
      case 'file_salvato':
      case 'pronto_per_elaborazione':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Pronto per elaborazione</Badge>;
      case 'completato_con_errori':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Completato con errori</Badge>;
      default:
        return <Badge variant="outline">{stato}</Badge>;
    }
  };

  // Funzioni per gestire la selezione dei record
  const toggleRecordSelection = (index: number) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRecords(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRecords.size === filteredRecords.length) {
      // Se tutti sono selezionati, deseleziona tutti
      setSelectedRecords(new Set());
    } else {
      // Altrimenti seleziona tutti i record filtrati
      const allIndexes = new Set(filteredRecords.map((_, index) => index));
      setSelectedRecords(allIndexes);
    }
  };

  const loadAllRecords = async (importLog: ImportLog) => {
    setLoadingAllRecords(true);
    setSelectedImport(importLog);

    try {
      console.log('Caricamento tutti i record da imported_contacts per import_log_id:', importLog.id);
      
      // Prima ottieni il count totale
      const { count } = await supabase
        .from('imported_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('import_log_id', importLog.id);
      
      console.log('Totale record nel database:', count);
      
      // Se ci sono molti record, carica in batch
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
        
        // Break se non ci sono più dati
        if (!batchData || batchData.length < batchSize) {
          break;
        }
      }
      
      console.log('Record effettivamente caricati:', allRecords.length, 'di', count);
      
      setAllRecords(allRecords);
      setTotalRecords(count || 0);
      setShowRecordsDialog(true);
      
      // Reset filters and pagination
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

  // Mapping sigle paese a nomi completi usando i dati JSON
  const getCountryFullName = (countryCode: string): string => {
    if (!countryCode) return '';
    
    const country = countriesData.find(c => 
      c.code.toLowerCase() === countryCode.toLowerCase()
    );
    
    return country ? country.name : countryCode;
  };

  // Get unique values for filter dropdowns
  const getUniqueValues = (field: string) => {
    const values = [...new Set(allRecords.map(record => record[field]))]
      .filter(value => value && String(value).trim() !== '')
      .sort();
    return values;
  };

  const viewImportRecords = (importLog: ImportLog) => {
    loadAllRecords(importLog);
  };

  const deleteImportFile = async (importLog: ImportLog) => {
    const confirmDelete = confirm(`Sei sicuro di voler eliminare il file "${importLog.file_name}" e tutti i suoi dati importati? Questa azione non può essere annullata.`);
    
    if (!confirmDelete) return;

    try {
      // First delete all imported contacts for this import
      const { error: contactsError } = await supabase
        .from('imported_contacts')
        .delete()
        .eq('import_log_id', importLog.id);

      if (contactsError) {
        throw new Error(`Errore nell'eliminazione dei contatti: ${contactsError.message}`);
      }

      // Delete the file from storage if it exists
      if (importLog.file_path) {
        await supabase.storage
          .from('import-files')
          .remove([importLog.file_path]);
      }

      // Finally delete the import log
      const { error: logError } = await supabase
        .from('import_logs')
        .delete()
        .eq('id', importLog.id);

      if (logError) {
        throw new Error(`Errore nell'eliminazione del log: ${logError.message}`);
      }

      toast.success('File e dati eliminati con successo');
      
      // Refresh the import logs
      await loadImportLogs();
      
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error);
      toast.error('Errore durante l\'eliminazione del file');
    }
  };


  const importSelectedRecords = async () => {
    if (!selectedRecords.size || importingSelected) return;

    setImportingSelected(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const selectedData = viewingRecords.filter((_, index) => selectedRecords.has(index));
      
      for (const record of selectedData) {
        try {
          // Map record fields to rubrica structure
          const rubricaData = {
            nome: record.name || '',
            alias: record.alias || '',
            azienda: record.company_alias || record.company_name || '',
            position: record.position || '',
            title: record.title || '',
            telefono: record.phone || '',
            cellulare: record.cell || '',
            email: record.email || '',
            paese: record.country || '',
            indirizzo: record.address || '',
            citta: record.city || '',
            zip_code: record.zip_code || '',
            note: record.note || '',
            origine: record.origin || '',
            client_code: record.client_code || '',
            responsabile: record.created_by || '',
            stato: record.stato || 'A',
            // Meta flags
            meta_client: record.meta_client || false,
            meta_express: record.meta_express || false,
            meta_sea_freight: record.meta_sea_freight || false,
            meta_air_freight: record.meta_air_freight || false,
            meta_interested: record.meta_interested || false,
            meta_reception_required_email: record.meta_reception_required_email || false,
            meta_contact_required_email: record.meta_contact_required_email || false,
            meta_presentation: record.meta_presentation || false,
            meta_exworks: record.meta_exworks || false,
            meta_hight_value_customer: record.meta_hight_value_customer || false,
            meta_tutorial: record.meta_tutorial || false,
            meta_rejected: record.meta_rejected || false,
            meta_wca: record.meta_wca || false,
            meta_exclient: record.meta_exclient || false,
            completed: record.completed || false,
            archiviata: record.archiviata || false,
            has_actions: record.has_actions || false,
            // Date fields
            last_contact: record.last_contact || null,
            scheduled_contact: record.scheduled_contact || null,
            next_contact_date: record.next_contact_date || null
          };

          const { error } = await supabase
            .from('rubrica')
            .insert(rubricaData);

          if (error) {
            console.error('Errore inserimento record:', error);
            errorCount++;
          } else {
            successCount++;
            // Delete the record from imported_contacts table
            await supabase
              .from('imported_contacts')
              .delete()
              .eq('id', record.id);
          }
        } catch (error) {
          console.error('Errore elaborazione record:', error);
          errorCount++;
        }
      }

      // Update import log
      if (selectedImport) {
        await supabase
          .from('import_logs')
          .update({
            trasferiti_rubrica: true,
            contatti_selezionati: selectedRecords.size
          })
          .eq('id', selectedImport.id);
      }

      toast.success(`Importati ${successCount} contatti${errorCount > 0 ? `. ${errorCount} errori.` : ''}`);
      
      // Refresh import logs
      await loadImportLogs();
      
      // Close dialog
      setShowRecordsDialog(false);
      setSelectedImport(null);
      setViewingRecords([]);
      setSelectedRecords(new Set());
      
    } catch (error) {
      console.error('Errore importazione:', error);
      toast.error('Errore durante l\'importazione');
    } finally {
      setImportingSelected(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestione Email e Import</h1>
          <p className="text-muted-foreground">
            Gestisci templates email e importa contatti da file Excel/CSV
          </p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Templates Email
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importa Contatti
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Gestisci Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {editingTemplate ? 'Modifica Template' : 'Nuovo Template Email'}
                </CardTitle>
                <CardDescription>
                  Crea modelli di email con placeholder dinamici
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome-template">Nome Template</Label>
                  <Input
                    id="nome-template"
                    value={editingTemplate ? editingTemplate.nome : newTemplate.nome}
                    onChange={(e) => {
                      if (editingTemplate) {
                        setEditingTemplate({...editingTemplate, nome: e.target.value});
                      } else {
                        setNewTemplate({...newTemplate, nome: e.target.value});
                      }
                    }}
                    placeholder="Es: Template Presentazione Servizi"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oggetto-template">Oggetto Email</Label>
                  <Input
                    id="oggetto-template"
                    value={editingTemplate ? editingTemplate.oggetto : newTemplate.oggetto}
                    onChange={(e) => {
                      if (editingTemplate) {
                        setEditingTemplate({...editingTemplate, oggetto: e.target.value});
                      } else {
                        setNewTemplate({...newTemplate, oggetto: e.target.value});
                      }
                    }}
                    placeholder="Es: Proposta di collaborazione per {{nome_azienda}}"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contenuto-template">Contenuto Email</Label>
                  <Textarea
                    id="contenuto-template"
                    value={editingTemplate ? editingTemplate.contenuto : newTemplate.contenuto}
                    onChange={(e) => {
                      if (editingTemplate) {
                        setEditingTemplate({...editingTemplate, contenuto: e.target.value});
                      } else {
                        setNewTemplate({...newTemplate, contenuto: e.target.value});
                      }
                    }}
                    rows={8}
                    placeholder="Scrivi il contenuto del template usando {{placeholder}} per i campi dinamici"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Placeholder Disponibili</Label>
                  <div className="flex flex-wrap gap-2">
                    {['responsabile', 'nome_azienda', 'email', 'telefono', 'indirizzo'].map((placeholder) => (
                      <Button
                        key={placeholder}
                        variant="outline"
                        size="sm"
                        onClick={() => insertPlaceholder(placeholder)}
                      >
                        {`{{${placeholder}}}`}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={editingTemplate ? updateEmailTemplate : createEmailTemplate} 
                    className="flex-1"
                  >
                    {editingTemplate ? 'Aggiorna Template' : 'Crea Template'}
                  </Button>
                  {editingTemplate && (
                    <Button 
                      variant="outline" 
                      onClick={() => setEditingTemplate(null)}
                    >
                      Annulla
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Templates Email Esistenti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emailTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-600" />
                          <h4 className="font-medium">{template.nome}</h4>
                          {!template.attivo && (
                            <Badge variant="outline">Inattivo</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.oggetto}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{template.nome}</DialogTitle>
                              <DialogDescription>
                                Anteprima del template email
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3">
                              <div>
                                <strong>Oggetto:</strong> {template.oggetto}
                              </div>
                              <div>
                                <strong>Contenuto:</strong>
                                <pre className="mt-1 p-3 bg-muted rounded text-sm whitespace-pre-wrap">
                                  {template.contenuto}
                                </pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTemplate(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEmailTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importa File Contatti
              </CardTitle>
              <CardDescription>
                Carica un file Excel o CSV con i tuoi contatti. Il file verrà elaborato e salvato in una tabella temporanea per la revisione.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">File da Importare (.xlsx, .xls, .csv)</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </div>

              {/* Progress Indicator */}
              {importProgress.isProcessing && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Clock className="h-4 w-4 animate-spin" />
                        <span className="font-medium">Importazione in corso...</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progresso</span>
                          <span>{importProgress.processedRows} / {importProgress.totalRows}</span>
                        </div>
                        <Progress 
                          value={importProgress.totalRows > 0 ? (importProgress.processedRows / importProgress.totalRows) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                      
                      {importProgress.startTime > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Tempo trascorso: {Math.floor((Date.now() - importProgress.startTime) / 1000)}s
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handleFileUpload}
                disabled={!importFile || uploadingFile || importProgress.isProcessing}
                className="w-full"
              >
                {uploadingFile || importProgress.isProcessing ? 'Elaborazione in corso...' : 'Importa File'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Gestisci Import
              </CardTitle>
              <CardDescription>
                Visualizza e gestisci i file importati. Seleziona i contatti da trasferire nella rubrica principale.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Righe</TableHead>
                    <TableHead>Errori</TableHead>
                    <TableHead>Selezionati</TableHead>
                    <TableHead>Azioni</TableHead>
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
                      <TableCell>{log.righe_totali}</TableCell>
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
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => deleteImportFile(log)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            
                            {log.trasferiti_rubrica && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Trasferiti
                              </Badge>
                            )}
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
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
                loadImportLogs(); // Ricarica la lista
                setMonitoringImportId(null); // Nascondi il monitor
              }}
            />
          )}
        </TabsContent>
      </Tabs>

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
          setActiveFilters([]);
          setSearchQuery('');
          setOriginFilter('');
          setCountryFilter('');
        }
      }}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] h-[90vh] flex flex-col mx-auto my-auto overflow-hidden">
          <DialogHeader>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <DialogTitle>
                  Record Importati - {selectedImport?.file_name}
                </DialogTitle>
                <DialogDescription>
                  Visualizza e gestisci <span className="text-lg font-semibold text-blue-600">{filteredRecords.length}</span> di <span className="text-lg font-semibold text-blue-600">{totalRecords}</span> contatti importati da questo file.
                </DialogDescription>
              </div>
              
              {/* Search and Filter Controls - Top Right */}
              <div className="flex gap-4 items-end">
                {/* Search field */}
                <div className="w-64">
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
                
                {/* Origin filter */}
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
                
                {/* Country filter */}
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
                
                {/* Records per page */}
                <div className="w-36">
                  <Label htmlFor="records-per-page" className="text-sm font-medium">Record/pagina</Label>
                  <Select value={String(recordsPerPage)} onValueChange={(value) => {
                    console.log('Changing records per page to:', value);
                    setRecordsPerPage(Number(value));
                  }}>
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
          </DialogHeader>

          {/* Clear filters section */}
          {(searchQuery || originFilter || countryFilter) && (
            <div className="p-4 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setOriginFilter('');
                    setCountryFilter('');
                  }}
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Pulisci filtri
                </Button>
                <span className="text-xs text-muted-foreground">
                  {filteredRecords.length} record trovati
                </span>
              </div>
            </div>
          )}

          {/* Controlli visibilità colonne */}
          <div className="flex justify-center items-center gap-2 py-4 border-b">
            <span className="text-sm font-medium mr-4">Visualizza colonne:</span>
            <Button
              size="sm"
              variant={visibleColumns.company ? "default" : "outline"}
              onClick={() => setVisibleColumns(prev => ({ ...prev, company: !prev.company }))}
              className="text-xs"
            >
              Azienda & Contatti
            </Button>
            <Button
              size="sm"
              variant={visibleColumns.details ? "default" : "outline"}
              onClick={() => setVisibleColumns(prev => ({ ...prev, details: !prev.details }))}
              className="text-xs"
            >
              Dettagli Commerciali
            </Button>
            <Button
              size="sm"
              variant={visibleColumns.metadata ? "default" : "outline"}
              onClick={() => setVisibleColumns(prev => ({ ...prev, metadata: !prev.metadata }))}
              className="text-xs"
            >
              Metadata & Sistema
            </Button>
            
            {/* Bulk delete button */}
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

          
          {/* Area filtri attivi */}
          {activeFilters.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium">Filtri attivi:</span>
                {activeFilters.map((filter, index) => (
                  <Badge 
                    key={`${filter.field}-${filter.value}-${index}`}
                    variant="outline" 
                    className="text-blue-600 border-blue-200 bg-transparent hover:bg-blue-50/20 cursor-pointer flex items-center gap-1"
                    onClick={() => removeFilter(filter)}
                  >
                    <span className="capitalize">
                      {filter.field.replace(/_/g, ' ')}: {filter.displayValue}
                    </span>
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Rimuovi tutti
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {filteredRecords.length} record corrispondenti
              </div>
            </div>
          )}
          
          {loadingAllRecords ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p>Caricamento record...</p>
              </div>
            </div>
           ) : filteredRecords.length > 0 ? (
            <div className="space-y-4 flex flex-col min-h-0 flex-1">
              <div className="overflow-auto flex-1 border rounded-md">
                 <Table>
                   <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                     <TableRow>
                        <TableHead className="w-12 bg-background border-b px-4 py-[10px]">
                          <Checkbox
                            checked={selectedRecords.size === filteredRecords.length && filteredRecords.length > 0}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Seleziona tutti"
                           />
                         </TableHead>
                        <TableHead className="w-16 text-center bg-background border-b px-4 py-[10px]">#</TableHead>
                        {(() => {
                          const allColumns = Object.keys(filteredRecords[0] || {}).filter(key => key !== 'id' && key !== 'import_log_id');
                          const visibleCols = getVisibleColumns(allColumns);
                          return visibleCols.map((key) => (
                              <TableHead 
                                key={key} 
                                 className={`bg-background border-b cursor-pointer hover:bg-accent/50 px-4 py-[10px] ${
                                   key === 'country' ? 'w-20 min-w-[80px] max-w-[80px]' : 
                                   key === 'title' ? 'w-20 min-w-[80px] max-w-[80px]' : 
                                   key === 'stato' ? 'w-20 min-w-[80px] max-w-[80px] text-center' :
                                   key === 'agent_id' ? 'w-22 min-w-[84px] max-w-[84px]' :
                                   (key === 'email' || key === 'phone' || key === 'cell') ? 'w-20 min-w-[80px] max-w-[80px] text-center' :
                                   'min-w-[120px]'
                                 }`}
                               onClick={() => handleColumnSort(key)}
                             >
                               <div className="flex items-center gap-1">
                                 <span>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                 {getSortIcon(key)}
                               </div>
                             </TableHead>
                           ));
                         })()}
                         <TableHead className="w-16 bg-background border-b px-4 py-[10px] text-center">Azioni</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                      {viewingRecords.map((record, viewIndex) => {
                        const actualIndex = currentPage * recordsPerPage + viewIndex;
                        return (
                        <TableRow key={viewIndex}>
                            <TableCell className="w-12 px-4 py-[10px]">
                              <Checkbox
                               checked={selectedRecords.has(actualIndex)}
                               onCheckedChange={() => toggleRecordSelection(actualIndex)}
                               aria-label={`Seleziona record ${actualIndex + 1}`}
                              />
                            </TableCell>
                            <TableCell className="w-16 text-center text-muted-foreground px-4 py-[10px]">
                              {actualIndex + 1}
                            </TableCell>
                          {(() => {
                            const allColumns = Object.keys(record).filter(key => key !== 'id' && key !== 'import_log_id');
                            const visibleCols = getVisibleColumns(allColumns);
                            return visibleCols.map((key) => (
                                <TableCell 
                                  key={key} 
                                  className={`truncate transition-colors px-4 py-[10px] ${
                                    key === 'country' || key === 'title' ? 'w-20 max-w-[80px]' : 
                                    key === 'stato' ? 'w-20 max-w-[80px] text-center' :
                                    key === 'agent_id' ? 'w-22 max-w-[84px]' :
                                    (key === 'email' || key === 'phone' || key === 'cell') ? 'w-20 max-w-[80px] text-center' :
                                    'max-w-[200px]'
                                  } ${
                                    key === 'name' 
                                      ? 'cursor-pointer hover:bg-primary/10 text-primary font-medium' 
                                      : 'cursor-pointer hover:bg-accent/50'
                                  }`}
                                 onClick={() => {
                                   if (key === 'name') {
                                     openRecordDetail(record, actualIndex);
                                   } else {
                                     addFilter(key, record[key]);
                                   }
                                 }}
                                  title={key === 'name' ? 'Clicca per aprire dettaglio record' : 'Clicca per filtrare per questo valore'}
                                >
                                   {key === 'country' ? (
                                     <div className="flex items-center gap-1">
                                       <span className="text-base">{getCountryFlag(record[key])}</span>
                                       <span>{formatCellValue(record[key], key)}</span>
                                     </div>
                                   ) : key === 'email' && record[key] ? (
                                     <TooltipProvider>
                                       <Tooltip>
                                         <TooltipTrigger asChild>
                                           <div className="flex items-center justify-center cursor-pointer">
                                             <Mail className="h-4 w-4 text-blue-500" />
                                           </div>
                                         </TooltipTrigger>
                                         <TooltipContent>
                                           <p>{formatCellValue(record[key], key)}</p>
                                         </TooltipContent>
                                       </Tooltip>
                                     </TooltipProvider>
                                   ) : (key === 'phone' || key === 'cell') && record[key] ? (
                                     <TooltipProvider>
                                       <Tooltip>
                                         <TooltipTrigger asChild>
                                           <div className="flex items-center justify-center cursor-pointer">
                                             <Phone className="h-4 w-4 text-blue-500" />
                                           </div>
                                         </TooltipTrigger>
                                         <TooltipContent>
                                           <p>{formatCellValue(record[key], key)}</p>
                                         </TooltipContent>
                                       </Tooltip>
                                     </TooltipProvider>
                                   ) : (
                                     formatCellValue(record[key], key)
                                   )}
                                </TableCell>
                             ));
                           })()}
                           <TableCell className="w-16 px-4 py-[10px] text-center">
                             <TooltipProvider>
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                   <button
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       deleteImportedContact(record.id, actualIndex);
                                     }}
                                     className="flex items-center justify-center cursor-pointer hover:bg-red-100 rounded-full p-1 transition-colors"
                                   >
                                     <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
                                   </button>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                   <p>Elimina record</p>
                                 </TooltipContent>
                               </Tooltip>
                             </TooltipProvider>
                           </TableCell>
                         </TableRow>
                        );
                      })}
                   </TableBody>
                 </Table>
               </div>
               
               <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
                <div className="text-sm text-muted-foreground">
                  Caricati: {viewingRecords.length} di {totalRecords} record totali
                  {activeFilters.length > 0 && (
                    <span className="ml-2 text-blue-600">
                      • {filteredRecords.length} filtrati
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => {
                     setShowRecordsDialog(false);
                     setSelectedImport(null);
                     setViewingRecords([]);
                     setFilteredRecords([]);
                     setCurrentPage(0);
                     setSelectedRecords(new Set());
                     setActiveFilters([]);
                   }}>
                     Chiudi
                   </Button>
                   <Button 
                     disabled={selectedRecords.size === 0 || importingSelected}
                     onClick={importSelectedRecords}
                   >
                     {importingSelected ? 'Trasferimento...' : `Trasferisci Selezionati (${selectedRecords.size})`}
                   </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nessun record trovato in questa importazione.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog per dettaglio record singolo */}
      <Dialog open={showRecordDetail} onOpenChange={setShowRecordDetail}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] h-[90vh] flex flex-col mx-auto my-auto overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center">
              <span></span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateRecord('prev')}
                  disabled={selectedRecordIndex <= 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Precedente
                </Button>
                
                <span className="text-sm text-muted-foreground px-3">
                  {selectedRecordIndex + 1} di {filteredRecords.length}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateRecord('next')}
                  disabled={selectedRecordIndex >= filteredRecords.length - 1}
                >
                  Successivo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
            </DialogDescription>
          </DialogHeader>

           {selectedRecord && (
            <div className="overflow-auto flex-1 pr-2">
              <RecordDetailLayout 
                record={selectedRecord} 
                formatCellValue={formatCellValue} 
              />
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  );
}