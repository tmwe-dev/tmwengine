import React, { useState, useEffect } from 'react';
import { AnimatedBook } from '@/components/ui/animated-book';
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
import { Upload, FileSpreadsheet, Plus, Trash2, Eye, Edit, Mail, Users, Database, Clock, X, ChevronLeft, ChevronRight, Building, ChevronUp, ChevronDown, Search, Filter, FilterX, Phone, FileText, CheckSquare, Paperclip, Activity, StickyNote, Briefcase, Settings, Monitor, RefreshCw, ListChecks, Pickaxe, Download, Lock, Unlock, User, Sparkles, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import { ImportProgressMonitor } from '@/components/import/ImportProgressMonitor';
import { ImportLogMobileCard } from '@/components/import/ImportLogMobileCard';
import { CompactContactCard } from '@/components/import/CompactContactCard';
import { ActivityIndicators } from '@/components/ui/activity-indicators';
import { useCompanyActivities } from '@/hooks/useCompanyActivities';
import { useUserActivities } from '@/hooks/useUserActivities';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { PagePromptManager } from '@/components/ai/PagePromptManager';
import { AliasPreviewDialog } from '@/components/import/AliasPreviewDialog';
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
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RecordDetailLayout } from '@/components/record-detail/RecordDetailLayout';
import { AdvancedMultipleActivityForm } from '@/components/attivita/AdvancedMultipleActivityForm';
import { DocumentViewer } from '@/components/email/DocumentViewer';
import { ImportedContactMobileCard } from '@/components/import/ImportedContactMobileCard';
import { AttivitaDialog } from '@/components/attivita/AttivitaDialog';
import { AIColumnMapper } from '@/components/import/AIColumnMapper';

interface EmailTemplate {
  id: string;
  nome: string;
  oggetto: string;
  contenuto: string;
  placeholder_disponibili: any;
  attivo: boolean;
  created_at: string;
}

interface EmailAttachment {
  id: string;
  nome: string;
  file_path: string;
  file_size: number;
  mime_type: string;
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
  const navigate = useNavigate();
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>([]);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [lockedFiles, setLockedFiles] = useState<Set<string>>(new Set());
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
  const [hasNotesFilter, setHasNotesFilter] = useState(false);
  const [myContactsWithActivitiesFilter, setMyContactsWithActivitiesFilter] = useState(false);
  const [hideContactsWithTodayActivities, setHideContactsWithTodayActivities] = useState(true);
  const [filterOnlyWithAlias, setFilterOnlyWithAlias] = useState(false);
  const [recordsPerPage, setRecordsPerPage] = useState(50);
  const [showFiltersArea, setShowFiltersArea] = useState(true);
  const [allRecords, setAllRecords] = useState<ImportedContact[]>([]);
  const [loadingAllRecords, setLoadingAllRecords] = useState(false);
  
  // Switch per attivare/disattivare importazione AI
  const [useAIImport, setUseAIImport] = useState(false);
  
  // Prompt per AI
  const [aiPrompt, setAiPrompt] = useState('Analizza i dati importati e normalizzali nella tabella temporanea. Correggi eventuali errori di formato, standardizza i nomi dei campi e verifica la coerenza dei dati.');
  
  // Stato per elaborazione AI
  const [processingAI, setProcessingAI] = useState(false);
  const [generatingAliases, setGeneratingAliases] = useState(false);
  const [showAliasPreview, setShowAliasPreview] = useState(false);
  const [aliasPreviewData, setAliasPreviewData] = useState<any[]>([]);
  const [aliasPreviewTotal, setAliasPreviewTotal] = useState(0);
  
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
  
  // Stati per attachments
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<EmailAttachment | null>(null);
  
