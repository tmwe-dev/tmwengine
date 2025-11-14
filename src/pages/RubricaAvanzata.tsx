import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Eye, Edit, Users, Database, ChevronLeft, ChevronRight, Building, ChevronUp, ChevronDown, Search, Filter, Phone, Mail, MapPin, Tag, Trash2, FileText, SearchCheck, SearchX, ArrowUpDown, ArrowUp, ArrowDown, Activity, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import countriesData from '@/data/countries.json';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RecordDetailLayout } from '@/components/record-detail/RecordDetailLayout';
import { AdvancedMultipleActivityForm } from '@/components/attivita/AdvancedMultipleActivityForm';
import { ContactMobileCard } from '@/components/rubrica/ContactMobileCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCompanyActivities } from '@/hooks/useCompanyActivities';
import { cn } from '@/lib/utils';
import { UnifiedAICommunicationBadge } from '@/components/ai/UnifiedAICommunicationBadge';
import { EmailQueueBadge } from '@/components/email-campagne/EmailQueueBadge';

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

interface Contact {
  [key: string]: any;
}

interface FilterTag {
  field: string;
  value: any;
  displayValue: string;
}

export default function RubricaAvanzata() {
  const [loading, setLoading] = useState(true);
  const [viewingRecords, setViewingRecords] = useState<Contact[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<Contact[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [showRecordsDialog, setShowRecordsDialog] = useState(false);
  const [currentRecordIndex, setCurrentRecordIndex] = useState(0);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreRecords, setHasMoreRecords] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterTag[]>([]);
  
  // New search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [hasActivitiesFilter, setHasActivitiesFilter] = useState(false);
  const [recordsPerPage, setRecordsPerPage] = useState(50);
  const [allRecords, setAllRecords] = useState<Contact[]>([]);
  const [loadingAllRecords, setLoadingAllRecords] = useState(false);
  
  // Stato per l'ordinamento delle colonne
  const [sortConfig, setSortConfig] = useState<{
    primary: { column: string; direction: 'asc' | 'desc' } | null;
    secondary: { column: string; direction: 'asc' | 'desc' } | null;
  }>({
    primary: null,
    secondary: null
  });
  
  // Stato per controllare la visibilità delle colonne
  const [visibleColumns, setVisibleColumns] = useState({
    company: true,
    details: false, 
    metadata: false
  });
  
  // Stato per la visualizzazione del record singolo
  const [showRecordDetail, setShowRecordDetail] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Contact | null>(null);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);
  
  // Stati per attività multiple
  const [showMultipleActivityDialog, setShowMultipleActivityDialog] = useState(false);
  const [creatingMultipleActivities, setCreatingMultipleActivities] = useState(false);
  
  // Stato per nascondere/mostrare sezione superiore - non più necessario
  // const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(false);

  // Mobile hook
  const isMobile = useIsMobile();

  // Activities hook
  const { getCompanyActivities, getActivityCount } = useCompanyActivities();
  
  // Navigation
  const navigate = useNavigate();

  useEffect(() => {
    loadContacts();
  }, []);

  // Apply search and filters to records
  useEffect(() => {
    let result = [...allRecords];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(record => {
        const searchFields = [
          record.azienda,
          record.nome,
          record.responsabile,
          record.email,
          record.citta
        ];
        
        return searchFields.some(field => 
          field && String(field).toLowerCase().includes(query)
        );
      });
    }
    
    // Apply origin filter
    if (originFilter && originFilter !== '__all__') {
      result = result.filter(record => record.origine === originFilter);
    }
    
    // Apply country filter  
    if (countryFilter && countryFilter !== '__all__') {
      result = result.filter(record => record.paese === countryFilter);
    }
    
    // Apply activities filter
    if (hasActivitiesFilter) {
      result = result.filter(record => getActivityCount(record.id) > 0);
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
  }, [searchQuery, originFilter, countryFilter, hasActivitiesFilter, activeFilters, recordsPerPage]);

  // Funzione per gestire la creazione di attività multiple
  const handleCreateMultipleActivities = async (activityData: any) => {
    setCreatingMultipleActivities(true);
    
    try {
      const selectedContacts = Array.from(selectedRecords).map(index => {
        const record = allRecords[index];
        return {
          id: record.id,
          name: record.azienda || record.nome || 'Azienda non specificata',
          source: 'rubrica'
        };
      });

      // Crea un'attività per ogni contatto selezionato
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

  const loadContacts = async () => {
    try {
      setLoadingAllRecords(true);
      const { data, error } = await supabase
        .from('rubrica')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAllRecords(data || []);
      setTotalRecords(data?.length || 0);
    } catch (error) {
      console.error('Errore nel caricamento contatti:', error);
      toast.error('Errore nel caricamento dei contatti');
    } finally {
      setLoadingAllRecords(false);
      setLoading(false);
    }
  };

  const applyFilters = (records: Contact[], filters: FilterTag[]): Contact[] => {
    if (filters.length === 0) return records;
    
    return records.filter(record => {
      return filters.every(filter => {
        const fieldValue = record[filter.field];
        
        if (filter.value === null || filter.value === undefined) {
          return fieldValue === null || fieldValue === undefined || fieldValue === '';
        }
        
        if (typeof filter.value === 'boolean') {
          return fieldValue === filter.value;
        }
        
        if (typeof filter.value === 'string') {
          if (filter.value === '') {
            return fieldValue === null || fieldValue === undefined || fieldValue === '';
          }
          return String(fieldValue || '').toLowerCase().includes(filter.value.toLowerCase());
        }
        
        return fieldValue === filter.value;
      });
    });
  };

  const applySorting = (records: Contact[], config: typeof sortConfig): Contact[] => {
    if (!config.primary) return records;
    
    return [...records].sort((a, b) => {
      const { column: primaryCol, direction: primaryDir } = config.primary!;
      
      let aVal = a[primaryCol];
      let bVal = b[primaryCol];
      
      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';
      
      // Convert to string for comparison
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      
      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;
      
      if (comparison === 0 && config.secondary) {
        const { column: secondaryCol, direction: secondaryDir } = config.secondary;
        let aSecVal = String(a[secondaryCol] || '').toLowerCase();
        let bSecVal = String(b[secondaryCol] || '').toLowerCase();
        
        if (aSecVal < bSecVal) comparison = -1;
        if (aSecVal > bSecVal) comparison = 1;
        
        return secondaryDir === 'desc' ? -comparison : comparison;
      }
      
      return primaryDir === 'desc' ? -comparison : comparison;
    });
  };

  const getUniqueValues = (field: string) => {
    const values = allRecords
      .map(record => record[field])
      .filter(value => value !== null && value !== undefined && value !== '')
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    
    return values;
  };

  const getCountryFullName = (countryCode: string): string => {
    if (!countryCode) return countryCode;
    
    const country = countriesData.find(c => 
      c.code.toLowerCase() === countryCode.toLowerCase() ||
      c.name.toLowerCase() === countryCode.toLowerCase()
    );
    
    return country ? country.name : countryCode;
  };

  const addFilter = (field: string, value: any) => {
    const displayValue = field === 'paese' ? getCountryFullName(value) : String(value);
    
    const newFilter: FilterTag = {
      field,
      value,
      displayValue: `${getFieldDisplayName(field)}: ${displayValue}`
    };
    
    setActiveFilters(prev => {
      const filtered = prev.filter(f => !(f.field === field && f.value === value));
      return [...filtered, newFilter];
    });
  };

  const removeFilter = (index: number) => {
    setActiveFilters(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchQuery('');
    setOriginFilter('');
    setCountryFilter('');
  };

  const getFieldDisplayName = (field: string): string => {
    const fieldNames: { [key: string]: string } = {
      'nome': 'Nome',
      'azienda': 'Azienda',
      'email': 'Email',
      'telefono': 'Telefono',
      'cellulare': 'Cellulare',
      'citta': 'Città',
      'paese': 'Paese',
      'origine': 'Origine',
      'stato': 'Stato',
      'tags': 'Tag'
    };
    
    return fieldNames[field] || field;
  };

  const handleSort = (column: string) => {
    setSortConfig(prev => {
      if (!prev.primary || prev.primary.column !== column) {
        return {
          primary: { column, direction: 'asc' },
          secondary: prev.primary
        };
      } else {
        const newDirection = prev.primary.direction === 'asc' ? 'desc' : 'asc';
        return {
          primary: { column, direction: newDirection },
          secondary: prev.secondary
        };
      }
    });
  };

  const getSortIcon = (column: string) => {
    if (!sortConfig.primary || sortConfig.primary.column !== column) {
      return <ChevronUp className="h-3 w-3 opacity-0" />;
    }
    
    return sortConfig.primary.direction === 'asc' ? 
      <ChevronUp className="h-3 w-3" /> : 
      <ChevronDown className="h-3 w-3" />;
  };

  const toggleColumnVisibility = (columnGroup: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnGroup]: !prev[columnGroup]
    }));
  };

  const handleRecordClick = (record: Contact, index: number) => {
    setSelectedRecord(record);
    setSelectedRecordIndex(index);
    setShowRecordDetail(true);
  };

  const handlePrevRecord = () => {
    if (selectedRecordIndex > 0) {
      const newIndex = selectedRecordIndex - 1;
      setSelectedRecordIndex(newIndex);
      setSelectedRecord(viewingRecords[newIndex]);
    }
  };

  const handleNextRecord = () => {
    if (selectedRecordIndex < viewingRecords.length - 1) {
      const newIndex = selectedRecordIndex + 1;
      setSelectedRecordIndex(newIndex);
      setSelectedRecord(viewingRecords[newIndex]);
    }
  };

  const deleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('rubrica')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast.success('Contatto eliminato con successo');
      loadContacts(); // Reload data
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error);
      toast.error('Errore nell\'eliminazione del contatto');
    }
  };

  const deleteSelectedContacts = async () => {
    if (selectedRecords.size === 0) {
      toast.error('Nessun contatto selezionato');
      return;
    }

    try {
      const selectedIndexes = Array.from(selectedRecords);
      const contactsToDelete = selectedIndexes.map(index => viewingRecords[index]);
      const idsToDelete = contactsToDelete.map(contact => contact.id);

      const { error } = await supabase
        .from('rubrica')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      toast.success(`${selectedRecords.size} contatti eliminati con successo`);
      setSelectedRecords(new Set());
      loadContacts(); // Reload data
    } catch (error) {
      console.error('Errore nell\'eliminazione multipla:', error);
      toast.error('Errore nell\'eliminazione dei contatti');
    }
  };

  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Search Field - Always Visible */}
      <Card className="border-card shadow-soft bg-card-transparent">
        <CardContent className={cn(isMobile ? "p-2" : "p-4")}>
          <div className="flex items-center gap-3">
            {/* Counter - Mobile */}
            {isMobile && (
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users className="h-4 w-4" />
                ({filteredRecords.length})
              </div>
            )}
            <EmailQueueBadge />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/chat?page=/rubrica-avanzata')}
              className="shrink-0"
              title="Chat AI"
            >
              <Brain className="h-5 w-5" />
            </Button>
            <UnifiedAICommunicationBadge pageRoute="/rubrica-avanzata" />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, azienda, email o città..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("pl-10", isMobile ? "h-8" : "h-9")}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground transition-colors p-2 shrink-0"
                  title="Filtri avanzati"
                >
                  <Filter className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <Card className="border-0 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filtri Avanzati
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Filter Controls */}
                    <div className="grid gap-3">
                      {/* Origin Filter */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Origine</label>
                        <Select value={originFilter} onValueChange={setOriginFilter}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Tutte" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Tutte le origini</SelectItem>
                            {getUniqueValues('origine').map((origin) => (
                              <SelectItem key={origin} value={origin}>
                                {origin}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Country Filter */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Paese</label>
                        <Select value={countryFilter} onValueChange={setCountryFilter}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Tutti" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Tutti i paesi</SelectItem>
                            {getUniqueValues('paese').map((country) => (
                              <SelectItem key={country} value={country}>
                                {getCountryFlag(country)} {getCountryFullName(country)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Records Per Page */}
                      <div>
                        <label className="text-xs font-medium mb-1 block">Per pagina</label>
                        <Select value={recordsPerPage.toString()} onValueChange={(value) => setRecordsPerPage(Number(value))}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="200">200</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Activities Filter */}
                      <div className="flex items-center space-x-2 pt-2 border-t">
                        <input
                          type="checkbox"
                          id="hasActivitiesRubricaAvanzata"
                          checked={hasActivitiesFilter}
                          onChange={(e) => setHasActivitiesFilter(e.target.checked)}
                          className="h-4 w-4"
                        />
                        <label htmlFor="hasActivitiesRubricaAvanzata" className="text-xs font-medium">
                          Solo con attività associate
                        </label>
                      </div>
                    </div>

                    {/* Compact Stats */}
                    <div className="grid grid-cols-4 gap-2 py-2 border-t border-border">
                      <div className="text-center">
                        <div className="text-sm font-bold text-foreground">{allRecords.length}</div>
                        <div className="text-xs text-muted-foreground">Totali</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-primary">{filteredRecords.length}</div>
                        <div className="text-xs text-muted-foreground">Filtrati</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-foreground">{allRecords.filter(c => c.azienda).length}</div>
                        <div className="text-xs text-muted-foreground">Aziende</div>
                      </div>
                      <div className="text-center">
                        <div className={cn("text-sm font-bold", selectedRecords.size > 0 ? "text-blue-600" : "text-accent")}>{selectedRecords.size}</div>
                        <div className="text-xs text-muted-foreground">Selez.</div>
                      </div>
                    </div>

                    {/* Column Visibility Controls */}
                    <div className="pt-2 border-t border-border">
                      <label className="text-xs font-medium mb-2 block">Colonne visibili</label>
                      <div className="flex gap-1 justify-center">
                        <Button
                          variant={visibleColumns.company ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleColumnVisibility('company')}
                          className="h-7 px-2 text-xs"
                        >
                          <Building className="h-3 w-3" />
                        </Button>
                        <Button
                          variant={visibleColumns.details ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleColumnVisibility('details')}
                          className="h-7 px-2 text-xs"
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button
                          variant={visibleColumns.metadata ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleColumnVisibility('metadata')}
                          className="h-7 px-2 text-xs"
                        >
                          <Database className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Active Filters */}
                    {activeFilters.length > 0 && (
                      <div className="pt-2 border-t border-border">
                        <div className="flex flex-wrap gap-1 items-center">
                          <span className="text-xs font-medium text-muted-foreground">Filtri attivi:</span>
                          {activeFilters.map((filter, index) => (
                            <Badge key={index} variant="secondary" className="cursor-pointer text-xs h-6" onClick={() => removeFilter(index)}>
                              {filter.displayValue} ×
                            </Badge>
                          ))}
                          <Button variant="outline" size="sm" onClick={clearAllFilters} className="h-6 px-2 text-xs">
                            Pulisci tutti
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>


      {/* Data */}
      {isMobile ? (
        /* Mobile Card Layout */
        <div className="space-y-1">
          {/* Sort Dropdown - Center */}
          {viewingRecords.length > 0 && (
            <div className="flex justify-center">
              <Card className="border-0 shadow-none w-fit bg-transparent">
                <CardContent className="p-2 pb-[10px] -mt-5">
                  <div className="flex items-center gap-2">
                    {/* Create Activity button - only show when contacts are selected */}
                    {selectedRecords.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-transparent"
                        onClick={() => setShowMultipleActivityDialog(true)}
                        title={`Crea attività per ${selectedRecords.size} contatti selezionati`}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                    <Select
                      value={sortConfig.primary?.column || ""}
                      onValueChange={(value) => {
                        if (value) {
                          setSortConfig({
                            primary: { column: value, direction: 'asc' },
                            secondary: null
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs w-auto min-w-[120px]">
                        <SelectValue placeholder="Ordina per" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="azienda">Azienda</SelectItem>
                        <SelectItem value="nome">Nome</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="telefono">Telefono</SelectItem>
                        <SelectItem value="citta">Città</SelectItem>
                        <SelectItem value="paese">Paese</SelectItem>
                        <SelectItem value="created_at">Data creazione</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Delete button - only show when contacts are selected */}
                    {selectedRecords.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-transparent"
                        onClick={deleteSelectedContacts}
                        title={`Elimina ${selectedRecords.size} contatti selezionati`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {loadingAllRecords ? (
            <Card className="border-card shadow-soft bg-card-transparent">
              <CardContent className="flex items-center justify-center h-32 p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : viewingRecords.length === 0 ? (
            <Card className="border-card shadow-soft bg-card-transparent">
              <CardContent className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Nessun contatto trovato</h3>
                <p className="text-sm">
                  Prova a modificare i filtri di ricerca
                </p>
              </CardContent>
            </Card>
           ) : (
             <>
           {/* Mobile Controls */}
                 {viewingRecords.length > 0 && (
                   <Card className="border-card shadow-soft bg-card-transparent">
                    <CardContent className="p-1.5 space-y-1 mb-4">
                      {/* Checkbox Seleziona tutto */}
                      <div className="flex items-center justify-between px-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={
                              viewingRecords.length > 0 && 
                              viewingRecords.every((_, index) => selectedRecords.has(currentPage * recordsPerPage + index))
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                const newSelected = new Set(selectedRecords);
                                viewingRecords.forEach((_, index) => {
                                  newSelected.add(currentPage * recordsPerPage + index);
                                });
                                setSelectedRecords(newSelected);
                              } else {
                                const newSelected = new Set(selectedRecords);
                                viewingRecords.forEach((_, index) => {
                                  newSelected.delete(currentPage * recordsPerPage + index);
                                });
                                setSelectedRecords(newSelected);
                              }
                            }}
                          />
                          <span className="text-sm font-medium">
                            Full Page ({viewingRecords.length})
                          </span>
                        </div>
                        {selectedRecords.size > 0 && (
                          <span className="text-xs text-blue-600 font-medium">
                            {selectedRecords.size} selezionati
                          </span>
                        )}
                      </div>
                      
                       {/* Actions Bar Mobile - Always visible to prevent layout shift */}
                       <div className="space-y-2 pt-1 border-t border-border">
                       </div>
                   </CardContent>
                 </Card>
                 )}
                
                {/* Mobile Pagination - Top */}
                {totalPages > 1 && (
                  <Card className="border-card shadow-soft bg-card-transparent">
                    <CardContent className="p-2">
                      <div className="flex flex-col gap-1">
                        <div className="text-xs text-muted-foreground text-center">
                          Pagina {currentPage + 1} di {totalPages}
                        </div>
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                            disabled={currentPage === 0}
                            className="h-8 text-xs"
                          >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Precedente
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                            disabled={currentPage >= totalPages - 1}
                            className="h-8 text-xs"
                          >
                            Successiva
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {viewingRecords.map((record, index) => {
              const actualIndex = currentPage * recordsPerPage + index;
              return (
                <ContactMobileCard
                  key={record.id || index}
                  contact={record}
                  index={actualIndex}
                  isSelected={selectedRecords.has(actualIndex)}
                  visibleColumns={visibleColumns}
                  getCompanyActivities={getCompanyActivities}
                  onSelect={(index, selected) => {
                    const newSelected = new Set(selectedRecords);
                    if (selected) {
                      newSelected.add(index);
                    } else {
                      newSelected.delete(index);
                    }
                    setSelectedRecords(newSelected);
                  }}
                  onView={() => {
                    setSelectedRecord(record);
                    setSelectedRecordIndex(actualIndex);
                    setShowRecordDetail(true);
                  }}
                  onCreateActivity={() => {
                    // Temporarily select this record and open activity dialog
                    setSelectedRecords(new Set([actualIndex]));
                    setShowMultipleActivityDialog(true);
                  }}
                />
              );
             })}
             </>
           )}

           {/* Mobile Pagination */}
           {totalPages > 1 && (
             <Card className="border-card shadow-soft bg-card-transparent">
               <CardContent className="p-2">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-muted-foreground text-center">
                      Pagina {currentPage + 1} di {totalPages}
                    </div>
                   <div className="flex justify-center gap-2">
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                       disabled={currentPage === 0}
                       className="h-8 text-xs"
                     >
                       <ChevronLeft className="h-4 w-4 mr-1" />
                       Precedente
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                       disabled={currentPage >= totalPages - 1}
                       className="h-8 text-xs"
                     >
                       Successiva
                       <ChevronRight className="h-4 w-4 ml-1" />
                     </Button>
                   </div>
                 </div>
               </CardContent>
             </Card>
           )}
        </div>
      ) : (
        /* Desktop Table Layout */
        <Card className="border-card shadow-soft bg-transparent">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Commerciale ({filteredRecords.length})
              </CardTitle>
              
              {/* Barra azioni multiple - solo quando ci sono record selezionati */}
              {selectedRecords.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {selectedRecords.size} selezionati
                  </Badge>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowMultipleActivityDialog(true)}
                          className="h-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Crea Attività
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Crea attività per {selectedRecords.size} contatti</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={deleteSelectedContacts}
                          className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Elimina
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Elimina {selectedRecords.size} contatti</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingAllRecords ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : viewingRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Nessun contatto trovato</h3>
                <p className="text-sm">
                  Prova a modificare i filtri di ricerca
                </p>
              </div>
            ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            viewingRecords.length > 0 && 
                            viewingRecords.every((_, index) => selectedRecords.has(currentPage * recordsPerPage + index))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const newSelected = new Set(selectedRecords);
                              viewingRecords.forEach((_, index) => {
                                newSelected.add(currentPage * recordsPerPage + index);
                              });
                              setSelectedRecords(newSelected);
                            } else {
                              const newSelected = new Set(selectedRecords);
                              viewingRecords.forEach((_, index) => {
                                newSelected.delete(currentPage * recordsPerPage + index);
                              });
                              setSelectedRecords(newSelected);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <FileText className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Clicca l'icona per vedere le note</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('nome')}
                            className="h-auto p-0 font-medium flex items-center gap-1"
                          >
                            Nome {getSortIcon('nome')}
                          </Button>
                        </div>
                      </TableHead>
                      {visibleColumns.company && (
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('azienda')}
                            className="h-auto p-0 font-medium flex items-center gap-1"
                          >
                            Azienda {getSortIcon('azienda')}
                          </Button>
                        </TableHead>
                      )}
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('email')}
                          className="h-auto p-0 font-medium flex items-center gap-1"
                        >
                          Email {getSortIcon('email')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('telefono')}
                          className="h-auto p-0 font-medium flex items-center gap-1"
                        >
                          Telefono {getSortIcon('telefono')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('cellulare')}
                          className="h-auto p-0 font-medium flex items-center gap-1"
                        >
                          Cellulare {getSortIcon('cellulare')}
                        </Button>
                      </TableHead>
                      {visibleColumns.details && (
                        <>
                          <TableHead>Città</TableHead>
                        </>
                      )}
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('paese')}
                          className="h-auto p-0 font-medium flex items-center gap-1"
                        >
                          Paese {getSortIcon('paese')}
                        </Button>
                      </TableHead>
                      {visibleColumns.metadata && (
                        <>
                          <TableHead>Tags</TableHead>
                          <TableHead>Origine</TableHead>
                          <TableHead>Stato</TableHead>
                        </>
                      )}
                      <TableHead className="w-20">Attività</TableHead>
                      <TableHead className="w-24">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingRecords.map((record, index) => {
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
                          key={record.id || index}
                          className={cn("hover:bg-muted/50 relative", rowBgColor)}
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
                          <TableCell>
                            <div className="flex items-center gap-2 relative z-10">
                              {record.note && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <FileText 
                                        className="h-3 w-3 text-blue-500 cursor-pointer hover:text-blue-700" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toast.info(record.note);
                                        }}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Clicca per vedere le note</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <div 
                                className="flex flex-col cursor-pointer hover:bg-primary/10 text-primary font-medium rounded p-1 relative z-10"
                                onClick={() => handleRecordClick(record, index)}
                                title="Clicca per aprire dettaglio record"
                              >
                                <span className="font-medium">{formatCellValue(record.nome)}</span>
                                {record.responsabile && record.responsabile !== record.nome && (
                                  <span className="text-sm text-muted-foreground">{formatCellValue(record.responsabile)}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          {visibleColumns.company && (
                            <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="cursor-pointer relative z-10" onClick={() => addFilter('azienda', record.azienda)}>
                                      {formatCellValue(record.azienda)}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Clicca per filtrare per questa azienda</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex items-center gap-1 relative z-10">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {formatCellValue(record.email)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 relative z-10">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {formatCellValue(record.telefono)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 relative z-10">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {formatCellValue(record.cellulare)}
                            </div>
                          </TableCell>
                          {visibleColumns.details && (
                            <>
                              <TableCell>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="cursor-pointer flex items-center gap-1" onClick={() => addFilter('citta', record.citta)}>
                                        <MapPin className="h-3 w-3 text-muted-foreground" />
                                        {formatCellValue(record.citta)}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Clicca per filtrare per questa città</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div 
                                    className="cursor-pointer flex items-center gap-1" 
                                    onClick={() => addFilter('paese', record.paese)}
                                  >
                                    <span className="text-lg">{getCountryFlag(record.paese)}</span>
                                    <span className="text-xs">{formatCellValue(record.paese)}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Clicca per filtrare per questo paese</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          {visibleColumns.metadata && (
                            <>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {record.tags && record.tags.length > 0 ? (
                                    record.tags.slice(0, 2).map((tag: string, tagIndex: number) => (
                                      <TooltipProvider key={tagIndex}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge 
                                              variant="secondary" 
                                              className="text-xs cursor-pointer"
                                              onClick={() => addFilter('tags', tag)}
                                            >
                                              <Tag className="h-2 w-2 mr-1" />
                                              {tag}
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Clicca per filtrare per questo tag</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                  {record.tags && record.tags.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{record.tags.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="cursor-pointer" onClick={() => addFilter('origine', record.origine)}>
                                        {formatCellValue(record.origine)}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Clicca per filtrare per questa origine</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge 
                                        variant={record.stato === 'A' ? 'default' : 'secondary'} 
                                        className="cursor-pointer"
                                        onClick={() => addFilter('stato', record.stato)}
                                      >
                                        {record.stato === 'A' ? 'Attivo' : record.stato}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Clicca per filtrare per questo stato</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                            </>
                          )}
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
                            <div className="flex gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleRecordClick(record, index)}
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Visualizza dettagli</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-red-500 hover:text-red-700"
                                      onClick={() => deleteContact(record.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Elimina contatto</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Pagina {currentPage + 1} di {totalPages} 
                    ({filteredRecords.length} risultati totali)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Precedente
                    </Button>
                    <span className="text-sm">
                      {currentPage + 1} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                      disabled={currentPage >= totalPages - 1}
                    >
                      Successiva
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      )}

      {/* Record Detail Dialog */}
      <Dialog open={showRecordDetail} onOpenChange={setShowRecordDetail}>
        <DialogContent className={cn("max-h-[85vh] overflow-y-auto", isMobile ? "max-w-[95vw] p-4" : "max-w-4xl")}>
          <DialogHeader>
            <DialogTitle className={cn("flex items-center justify-between", isMobile && "flex-col gap-3")}>
              <span className={cn(isMobile ? "text-center" : "")}>Dettagli Contatto</span>
              <div className={cn("flex gap-2", isMobile && "justify-center w-full")}>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "sm"}
                  onClick={handlePrevRecord}
                  disabled={selectedRecordIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {!isMobile && "Prec"}
                </Button>
                <span className={cn("text-sm text-muted-foreground flex items-center", isMobile ? "px-3" : "")}>
                  {selectedRecordIndex + 1} di {viewingRecords.length}
                </span>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "sm"}
                  onClick={handleNextRecord}
                  disabled={selectedRecordIndex >= viewingRecords.length - 1}
                >
                  {!isMobile && "Succ"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecord && (
            <RecordDetailLayout
              record={selectedRecord}
              formatCellValue={formatCellValue}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog per attività multiple */}
      <Dialog open={showMultipleActivityDialog} onOpenChange={(open) => {
        setShowMultipleActivityDialog(open);
        // Cleanup scroll lock when dialog closes
        if (!open) {
          document.body.style.overflow = '';
          document.body.removeAttribute('data-scroll-locked');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Crea Attività Multiple</DialogTitle>
            <DialogDescription>
              Crea una nuova attività per tutte le aziende selezionate
            </DialogDescription>
          </DialogHeader>
          
          {showMultipleActivityDialog && (
            <AdvancedMultipleActivityForm
              contacts={Array.from(selectedRecords).map(index => {
                const record = allRecords[index];
                return {
                  id: record.id,
                  company_name: record.azienda,
                  company_alias: record.alias,
                  name: record.nome,
                  alias: record.responsabile,
                  email: record.email,
                  phone: record.telefono,
                  cell: record.cellulare
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