  // Stati per attività multiple
  const [showMultipleActivityDialog, setShowMultipleActivityDialog] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [creatingMultipleActivities, setCreatingMultipleActivities] = useState(false);
  const [activeSection, setActiveSection] = useState('manage');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoadingDialog, setIsLoadingDialog] = useState(false);
  const { getCompanyActivities, hasActivities, refreshActivities, getActivityCount } = useCompanyActivities();
  const { hasUserActivitiesForContact } = useUserActivities();
  const isMobile = useIsMobile();
  const location = useLocation();
  
  // Stati per il dialog delle attività
  const [isAttivitaDialogOpen, setIsAttivitaDialogOpen] = useState(false);
  const [selectedContactIdForActivities, setSelectedContactIdForActivities] = useState<string | null>(null);
  const [defaultActivityType, setDefaultActivityType] = useState<'chiamata' | 'email' | undefined>(undefined);
  const [selectedContactForActivity, setSelectedContactForActivity] = useState<any>(null);

  useEffect(() => {
    loadEmailTemplates();
    loadEmailAttachments();
    loadImportLogs();
  }, []);
  
  // Effetto per aprire automaticamente il dialog dei record quando si naviga dalla pagina Attività
  useEffect(() => {
    if (location.state?.openRecordsDialog) {
      setIsLoadingDialog(true);
      // Aspetta che i dati siano caricati
      if (importLogs.length > 0) {
        const recentImport = importLogs[0];
        if (recentImport) {
          setSelectedImport(recentImport);
          setShowRecordsDialog(true);
          loadAllRecords(recentImport).then(() => {
            setIsLoadingDialog(false);
          });
          // Pulisci lo stato per evitare di riaprire il dialog
          navigate(location.pathname, { replace: true, state: {} });
        }
      }
    }
  }, [location.state, importLogs]);

  // Apply search and filters to records
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
    
    // Apply notes filter
    if (hasNotesFilter) {
      result = result.filter(record => record.note && record.note.trim() !== '');
    }
    
    // Apply my contacts with activities filter
    if (myContactsWithActivitiesFilter) {
      result = result.filter(record => hasUserActivitiesForContact(record.id));
    }
    
    // Apply hide today activities filter
    if (hideContactsWithTodayActivities) {
      result = result.filter(record => !hasCompletedActivityToday(record.id));
    }
    
    // Apply filter for companies with alias
    if (filterOnlyWithAlias) {
      result = result.filter(record => record.company_alias && record.company_alias.trim() !== '');
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
  }, [allRecords, searchQuery, originFilter, countryFilter, hasNotesFilter, myContactsWithActivitiesFilter, hideContactsWithTodayActivities, filterOnlyWithAlias, recordsPerPage, activeFilters, sortConfig, currentPage]);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, originFilter, countryFilter, hasNotesFilter, myContactsWithActivitiesFilter, hideContactsWithTodayActivities, filterOnlyWithAlias, activeFilters, recordsPerPage]);

  // Funzione per gestire la creazione di attività multiple
  const handleCreateMultipleActivities = async (activityData: any) => {
    setCreatingMultipleActivities(true);
    
    try {
      const selectedCompanies = Array.from(selectedRecords).map(index => {
        const record = allRecords[index];
        return {
          id: record.id,
          name: record.company_name || record.name || 'Azienda non specificata',
          source: 'import',
          record: record
        };
      });

      // Se l'utente ha scelto di salvare in rubrica, trasferisci prima i contatti
      if (activityData.salva_in_rubrica) {
        try {
          const contactsToTransfer = selectedCompanies.map(company => ({
            nome: company.record.name || '',
            azienda: company.record.company_name || '',
            company_alias: company.record.company_alias || '',
            email: company.record.email || '',
            telefono: company.record.phone || '',
            cellulare: company.record.cell || '',
            indirizzo: company.record.address || '',
            citta: company.record.city || '',
            paese: company.record.country || '',
            zip_code: company.record.zip_code || '',
            origine: 'import_multiple_activities'
          }));

          // TODO: Fix types issue with rubrica table
          // const { error: rubricaError } = await supabase
          //   .from('rubrica')
          //   .insert(contactsToTransfer);
          const rubricaError = null; // Temporary - will be fixed when types are updated

          if (rubricaError) {
            console.error('Error transferring to rubrica:', rubricaError);
            toast.error('Errore durante il trasferimento in rubrica');
            return;
          }

          // Aggiorna lo stato dei record come trasferiti
          const recordIds = selectedCompanies.map(c => c.id);
          // TODO: Fix types issue with imported_contacts table
          // const { error: updateError } = await supabase
          //   .from('imported_contacts')
          //   .update({ is_imported_to_rubrica: true })
          //   .in('id', recordIds);
          const updateError = null; // Temporary - will be fixed when types are updated

          if (updateError) {
            console.error('Error updating import status:', updateError);
          }

          toast.success(`${contactsToTransfer.length} contatti trasferiti in rubrica`);
        } catch (error) {
          console.error('Error during rubrica transfer:', error);
          toast.error('Errore durante il trasferimento in rubrica');
          return;
        }
      }

      // Crea le attività per ogni azienda selezionata
      const activities = [];
      
      console.log('🔍 DEBUG - selectedCompanies:', selectedCompanies);
      console.log('🔍 DEBUG - activityData:', activityData);
      
      for (const company of selectedCompanies) {
        console.log('🔍 DEBUG - Processing company:', company);
        // ATTIVITÀ IMMEDIATA (quello che ho fatto ora)
        let descrizione = '';
        let emailSendResult = null;
        
        if (activityData.tipo === 'email' && activityData.oggetto_email && activityData.testo_email) {
          // Se è email, invia tramite TMWE
          if (company.record.email) {
            try {
              console.log(`📧 Invio email a ${company.record.email}...`);
              const { data: sendResult, error: sendError } = await supabase.functions.invoke('tmwe-email-send', {
                body: {
                  to: company.record.email,
                  subject: activityData.oggetto_email,
                  body_text: activityData.testo_email,
                  body_html: activityData.testo_email.replace(/\n/g, '<br>')
                }
              });
              
              if (sendError) {
                console.error('❌ Errore invio email:', sendError);
                descrizione = `❌ Email NON INVIATA - Errore: ${sendError.message}\n\nOggetto: ${activityData.oggetto_email}\nDestinatario: ${company.record.email}\nAzienda: ${company.record.company_name || ''}\nContatto: ${company.record.name || ''}\n\nTesto:\n${activityData.testo_email}`;
              } else if (sendResult?.success) {
                console.log('✅ Email inviata con successo:', sendResult.message_id);
                emailSendResult = 'success';
                descrizione = `✅ Email INVIATA\n\nOggetto: ${activityData.oggetto_email}\nDestinatario: ${company.record.email}\nAzienda: ${company.record.company_name || ''}\nContatto: ${company.record.name || ''}\nMessage ID: ${sendResult.message_id || 'N/A'}\n\nTesto inviato:\n${activityData.testo_email}`;
              } else {
                console.error('❌ Errore invio email - risposta:', sendResult);
                descrizione = `❌ Email NON INVIATA\n\nOggetto: ${activityData.oggetto_email}\nDestinatario: ${company.record.email}\nAzienda: ${company.record.company_name || ''}\nContatto: ${company.record.name || ''}\n\nTesto:\n${activityData.testo_email}`;
              }
            } catch (error) {
              console.error('❌ Errore durante invio email:', error);
              descrizione = `❌ Email NON INVIATA - Errore tecnico\n\nOggetto: ${activityData.oggetto_email}\nDestinatario: ${company.record.email}\nAzienda: ${company.record.company_name || ''}\nContatto: ${company.record.name || ''}\n\nTesto:\n${activityData.testo_email}`;
            }
          } else {
            // Nessuna email disponibile
            descrizione = `❌ Email NON INVIATA - Email mancante\n\nOggetto: ${activityData.oggetto_email}\nAzienda: ${company.record.company_name || ''}\nContatto: ${company.record.name || ''}\n\nTesto:\n${activityData.testo_email}`;
          }
        } else if (activityData.tipo === 'chiamata' && activityData.note_generali) {
          descrizione = `Chiamata effettuata\n\nContatto: ${company.record.name || 'Non specificato'}\nTelefono: ${company.record.phone || company.record.cell || 'Non disponibile'}\nAzienda: ${company.record.company_name || ''}\n\nNote:\n${activityData.note_generali}`;
        }

        // Attività immediata - stato 'completata' solo se email inviata con successo
        activities.push({
          rubrica_id: company.id,
          tipo: activityData.tipo,
          descrizione: descrizione,
          stato: (activityData.tipo === 'email' && emailSendResult === 'success') ? 'completata' : 'aperta',
          scadenza: null,
          priorita: activityData.priorita || 'media',
          assegnato_a: activityData.assegnato_a || null,
          creato_da: activityData.creato_da || null
        });

        // ATTIVITÀ FUTURA (se programmata)
        if (activityData.tipo === 'chiamata' && 
            activityData.programma_chiamata && 
            activityData.data_chiamata_futura) {
          
          let scadenzaFutura = activityData.data_chiamata_futura;
          if (activityData.ora_chiamata_futura) {
            scadenzaFutura += 'T' + activityData.ora_chiamata_futura;
          } else {
            scadenzaFutura += 'T09:00'; // Ora predefinita
          }

          const descrizioneFutura = `Chiamata programmata\n\nContatto: ${company.record.name || 'Non specificato'}\nTelefono: ${company.record.phone || company.record.cell || 'Non disponibile'}\nAzienda: ${company.record.company_name || ''}\n\nDa chiamare per: follow-up`;

          activities.push({
            rubrica_id: company.id,
            tipo: 'chiamata',
            descrizione: descrizioneFutura,
            stato: 'aperta', // Attività da fare
            scadenza: new Date(scadenzaFutura).toISOString(),
            priorita: activityData.priorita || 'media',
            assegnato_a: activityData.assegnato_a || null,
            creato_da: activityData.creato_da || null
          });
        }

        // ATTIVITÀ EMAIL FUTURA (se programmata)
        if (activityData.tipo === 'email' && 
            activityData.programma_email && 
            activityData.data_email_futura) {
          
          let scadenzaEmailFutura = activityData.data_email_futura;
          if (activityData.ora_email_futura) {
            scadenzaEmailFutura += 'T' + activityData.ora_email_futura;
          } else {
            scadenzaEmailFutura += 'T09:00'; // Ora predefinita
          }

          let descrizioneEmailFutura = `Email programmata\n\nDestinatario: ${company.record.email || 'Email non disponibile'}\nAzienda: ${company.record.company_name || ''}\nContatto: ${company.record.name || ''}\n\n`;
          
          // Se è stato selezionato un template, aggiungi le info
          if (activityData.template_email_futura) {
            descrizioneEmailFutura += `Template selezionato: ${activityData.template_email_futura}\n\n`;
          }
          
          descrizioneEmailFutura += `Da inviare email di follow-up`;

          activities.push({
            rubrica_id: company.id,
            tipo: 'email',
            descrizione: descrizioneEmailFutura,
            stato: 'aperta', // Attività da fare
            scadenza: new Date(scadenzaEmailFutura).toISOString(),
            priorita: activityData.priorita || 'media',
            assegnato_a: activityData.assegnato_a || null,
            creato_da: activityData.creato_da || null
          });
        }
      }

      // Inserisci le attività nel database usando SQL diretto
      const { error } = await supabase
        .from('attivita')
        .insert(activities.map(activity => ({
          rubrica_id: activity.rubrica_id,
          tipo: activity.tipo,
          descrizione: activity.descrizione,
          stato: activity.stato || 'aperta',
          scadenza: activity.scadenza ? activity.scadenza : null,
          priorita: activity.priorita || 'media',
          assegnato_a: activity.assegnato_a || null,
          creato_da: activity.creato_da || null
        })));

      if (error) throw error;

      const activityType = activityData.tipo === 'email' ? 'Email' : 'Chiamata';
      const totalActivities = activities.length;
      const immediateCount = selectedCompanies.length;
      const futureCount = totalActivities - immediateCount;
      
      let successMessage;
      if (futureCount > 0) {
        if (activityData.tipo === 'email' && activityData.programma_email) {
          successMessage = `${immediateCount} ${activityType} completate e ${futureCount} email future programmate`;
        } else {
          successMessage = `${immediateCount} ${activityType} completate e ${futureCount} chiamate future programmate`;
        }
      } else {
        successMessage = `${immediateCount} ${activityType} completate con successo`;
      }
      
      if (activityData.salva_in_rubrica) {
        successMessage += ' e contatti trasferiti in rubrica';
      }
      
      toast.success(successMessage);
      setShowMultipleActivityDialog(false);
      setSelectedRecords(new Set());
      
      // Refresh dei record importati per aggiornare gli indicatori di attività
      if (selectedImport) {
        await loadAllRecords(selectedImport);
      }
      
      // Refresh delle attività
      refreshActivities();
    } catch (error) {
      console.error('Error creating multiple activities:', error);
      toast.error('Errore durante la creazione delle attività');
    } finally {
      setCreatingMultipleActivities(false);
    }
  };

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

  const loadEmailAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('email_attachments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmailAttachments(data || []);
    } catch (error) {
      console.error('Errore nel caricamento allegati email:', error);
      toast.error('Errore nel caricamento degli allegati email');
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

  const handleAttachmentUpload = async (file: File) => {
    setUploadingAttachment(true);
    
    try {
      // Upload file to storage
      const fileName = `attachments/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('import-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('import-files')
        .getPublicUrl(fileName);

      // Save attachment info to database
      const { error: dbError } = await supabase
        .from('email_attachments')
        .insert({
          nome: file.name,
          file_path: publicUrl,
          file_size: file.size,
          mime_type: file.type
        });

      if (dbError) throw dbError;

      toast.success('Allegato caricato con successo');
      loadEmailAttachments();
    } catch (error) {
      console.error('Errore nel caricamento allegato:', error);
      toast.error('Errore nel caricamento dell\'allegato');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const deleteAttachment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_attachments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Allegato eliminato');
      loadEmailAttachments();
    } catch (error) {
      console.error('Errore nell\'eliminazione allegato:', error);
      toast.error('Errore nell\'eliminazione dell\'allegato');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileThumbnail = (mimeType: string, fileName: string, fileUrl: string) => {
    if (mimeType.includes('image/')) {
      return (
        <div className="w-12 h-12 border rounded overflow-hidden bg-muted">
          <img
            src={fileUrl}
            alt={fileName}
            className="w-full h-full object-cover"
            loading="lazy"
            onLoad={() => console.log('Image loaded successfully:', fileName)}
            onError={(e) => {
              console.error('Image failed to load:', fileName, fileUrl);
              // Fallback to icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = '<div class="w-full h-full bg-purple-100 rounded flex items-center justify-center"><span class="text-purple-600 text-xs font-bold">IMG</span></div>';
            }}
          />
        </div>
      );
    } else if (mimeType.includes('pdf')) {
      return (
        <div className="w-12 h-12 bg-red-100 rounded flex flex-col items-center justify-center">
          <FileText className="h-6 w-6 text-red-600" />
          <span className="text-xs text-red-600 font-medium">PDF</span>
        </div>
      );
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return (
        <div className="w-12 h-12 bg-blue-100 rounded flex flex-col items-center justify-center">
          <FileText className="h-6 w-6 text-blue-600" />
          <span className="text-xs text-blue-600 font-medium">DOC</span>
        </div>
      );
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return (
        <div className="w-12 h-12 bg-green-100 rounded flex flex-col items-center justify-center">
          <FileSpreadsheet className="h-6 w-6 text-green-600" />
          <span className="text-xs text-green-600 font-medium">XLS</span>
        </div>
      );
    } else {
      return (
        <div className="w-12 h-12 bg-gray-100 rounded flex flex-col items-center justify-center">
          <FileText className="h-6 w-6 text-gray-600" />
          <span className="text-xs text-gray-600 font-medium">FILE</span>
        </div>
      );
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

      // Phase 1: Save file to database - use AI function if enabled
      const functionName = useAIImport ? 'process-import-file-ai' : 'process-import-file';
      const { data: saveResult, error: saveError } = await supabase.functions
        .invoke(functionName, {
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

        // Start processing the saved file - use AI function if enabled
        const processFunctionName = useAIImport ? 'process-saved-file-ai' : 'process-saved-file';
        const { data: processResult, error: processError } = await supabase.functions
          .invoke(processFunctionName, {
            body: {
              importLogId
            }
          });

        if (processError) {
          console.error('Processing error:', processError);
          // Don't throw here, let the polling handle the status
        }

        if (processResult?.success) {
          if (useAIImport) {
            // AI import: data is now in temp table, show success message with button
            toast.success(`File caricato: ${totalRows} righe salvate in tabella temporanea. Verifica i dati e avvia l'elaborazione AI.`, {
              action: {
                label: 'Vai a Gestisci Import',
                onClick: () => navigate('/gestisci-import')
              }
            });
          } else {
            // Standard import: data is in imported_contacts
            const { importedRows, errorRows } = processResult.data;
            
            setImportProgress({
              currentImportId: importLogId,
              totalRows,
              processedRows: importedRows,
              isProcessing: false,
              startTime: 0
            });
            
            if (errorRows > 0) {
              toast.success(`Elaborazione completata con alcuni errori: ${importedRows}/${totalRows} righe elaborate.`, {
                action: {
                  label: 'Vai a Gestisci Import',
                  onClick: () => navigate('/gestisci-import')
                }
              });
            } else {
              toast.success(`Elaborazione completata: ${importedRows} righe elaborate.`, {
                action: {
                  label: 'Vai a Gestisci Import',
                  onClick: () => navigate('/gestisci-import')
                }
              });
            }
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

      const processFunctionName = useAIImport ? 'process-saved-file-ai' : 'process-saved-file';
      const { data: processResult, error: processError } = await supabase.functions
        .invoke(processFunctionName, {
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

  
  // Funzione per esportare il template CSV completo
  const downloadCSVTemplate = () => {
    // Header del template con tutti i campi
    const headers = [
      'id',
      'commercial_anagrafiche_id',
      'name',
      'alias',
      'position',
      'title',
      'phone',
      'cell',
      'email',
      'country',
      'note',
      'company_name',
      'company_alias',
      'address',
      'city',
      'zip_code'
    ];

    // Riga di esempio con valori dimostrativi
    const exampleRow = [
      '1',
      'COMM001',
      'Mario Rossi',
      'M.Rossi',
      'CEO',
      'Dott.',
      '+39 02 1234567',
      '+39 333 1234567',
      'mario.rossi@example.com',
      'Italy',
      'Cliente strategico interessato a sea freight',
      'ACME SRL',
      'Acme',
      'Via Roma 123',
      'Milano',
      '20100'
    ];

    // Crea il contenuto CSV con BOM UTF-8 per compatibilità Excel
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(';'),
      exampleRow.join(';')
    ].join('\r\n'); // Usa \r\n per Windows/Excel

    // Crea e scarica il file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'tmwe_commercial_contact_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Template CSV scaricato con successo');
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
      return [...records].sort((a, b) => {
        // Gestione speciale per la colonna "attivita"
        if (sorting.primary!.column === 'attivita') {
          const aCount = getActivityCount(a.id);
          const bCount = getActivityCount(b.id);
          return sorting.primary!.direction === 'asc' ? aCount - bCount : bCount - aCount;
        }
        return compareValues(a[sorting.primary!.column], b[sorting.primary!.column], sorting.primary!.direction);
      });
    }
    
    // Ordinamento gerarchico: raggruppa per colonna primaria, ordina gruppi, poi ordina all'interno
    const groups = new Map<string, ImportedContact[]>();
    
    // Raggruppa i record per il valore della colonna primaria
    records.forEach(record => {
      let primaryValue: string;
      // Gestione speciale per la colonna "attivita"
      if (sorting.primary!.column === 'attivita') {
        primaryValue = String(getActivityCount(record.id));
      } else {
        primaryValue = String(record[sorting.primary!.column] || '').toLowerCase();
      }
      if (!groups.has(primaryValue)) {
        groups.set(primaryValue, []);
      }
      groups.get(primaryValue)!.push(record);
    });
    
    // Ordina le chiavi dei gruppi (ordinamento primario)
    const sortedGroupKeys = Array.from(groups.keys()).sort((a, b) => {
      // Per la colonna attivita, converti a numero
      if (sorting.primary!.column === 'attivita') {
        const aNum = Number(a);
        const bNum = Number(b);
        return sorting.primary!.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      return compareValues(a, b, sorting.primary!.direction);
    });
    
    // Per ogni gruppo, ordina i record interni per la colonna secondaria
    const result: ImportedContact[] = [];
    sortedGroupKeys.forEach(groupKey => {
      const groupRecords = groups.get(groupKey)!;
      const sortedGroupRecords = groupRecords.sort((a, b) => {
        // Gestione speciale per la colonna "attivita" come secondaria
        if (sorting.secondary!.column === 'attivita') {
          const aCount = getActivityCount(a.id);
          const bCount = getActivityCount(b.id);
          return sorting.secondary!.direction === 'asc' ? aCount - bCount : bCount - aCount;
        }
        return compareValues(a[sorting.secondary!.column], b[sorting.secondary!.column], sorting.secondary!.direction);
      });
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
      // Get the IDs of selected records using allRecords (not viewingRecords)
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
      setViewingRecords(newAllRecords);
      
      // Update total count in real-time
      setTotalRecords(newAllRecords.length);
      
      // Update import_logs with new count
      if (selectedImport) {
        await supabase
          .from('import_logs')
          .update({
            righe_importate: newAllRecords.length
          })
          .eq('id', selectedImport.id);
      }
      
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
        return <Badge variant="outline" className="text-green-800 border-green-800">Completato</Badge>;
      case 'errore':
        return <Badge variant="destructive">Errore</Badge>;
      case 'in_corso':
      case 'elaborazione':
        return <Badge variant="outline">In elaborazione</Badge>;
      case 'file_salvato':
      case 'pronto_per_elaborazione':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Pronto per elaborazione</Badge>;
      case 'completato_con_errori':
        return <Badge variant="outline" className="text-blue-800 bg-transparent border-transparent">Completato con errori</Badge>;
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
    // Controlla quanti record della pagina corrente sono già selezionati
    const currentPageIndexes = new Set<number>();
    for (let i = 0; i < viewingRecords.length; i++) {
      const actualIndex = currentPage * recordsPerPage + i;
      currentPageIndexes.add(actualIndex);
    }
    
    const currentPageSelectedCount = Array.from(currentPageIndexes).filter(index => 
      selectedRecords.has(index)
    ).length;
    
    const newSelected = new Set(selectedRecords);
    
    if (currentPageSelectedCount === viewingRecords.length) {
      // Se tutti i record della pagina corrente sono selezionati, deselezionali
      currentPageIndexes.forEach(index => newSelected.delete(index));
    } else {
      // Altrimenti seleziona tutti i record della pagina corrente (mantieni le altre selezioni)
      currentPageIndexes.forEach(index => newSelected.add(index));
    }
    
    setSelectedRecords(newSelected);
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
          .order('row_number', { ascending: true })
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
      }
      
      console.log('Record effettivamente caricati:', allRecords.length, 'di', count);
      
      setAllRecords(allRecords);
      setTotalRecords(count || 0);
      setShowRecordsDialog(true);
      
      // Reset filters and pagination
      setSearchQuery('');
      setOriginFilter('');
      setCountryFilter('');
      setHasNotesFilter(false);
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

  // Get unique values with counts
  const getUniqueValuesWithCount = (field: string) => {
    const counts: Record<string, number> = {};
    allRecords.forEach(record => {
      const value = record[field];
      if (value && String(value).trim() !== '') {
        const key = String(value);
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort(([, countA], [, countB]) => countB - countA) // Ordina per conteggio decrescente
      .map(([value, count]) => ({ value, count }));
  };

  const viewImportRecords = (importLog: ImportLog) => {
    loadAllRecords(importLog);
  };

  const deleteImportFile = async (importLog: ImportLog) => {
    // Prima conferma
    const firstConfirm = confirm(`Sei sicuro di voler eliminare il file "${importLog.file_name}"? Questa azione eliminerà anche tutti i dati importati.`);
    
    if (!firstConfirm) return;

    // Seconda conferma
    const secondConfirm = confirm(`ATTENZIONE: Questa azione è irreversibile! Confermi di voler eliminare definitivamente il file "${importLog.file_name}" e tutti i ${importLog.righe_importate || 0} record importati?`);
    
    if (!secondConfirm) return;

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
    const totalRecords = selectedRecords.size;

    try {
      // Ottieni i record selezionati usando gli indici corretti da allRecords (non viewingRecords)
      const selectedData = [];
      for (const selectedIndex of selectedRecords) {
        if (selectedIndex >= 0 && selectedIndex < allRecords.length) {
          selectedData.push(allRecords[selectedIndex]);
        }
      }
      
      // Show progress toast
      toast.info(`Importazione di ${totalRecords} record in corso...`);
      
      for (const record of selectedData) {
        try {
          // Map record fields to rubrica structure, preserving the original ID
          const rubricaData = {
            id: record.id, // Preserve the original ID from imported_contacts
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
          
          // Update progress every 10 records
          if ((successCount + errorCount) % 10 === 0) {
            toast.info(`Progresso: ${successCount + errorCount}/${totalRecords} record processati`);
          }
        } catch (error) {
          console.error('Errore elaborazione record:', error);
          errorCount++;
        }
      }

      // Update import log and recalculate counts
      if (selectedImport) {
        // Count remaining records
        const { count: remainingCount } = await supabase
          .from('imported_contacts')
          .select('*', { count: 'exact', head: true })
          .eq('import_log_id', selectedImport.id);
        
        await supabase
          .from('import_logs')
          .update({
            trasferiti_rubrica: true,
            contatti_selezionati: successCount,
            righe_importate: remainingCount || 0
          })
          .eq('id', selectedImport.id);
      }

      toast.success(`Importazione completata: ${successCount} contatti importati${errorCount > 0 ? `, ${errorCount} errori` : ''}`);
      
      // Refresh data to show real updated state
      await loadImportLogs();
      
      // Reload the current import to show updated data
      if (selectedImport) {
        // Reload import log data
        const { data: updatedImportLog } = await supabase
          .from('import_logs')
          .select('*')
          .eq('id', selectedImport.id)
          .single();
        
        if (updatedImportLog) {
          setSelectedImport(updatedImportLog);
        }
        
        // Get updated count
        const { count: updatedCount } = await supabase
          .from('imported_contacts')
          .select('*', { count: 'exact', head: true })
          .eq('import_log_id', selectedImport.id);
        
        const { data: updatedRecords } = await supabase
          .from('imported_contacts')
          .select('*')
          .eq('import_log_id', selectedImport.id)
          .order('row_number', { ascending: true });
        
        if (updatedRecords) {
          setAllRecords(updatedRecords);
          setViewingRecords(updatedRecords);
          setTotalRecords(updatedCount || 0);
        }
      }
      
      setSelectedRecords(new Set());
      
    } catch (error) {
      console.error('Errore importazione:', error);
      toast.error('Errore durante l\'importazione');
    } finally {
      setImportingSelected(false);
    }
  };

  // Se stiamo caricando il dialog, mostra solo uno schermo vuoto
  if (isLoadingDialog || (location.state?.openRecordsDialog && !showRecordsDialog)) {
    return <div className="flex items-center justify-center h-screen"></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Dropdown Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestione Email e Import</h1>
          <p className="text-muted-foreground">Gestisci templates email e importa contatti da file Excel/CSV</p>
        </div>
        <div className="w-full lg:w-64">
          <Select value={activeSection} onValueChange={setActiveSection}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleziona sezione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="templates">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Templates Email
                </div>
              </SelectItem>
              <SelectItem value="attachments">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Attachments
                </div>
              </SelectItem>
              <SelectItem value="import">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Importa Contatti
                </div>
              </SelectItem>
              <SelectItem value="manage">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Gestisci Import
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeSection === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card-transparent">
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

            <Card className="bg-card-transparent">
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
        )}

        {activeSection === 'attachments' && (
          <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Carica Allegato
                </CardTitle>
                <CardDescription>
                  Carica file PDF, Word, Excel, immagini o testo da allegare alle email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="attachment-file">File</Label>
                  <Input
                    id="attachment-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                    className="border-blue-500"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleAttachmentUpload(file);
                      }
                    }}
                    disabled={uploadingAttachment}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Formati supportati: PDF, Word, Excel, Immagini (JPG, PNG, GIF), Testo (max 10MB)
                  </p>
                </div>
                {uploadingAttachment && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Caricamento in corso...
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card-transparent">
              <CardHeader>
                <CardTitle>Allegati Disponibili ({emailAttachments.length})</CardTitle>
                <CardDescription>
                  File disponibili per essere allegati alle email
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {emailAttachments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Nessun allegato caricato
                    </p>
                  ) : (
                    emailAttachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-shrink-0">
                          {getFileThumbnail(attachment.mime_type, attachment.nome, attachment.file_path)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm">{attachment.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(attachment.file_size)} • {new Date(attachment.created_at).toLocaleDateString('it-IT')}
                          </p>
                          {attachment.mime_type.includes('image/') && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Immagine • Clicca per visualizzare
                            </p>
                          )}
                         </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingDocument(attachment)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAttachment(attachment.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        )}

        {activeSection === 'import' && (
          <Card className="bg-card-transparent">
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
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Switch 
                  id="ai-import-switch" 
                  checked={useAIImport}
                  onCheckedChange={setUseAIImport}
                />
                <Label htmlFor="ai-import-switch" className="cursor-pointer">
                  Usa Importazione AI
                </Label>
              </div>
              
              {useAIImport && (
                <div className="space-y-2">
                  <Label htmlFor="ai-prompt">Istruzioni per l'AI</Label>
                  <Textarea
                    id="ai-prompt"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Descrivi come l'AI deve processare i dati importati..."
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    L'AI utilizzerà queste istruzioni per elaborare i dati nella tabella temporanea
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="file-upload">File da Importare (solo .csv con separatore ; o , o TAB)</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  ⚠️ Accettati solo file CSV. Se hai un file Excel (.xlsx), salvalo come CSV prima di caricarlo.
                </p>
              </div>

              {/* Progress Indicator */}
              {importProgress.isProcessing && (
                <Card className="border-blue-200 bg-card-transparent">
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
                {uploadingFile || importProgress.isProcessing ? 'Elaborazione in corso...' : useAIImport ? 'Carica File in Tabella Temporanea' : 'Importa File'}
              </Button>
              
              {useAIImport && importProgress.currentImportId && !importProgress.isProcessing && (
                <AIColumnMapper
                  importLogId={importProgress.currentImportId}
                  onProcessComplete={() => {
                    loadImportLogs();
                    setImportProgress({
                      currentImportId: null,
                      totalRows: 0,
                      processedRows: 0,
                      isProcessing: false,
                      startTime: 0
                    });
                  }}
                  initialPrompt={aiPrompt}
                />
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === 'manage' && (
          <div className="space-y-2">
          <Card className="bg-card-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Database className="h-4 w-4" />
                    Gestisci Import
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Visualizza e gestisci i file importati. Seleziona i contatti da trasferire nella rubrica principale.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadCSVTemplate}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span className="hidden sm:inline">Scarica Template CSV</span>
                  <span className="sm:hidden">Template</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isMobile ? (
                /* Mobile View - Cards */
                <div className="space-y-2">
                  {importLogs.map((log) => (
                    <ImportLogMobileCard
                      key={log.id}
                      log={log}
                      onProcess={() => processFile(log.id)}
                      onViewRecords={() => viewImportRecords(log)}
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
                       <TableHead className="w-16"></TableHead>
                       <TableHead className="w-24">Data</TableHead>
                       <TableHead>File</TableHead>
                       <TableHead className="text-center">Stato</TableHead>
                       <TableHead className="text-center">Record</TableHead>
                       <TableHead className="text-center">Errori</TableHead>
                       <TableHead className="text-center">Selezionati</TableHead>
                       <TableHead className="text-center">Azioni</TableHead>
                       <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importLogs.map((log) => {
                      const isLocked = lockedFiles.has(log.id);
                      
                      return (
                        <TableRow key={log.id}>
                         <TableCell>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => {
                               setLockedFiles(prev => {
                                 const newSet = new Set(prev);
                                 if (newSet.has(log.id)) {
                                   newSet.delete(log.id);
                                 } else {
                                   newSet.add(log.id);
                                 }
                                 return newSet;
                               });
                             }}
                             className={cn(
                               "h-8 w-8 p-0",
                               isLocked ? "text-yellow-500 hover:text-yellow-600" : "text-muted-foreground hover:text-foreground"
                             )}
                             title={isLocked ? "Sblocca per cancellare" : "Blocca cancellazione"}
                           >
                             {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                           </Button>
                         </TableCell>
                         <TableCell>
                           {new Date(log.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                         </TableCell>
                         <TableCell>{log.file_name}</TableCell>
                         <TableCell className="text-center">{getStatusBadge(log.stato)}</TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-primary">{log.righe_totali}</span>
                          </TableCell>
                         <TableCell className="text-center text-red-600">{log.righe_errori}</TableCell>
                         <TableCell className="text-center text-blue-600">{log.contatti_selezionati}</TableCell>
                         <TableCell className="text-center">
                            <div className="flex gap-1 justify-center">
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
                               
                               {/* Pulsante Ripara con AI - mostrato se ci sono errori */}
                               {log.righe_errori > 0 && (
                                 <Button 
                                   variant="default" 
                                   size="sm"
                                   onClick={() => navigate(`/import-errors-monitor?import_log_id=${log.id}`)}
                                   className="bg-orange-600 hover:bg-orange-700"
                                 >
                                   <Pickaxe className="h-4 w-4 mr-1" />
                                   Ripara
                                 </Button>
                               )}

                               {/* Pulsante Visualizza Records */}
                               <Button 
                                 variant="outline" 
                                 size="sm"
                                 onClick={() => loadAllRecords(log)}
                                 disabled={loadingRecords && selectedImport?.id === log.id}
                               >
                                 <Eye className="h-4 w-4 mr-1" />
                                 {loadingRecords && selectedImport?.id === log.id ? 'Caricamento...' : `Vedi (${log.righe_importate})`}
                               </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                if (isLocked) {
                                  toast.error('File bloccato', {
                                    description: 'Sblocca il lucchetto per eliminare questo file'
                                  });
                                  return;
                                }
                                deleteImportFile(log);
                              }}
                              className={cn(
                                "text-red-600 hover:text-red-700 hover:bg-red-50",
                                isLocked && "opacity-50 cursor-not-allowed"
                              )}
                              title={isLocked ? "File bloccato - sblocca per eliminare" : "Elimina"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                loadImportLogs(); // Ricarica la lista
                setMonitoringImportId(null); // Nascondi il monitor
              }}
            />
          )}
        </div>
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
          setActiveFilters([]);
          setSearchQuery('');
          setOriginFilter('');
          setCountryFilter('');
          setHasNotesFilter(false);
        }
      }}>
        <DialogContent className="max-w-[98vw] w-[98vw] max-h-[95vh] h-[95vh] flex flex-col mx-auto my-auto overflow-hidden">
          <DialogHeader>
            {isMobile ? (
              /* Mobile Header - Compact */
              <div className="space-y-1">
                {/* Mobile Title with Filtered and Total Count */}
                <div className="flex items-start justify-between relative pb-1">
                  <div className="flex flex-col items-start gap-0.5">
                    <div className="flex items-center gap-2">
                      {/* Filtered count - only when filters are active */}
                      {(searchQuery || originFilter || countryFilter || hasNotesFilter || myContactsWithActivitiesFilter) && filteredRecords.length > 0 && (
                        <span className={`font-medium ${
                          searchQuery || originFilter || countryFilter || hasNotesFilter || myContactsWithActivitiesFilter
                            ? 'text-white text-lg' 
                            : 'text-primary text-sm'
                        }`}>
                          {filteredRecords.length}
                        </span>
                      )}
                      <DialogTitle>Record Importati</DialogTitle>
                      <span className="text-lg text-muted-foreground ml-2">
                        <span className="text-primary font-medium">{totalRecords}</span>
                      </span>
                    </div>
                    
                    {/* Active Filters Badges - Below title, aligned left */}
                    {(searchQuery || originFilter || countryFilter || hasNotesFilter || myContactsWithActivitiesFilter) && (
                      <div className="flex flex-wrap items-start gap-1">
                        {searchQuery && (
                          <Badge variant="secondary" className="text-[10px] h-6 px-2">
                            🔍 {searchQuery}
                            <Button variant="ghost" size="sm" className="h-3 w-3 p-0 ml-1" onClick={() => setSearchQuery('')}>
                              <X className="h-2 w-2" />
                            </Button>
                          </Badge>
                        )}
                        {originFilter && (
                          <Badge variant="secondary" className="text-[10px] h-6 px-2 bg-muted text-white">
                            📂 {originFilter}
                            <Button variant="ghost" size="sm" className="h-3 w-3 p-0 ml-1" onClick={() => setOriginFilter('')}>
                              <X className="h-2 w-2 text-white" />
                            </Button>
                          </Badge>
                        )}
                        {countryFilter && (
                          <Badge variant="secondary" className="text-[10px] h-6 px-2">
                            🌍 {getCountryFullName(countryFilter)}
                            <Button variant="ghost" size="sm" className="h-3 w-3 p-0 ml-1" onClick={() => setCountryFilter('')}>
                              <X className="h-2 w-2" />
                            </Button>
                          </Badge>
                        )}
                        {hasNotesFilter && (
                          <Badge variant="secondary" className="text-[10px] h-6 px-2">
                            📝 Con note
                            <Button variant="ghost" size="sm" className="h-3 w-3 p-0 ml-1" onClick={() => setHasNotesFilter(false)}>
                              <X className="h-2 w-2" />
                            </Button>
                          </Badge>
                        )}
                        {myContactsWithActivitiesFilter && (
                          <Badge variant="secondary" className="text-[10px] h-6 px-2">
                            👤 Mie attività
                            <Button variant="ghost" size="sm" className="h-3 w-3 p-0 ml-1" onClick={() => setMyContactsWithActivitiesFilter(false)}>
                              <X className="h-2 w-2" />
                            </Button>
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Search Field and Filter Buttons Container */}
                <div className="flex items-center justify-center gap-2">
                  <div className="relative w-[65%]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cerca..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {/* Filter Buttons */}
                  <div className="flex items-center gap-1">
                    <Dialog open={showFilters} onOpenChange={setShowFilters}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 p-2"
                        >
                          <Filter className={`h-4 w-4 ${(originFilter || countryFilter || hasNotesFilter || myContactsWithActivitiesFilter) ? 'text-sky-500 animate-pulse' : ''}`} />
                        </Button>
                      </DialogTrigger>
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
                                  // Determina il valore del filtro attività
                                  const hasActivityFilter = activeFilters.find(f => f.field === 'has_activities');
                                  if (hasActivityFilter) {
                                    return hasActivityFilter.value ? 'with_activities' : 'without_activities';
                                  }
                                  return 'all';
                                })()} 
                                onValueChange={(value) => {
                                  // Rimuovi eventuali filtri attività esistenti
                                  setActiveFilters(prev => prev.filter(f => f.field !== 'has_activities'));
                                  
                                  // Aggiungi il nuovo filtro se non è "tutti"
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
                              onClick={() => setShowFilters(false)}
                            >
                              Conferma
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {/* Clear Filters Button */}
                    {(originFilter || countryFilter || hasNotesFilter || myContactsWithActivitiesFilter) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 p-2"
                        onClick={() => {
                          setOriginFilter('');
                          setCountryFilter('');
                          setHasNotesFilter(false);
                          setMyContactsWithActivitiesFilter(false);
                        }}
                      >
                        <FilterX className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Desktop Header - Con popup filtri */
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between relative">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <DialogTitle>Record Importati</DialogTitle>
                      <span className="text-sm font-medium text-muted-foreground">
                        ({allRecords.length} record{allRecords.length !== 1 ? 's' : ''})
                      </span>
                      
                      {/* Cestino accanto al titolo */}
                      {selectedRecords.size > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={deleteSelectedRecords}
                                className="h-8 w-8 p-0 border-red-500 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Elimina {selectedRecords.size} record selezionati</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">{selectedImport?.file_name}</p>
                  </div>
                  
                  {/* Pulsanti in alto a destra */}
                  <div className="flex items-center gap-2">
                    {/* Pulsante Refresh */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => selectedImport && loadAllRecords(selectedImport)}
                            className="h-auto px-2 py-1 flex flex-col items-center gap-1"
                            disabled={loadingAllRecords}
                          >
                            <RefreshCw className={`h-4 w-4 text-blue-500 ${loadingAllRecords ? 'animate-spin' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ricarica dati</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                {/* Search and Filter buttons */}
                <div className="flex items-center justify-center gap-2 relative">
                  {/* Campo di ricerca centrato */}
                  <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cerca per nome azienda, alias, nome, città..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Filter Buttons */}
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
                              <Label>Nazione</Label>
                              <Select value={countryFilter} onValueChange={setCountryFilter}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Tutte le nazioni" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__all__">Tutte ({allRecords.length})</SelectItem>
                                  {getUniqueValuesWithCount('country').map(({ value, count }) => (
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
                              <Label>Record per pagina</Label>
                              <Select value={String(recordsPerPage)} onValueChange={(value) => setRecordsPerPage(Number(value))}>
                                <SelectTrigger>
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
                </div>
              </div>
            )}
          </DialogHeader>


          {/* Blocco azioni record selezionati - Desktop Only */}
          {!isMobile && selectedRecords.size > 0 && (
            <div className="flex items-center justify-between border-b py-3 px-4">
              {/* Numero e X a sinistra */}
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-sm px-4 py-2">
                  {selectedRecords.size}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedRecords(new Set())}
                  className="h-10 px-4 text-sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* AI e Prompt al centro */}
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPromptDialog(true)}
                        className="h-10 w-10 p-0"
                      >
                        <Settings className="h-4 w-4 text-orange-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Modifica prompt AI per alias</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const selectedIds = Array.from(selectedRecords).map(idx => allRecords[idx]?.id).filter(Boolean);
                          if (selectedIds.length === 0) {
                            toast.error('Nessun record selezionato');
                            return;
                          }
                          
                          setGeneratingAliases(true);
                          setShowAliasPreview(true);
                          setAliasPreviewData([]);
                          setAliasPreviewTotal(selectedIds.length);
                          
                          try {
                            toast.info(`Generazione preview per ${selectedIds.length} contatti...`);
                            const { data, error } = await supabase.functions.invoke('ai-crm-manager', {
                              body: { action: 'preview_aliases', data: {}, contact_ids: selectedIds }
                            });
                            
                            if (error) throw error;
                            
                            setAliasPreviewData(data.previews || []);
                            setGeneratingAliases(false);
                          } catch (err: any) {
                            console.error('Errore generazione preview:', err);
                            toast.error('Errore generazione preview: ' + (err.message || 'Errore sconosciuto'));
                            setGeneratingAliases(false);
                            setShowAliasPreview(false);
                          }
                        }}
                        disabled={generatingAliases || loadingAllRecords}
                        className="h-10 w-10 p-0"
                      >
                        {generatingAliases ? (
                          <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-purple-500" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Genera alias AI per {selectedRecords.size} selezionati</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Altre icone a destra */}
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowMultipleActivityDialog(true)}
                        className="h-10 w-10 p-0"
                      >
                        <FileText className="h-4 w-4 text-blue-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Crea attività</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={importSelectedRecords}
                        className="h-10 w-10 p-0"
                      >
                        <Database className="h-4 w-4 text-green-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Importa in rubrica</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}


          {/* Area filtri attivi */}
          {activeFilters.length > 0 && (
            <div className="py-2">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium">Filtri attivi:</span>
                {activeFilters.map((filter, index) => (
                  <Badge 
                    key={`${filter.field}-${filter.value}-${index}`}
                    variant="outline" 
                    className="text-blue-600 border-blue-200 bg-transparent cursor-pointer flex items-center gap-1"
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
                <span className="text-xs text-muted-foreground ml-2">
                  {filteredRecords.length} record corrispondenti
                </span>
              </div>
            </div>
           )}
          
          {/* Mobile Filters Button and Selection Controls - Above Cards */}
          {isMobile && (
            <div className="flex justify-between items-center pb-2 relative">
              {/* Selection Controls rimosso da qui - ora nel footer */}
            </div>
          )}
          
          {/* Mobile Action Buttons - separate positioning */}
          
          {loadingAllRecords ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p>Caricamento record...</p>
              </div>
            </div>
          ) : filteredRecords.length > 0 ? (
              <div className="flex flex-col min-h-0 flex-1">
                {isMobile ? (
                  /* Mobile View - Ultra-Compact Cards */
                  <div className="space-y-2 flex-1 overflow-auto touch-pan-y touch-pan-x pt-[20px] pb-[10px]" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {viewingRecords.map((record, viewIndex) => {
                      const actualIndex = currentPage * recordsPerPage + viewIndex;
                      return (
                        <CompactContactCard
                          key={viewIndex}
                          contact={record}
                          index={actualIndex}
                          isSelected={selectedRecords.has(actualIndex)}
                          onSelect={() => toggleRecordSelection(actualIndex)}
                          onView={() => openRecordDetail(record, actualIndex)}
                          onCreateActivity={(activityType) => {
                            setSelectedContactIdForActivities(record.id);
                            setSelectedContactForActivity(record);
                            setDefaultActivityType(activityType);
                            setIsAttivitaDialogOpen(true);
                          }}
                          getCountryFlag={getCountryFlag}
                          formatCellValue={formatCellValue}
                        />
                      );
                    })}
                  </div>
               ) : (
                 /* Desktop View - Table */
                 <div className="overflow-x-scroll overflow-y-auto flex-1 border rounded-md">
                    <Table style={{ minWidth: '1400px' }}>
                      <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                        <TableRow>
                           <TableHead className="w-12 bg-background border-b px-4 py-[10px]">
                               <Checkbox
                                 checked={(() => {
                                   // Controlla se tutti i record della pagina corrente sono selezionati
                                   const currentPageIndexes = [];
                                   for (let i = 0; i < viewingRecords.length; i++) {
                                     const actualIndex = currentPage * recordsPerPage + i;
                                     currentPageIndexes.push(actualIndex);
                                   }
                                   return currentPageIndexes.length > 0 && currentPageIndexes.every(index => selectedRecords.has(index));
                                 })()}
                                 onCheckedChange={toggleSelectAll}
                                 aria-label="Seleziona tutti della pagina corrente"
                               />
                            </TableHead>
                            <TableHead className="w-16 text-center bg-background border-b px-4 py-[10px]"># 
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <FileText className="h-3 w-3 ml-1 inline" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Clicca l'icona per vedere le note</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                           {(() => {
                              const allColumns = Object.keys(filteredRecords[0] || {}).filter(key => key !== 'id' && key !== 'import_log_id');
                              const visibleCols = getVisibleColumns(allColumns);
                              
                              // Trova l'indice di company_name
                              const companyNameIndex = visibleCols.indexOf('company_name');
                              
                              // Se company_name esiste, inserisci la colonna Attività prima di essa
                              const headers = [];
                              for (let i = 0; i < visibleCols.length; i++) {
                                if (i === companyNameIndex) {
                                  // Prima di company_name, inserisci la colonna Attività
                                  headers.push(
                                    <TableHead key="attivita" className="w-20 bg-background border-b px-4 py-[10px] text-center cursor-pointer hover:bg-accent/50" onClick={() => handleColumnSort('attivita')}>
                                      <div className="flex items-center justify-center gap-1">
                                        <span>Attività</span>
                                        {getSortIcon('attivita')}
                                      </div>
                                    </TableHead>
                                  );
                                }
                                
                                const key = visibleCols[i];
                                headers.push(
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
                                );
                              }
                              
                              // Se company_name non c'è, aggiungi Attività all'inizio
                              if (companyNameIndex === -1) {
                                headers.unshift(
                                  <TableHead key="attivita" className="w-20 bg-background border-b px-4 py-[10px] text-center cursor-pointer hover:bg-accent/50" onClick={() => handleColumnSort('attivita')}>
                                    <div className="flex items-center justify-center gap-1">
                                      <span>Attività</span>
                                      {getSortIcon('attivita')}
                                    </div>
                                  </TableHead>
                                );
                              }
                              
                              return headers;
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
                                <div className="flex items-center justify-center gap-1">
                                  {record.note && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <FileText 
                                            className="h-3 w-3 text-blue-500 cursor-pointer hover:text-blue-700" 
                                            onClick={() => toast.info(record.note)}
                                          />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Clicca per vedere le note</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  <span className="text-xs">{actualIndex + 1}</span>
                                </div>
                               </TableCell>
                            {(() => {
                              const allColumns = Object.keys(record).filter(key => key !== 'id' && key !== 'import_log_id');
                              const visibleCols = getVisibleColumns(allColumns);
                              
                              // Trova l'indice di company_name
                              const companyNameIndex = visibleCols.indexOf('company_name');
                              
                              // Se company_name esiste, inserisci la cella Attività prima di essa
                              const cells = [];
                              for (let i = 0; i < visibleCols.length; i++) {
                                if (i === companyNameIndex) {
                                  // Prima di company_name, inserisci la cella Attività
                                  cells.push(
                                    <TableCell key="attivita" className="w-20 px-4 py-[10px] text-center">
                                      {getActivityCount(record.id) > 0 && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigate('/attivita', { state: { filterByContact: record.id } });
                                                }}
                                                className="flex items-center justify-center gap-1 px-2 py-1 rounded hover:bg-primary/10 text-primary transition-colors"
                                              >
                                                <Activity className="h-3 w-3" />
                                                <span className="text-xs font-medium">{getActivityCount(record.id)}</span>
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Visualizza {getActivityCount(record.id)} attività</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </TableCell>
                                  );
                                }
                                
                                const key = visibleCols[i];
                                cells.push(
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
                                      ) : key === 'company_name' ? (
                                        <div className="flex items-center gap-2">
                                          {(!record.alias || !record.company_alias) && (
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <button
                                                    onClick={async (e) => {
                                                      e.stopPropagation();
                                                      setGeneratingAliases(true);
                                                      try {
                                                        toast.info('Generazione alias in corso...');
                                                        const { data, error } = await supabase.functions.invoke('ai-crm-manager', {
                                                          body: { action: 'update_aliases', data: {}, contact_ids: [record.id] }
                                                        });
                                                        if (error) throw error;
                                                        toast.success(data.message || 'Alias generati');
                                                        await loadAllRecords(selectedImport!);
                                                      } catch (err: any) {
                                                        console.error('Errore generazione alias:', err);
                                                        toast.error('Errore generazione alias: ' + (err.message || 'Errore sconosciuto'));
                                                      } finally {
                                                        setGeneratingAliases(false);
                                                      }
                                                    }}
                                                    disabled={generatingAliases || loadingAllRecords}
                                                    className="p-1 rounded hover:bg-purple-600/20 transition-colors"
                                                  >
                                                    {generatingAliases ? (
                                                      <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                                                    ) : (
                                                      <Sparkles className="h-4 w-4 text-purple-600" />
                                                    )}
                                                  </button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Genera alias AI</p></TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          )}
                                          
                                          <span>{formatCellValue(record[key], key)}</span>
                                          
                                          <div 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedContactIdForActivities(record.id);
                                              setIsAttivitaDialogOpen(true);
                                            }}
                                            className="cursor-pointer"
                                          >
                                            <ActivityIndicators 
                                              companyId={record.id} 
                                              activities={getCompanyActivities(record.id)}
                                              size="sm"
                                            />
                                          </div>
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
                                );
                              }
                              
                              // Se company_name non c'è, aggiungi Attività all'inizio
                              if (companyNameIndex === -1) {
                                cells.unshift(
                                  <TableCell key="attivita" className="w-20 px-4 py-[10px] text-center">
                                    {getActivityCount(record.id) > 0 && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                navigate('/attivita', { state: { filterByContact: record.id } });
                                              }}
                                              className="flex items-center justify-center gap-1 px-2 py-1 rounded hover:bg-primary/10 text-primary transition-colors"
                                            >
                                              <Activity className="h-3 w-3" />
                                              <span className="text-xs font-medium">{getActivityCount(record.id)}</span>
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Visualizza {getActivityCount(record.id)} attività</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </TableCell>
                                );
                              }
                              
                              return cells;
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
               )}
                
                {/* Footer - Responsive Controls */}
                <div className={cn(
                  "pt-4 border-t flex-shrink-0",
                  isMobile ? "space-y-3" : "flex justify-between items-center"
                )}>
                  {/* Stats - removed */}
                    {/* Desktop Actions - keep existing */}
                    {isMobile ? (
                      /* Mobile Pagination - Footer */
                      <div className="flex flex-col items-center relative">
                        {/* Cestino - allineato a destra */}
                        {selectedRecords.size > 0 && (
                          <div className="absolute -top-[15px] right-0 z-10">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={deleteSelectedRecords}
                                    className="p-2"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Elimina selezionati</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )}
                        
                        {/* Animated Book */}
                        <AnimatedBook currentPage={currentPage} className="w-full -mb-[41px] pointer-events-none" />
                        
                        {/* Pagination Controls */}
                        <div className="flex items-center justify-center gap-[15px] relative w-full">
                          {/* File Icon - a sinistra del badge */}
                          {filteredRecords.length > 0 && (
                            <div className="absolute left-0 -top-[90px] flex flex-col items-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={toggleSelectAll}
                                className="p-2 hover:bg-transparent"
                                aria-label="Seleziona tutti della pagina"
                              >
                                <FileText 
                                  className={(() => {
                                    const currentPageIndexes = [];
                                    for (let i = 0; i < viewingRecords.length; i++) {
                                      const actualIndex = currentPage * recordsPerPage + i;
                                      currentPageIndexes.push(actualIndex);
                                    }
                                    const isAllSelected = currentPageIndexes.length > 0 && currentPageIndexes.every(index => selectedRecords.has(index));
                                    return isAllSelected ? "h-5 w-5 text-green-500" : "h-5 w-5 text-blue-500";
                                  })()}
                                />
                              </Button>
                              {(() => {
                                const currentPageIndexes = [];
                                for (let i = 0; i < viewingRecords.length; i++) {
                                  const actualIndex = currentPage * recordsPerPage + i;
                                  currentPageIndexes.push(actualIndex);
                                }
                                const isAllSelected = currentPageIndexes.length > 0 && currentPageIndexes.every(index => selectedRecords.has(index));
                                return isAllSelected ? (
                                  <span className="text-xs text-green-500 font-medium">full page</span>
                                ) : null;
                              })()}
                            </div>
                          )}
                          
                          {/* Selected Records Badge - Centered */}
                          {selectedRecords.size > 0 && (
                            <span 
                              className="text-xs font-medium text-white bg-blue-500 px-2 py-1 rounded cursor-pointer hover:bg-blue-600 absolute left-1/2 -translate-x-1/2 -top-[90px]"
                              onClick={() => setSelectedRecords(new Set())}
                            >
                              {selectedRecords.size}
                            </span>
                          )}
                          
                          {/* Centered controls */}
                          <div className="flex items-center gap-[15px]">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="px-[15px] hover:bg-transparent"
                              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                              disabled={currentPage === 0}
                            >
                              <ChevronLeft className="h-10 w-10" />
                            </Button>
                            
                            {/* Azioni multiple - a sinistra */}
                            {selectedRecords.size > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setShowMultipleActivityDialog(true)}
                                      className="p-2 absolute left-0"
                                    >
                                      <Pickaxe className="h-4 w-4 text-blue-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Crea attività multiple</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            <span className="text-sm px-3 py-1">
                              {currentPage + 1} di {Math.ceil(filteredRecords.length / recordsPerPage)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="px-[15px] hover:bg-transparent"
                              onClick={() => setCurrentPage(Math.min(Math.ceil(filteredRecords.length / recordsPerPage) - 1, currentPage + 1))}
                              disabled={currentPage >= Math.ceil(filteredRecords.length / recordsPerPage) - 1}
                            >
                              <ChevronRight className="h-10 w-10" />
                            </Button>
                          </div>
                          
                          {/* Salva in rubrica - a destra della freccia, allineato a destra */}
                          {selectedRecords.size > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={importSelectedRecords}
                                    className="p-2 absolute right-0"
                                  >
                                    <Database className="h-4 w-4 text-green-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Importa in rubrica</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Desktop Pagination */
                      <div className="flex items-start justify-between w-full max-w-2xl mx-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                          disabled={currentPage === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Precedente
                        </Button>
                        <div className="flex flex-col items-center">
                          <span className="text-sm px-3 py-1">
                            Pagina {currentPage + 1} di {Math.ceil(filteredRecords.length / recordsPerPage)}
                          </span>
                          <span className="text-xs text-red-500 font-medium mt-[25px]">
                            {filteredRecords.length} records
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage(Math.min(Math.ceil(filteredRecords.length / recordsPerPage) - 1, currentPage + 1))}
                          disabled={currentPage >= Math.ceil(filteredRecords.length / recordsPerPage) - 1}
                        >
                          Successivo
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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
        <DialogContent className="w-[95vw] max-w-5xl max-h-[85vh] flex flex-col overflow-hidden p-2 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateRecord('prev')}
                  disabled={selectedRecordIndex <= 0}
                >
                  <ChevronLeft className="h-4 w-4" />
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

      {/* Dialog per attività multiple */}
      <Dialog open={showMultipleActivityDialog} onOpenChange={setShowMultipleActivityDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crea Attività Multiple</DialogTitle>
            <DialogDescription>
              Crea una nuova attività per tutte le aziende selezionate ({Array.from(selectedRecords).length} contatti)
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
                  ...record
                };
              })}
              onSubmit={handleCreateMultipleActivities}
              onCancel={() => setShowMultipleActivityDialog(false)}
              isSubmitting={creatingMultipleActivities}
              showSaveToRubrica={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Document Viewer Dialog */}
      {viewingDocument && (
        <DocumentViewer
          isOpen={!!viewingDocument}
          onClose={() => setViewingDocument(null)}
          fileName={viewingDocument.nome}
          fileUrl={viewingDocument.file_path}
          mimeType={viewingDocument.mime_type}
        />
      )}
      
      {/* Dialog per creazione attività */}
      <Dialog open={isAttivitaDialogOpen} onOpenChange={(open) => {
        setIsAttivitaDialogOpen(open);
        if (!open) {
          setSelectedContactIdForActivities(null);
          setSelectedContactForActivity(null);
          setDefaultActivityType(undefined);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crea Nuova Attività</DialogTitle>
          </DialogHeader>
          {selectedContactForActivity && (
            <AdvancedMultipleActivityForm
              contacts={[selectedContactForActivity]}
              defaultActivityType={defaultActivityType}
              onSubmit={async (data) => {
                setIsAttivitaDialogOpen(false);
                setSelectedContactIdForActivities(null);
                setSelectedContactForActivity(null);
                setDefaultActivityType(undefined);
              }}
              onCancel={() => {
                setIsAttivitaDialogOpen(false);
                setSelectedContactIdForActivities(null);
                setSelectedContactForActivity(null);
                setDefaultActivityType(undefined);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog per modifica prompt AI */}
      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Prompt AI - Generazione Alias</DialogTitle>
            <DialogDescription>
              Personalizza le regole che l'AI usa per generare alias naturali dai nomi formali
            </DialogDescription>
          </DialogHeader>
          <PagePromptManager pageRoute="/template-alias" />
        </DialogContent>
      </Dialog>

      <AliasPreviewDialog
        open={showAliasPreview}
        onOpenChange={setShowAliasPreview}
        previews={aliasPreviewData}
        isGenerating={generatingAliases}
        totalCount={aliasPreviewTotal}
        onConfirm={async () => {
          try {
            toast.info('Applicazione modifiche...');
            const { data, error } = await supabase.functions.invoke('ai-crm-manager', {
              body: { 
                action: 'apply_aliases', 
                data: { previews: aliasPreviewData }
              }
            });
            
            if (error) throw error;
            
            toast.success(data.message || 'Alias applicati con successo');
            setShowAliasPreview(false);
            setAliasPreviewData([]);
            await loadAllRecords(selectedImport!);
          } catch (err: any) {
            console.error('Errore applicazione alias:', err);
            toast.error('Errore applicazione: ' + (err.message || 'Errore sconosciuto'));
          }
        }}
        onCancel={() => {
          setShowAliasPreview(false);
          setAliasPreviewData([]);
          setGeneratingAliases(false);
        }}
      />
    </div>
  );
}
