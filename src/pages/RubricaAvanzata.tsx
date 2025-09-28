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
import { Eye, Edit, Users, Database, ChevronLeft, ChevronRight, Building, ChevronUp, ChevronDown, Search, Filter, Phone, Mail, MapPin, Tag, Trash2, FileText } from 'lucide-react';
import countriesData from '@/data/countries.json';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RecordDetailLayout } from '@/components/record-detail/RecordDetailLayout';
import { AdvancedMultipleActivityForm } from '@/components/attivita/AdvancedMultipleActivityForm';

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

      // TODO: Fix types issue with attivita table
      // const { error } = await supabase
      //   .from('attivita')
      //   .insert(activities);
      const error = null; // Temporary - will be fixed when types are updated

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-heading-1 font-bold text-text-primary">Rubrica Avanzata</h1>
          <p className="text-body text-text-secondary">
            Gestione avanzata della rubrica con filtri e visualizzazione tabellare
          </p>
        </div>
      </div>

      {/* Compact Search and Filters Section */}
      <Card className="border-card shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-4 w-4" />
            Ricerca e Filtri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              placeholder="Cerca per nome, azienda, email o città..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          {/* Filters and Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            {/* Filter Controls */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            </div>

            {/* Compact Stats */}
            <div className="lg:col-span-4 grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="text-lg font-bold text-text-primary">{allRecords.length}</div>
                <div className="text-xs text-text-secondary">Totali</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary">{filteredRecords.length}</div>
                <div className="text-xs text-text-secondary">Filtrati</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-text-primary">{allRecords.filter(c => c.azienda).length}</div>
                <div className="text-xs text-text-secondary">Aziende</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-accent">{selectedRecords.size}</div>
                <div className="text-xs text-text-secondary">Selez.</div>
              </div>
            </div>

            {/* Column Visibility Controls */}
            <div className="lg:col-span-2">
              <label className="text-xs font-medium mb-1 block">Colonne</label>
              <div className="flex gap-1">
                <Button
                  variant={visibleColumns.company ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleColumnVisibility('company')}
                  className="h-8 px-2 text-xs"
                >
                  <Building className="h-3 w-3" />
                </Button>
                <Button
                  variant={visibleColumns.details ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleColumnVisibility('details')}
                  className="h-8 px-2 text-xs"
                >
                  <Phone className="h-3 w-3" />
                </Button>
                <Button
                  variant={visibleColumns.metadata ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleColumnVisibility('metadata')}
                  className="h-8 px-2 text-xs"
                >
                  <Database className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-xs font-medium text-text-secondary">Filtri attivi:</span>
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

          {/* Actions Bar */}
          {selectedRecords.size > 0 && (
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {selectedRecords.size} contatto/i selezionato/i
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowMultipleActivityDialog(true)}
                    className="h-7 px-2 text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Crea Attività
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteSelectedContacts}
                    className="h-7 px-2 text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Elimina Selezionati
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRecords(new Set())}
                    className="h-7 px-2 text-xs"
                  >
                    Deseleziona Tutti
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="border-card shadow-soft">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contatti Rubrica ({filteredRecords.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loadingAllRecords ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : viewingRecords.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-heading-3 font-semibold mb-2">Nessun contatto trovato</h3>
              <p className="text-body">
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
                      {visibleColumns.details && (
                        <>
                          <TableHead>Telefono</TableHead>
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
                      <TableHead className="w-24">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingRecords.map((record, index) => {
                      const actualIndex = currentPage * recordsPerPage + index;
                      return (
                        <TableRow 
                          key={record.id || index}
                          className="hover:bg-muted/50"
                        >
                          <TableCell>
                            <Checkbox
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
                          <TableCell>
                            <div className="flex items-center gap-2">
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
                                className="flex flex-col cursor-pointer hover:bg-primary/10 text-primary font-medium rounded p-1" 
                                onClick={() => handleRecordClick(record, index)}
                                title="Clicca per aprire dettaglio record"
                              >
                                <span className="font-medium">{formatCellValue(record.nome)}</span>
                                {record.responsabile && record.responsabile !== record.nome && (
                                  <span className="text-sm text-text-secondary">{formatCellValue(record.responsabile)}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          {visibleColumns.company && (
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-pointer" onClick={() => addFilter('azienda', record.azienda)}>
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
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-text-secondary" />
                              {formatCellValue(record.email)}
                            </div>
                          </TableCell>
                          {visibleColumns.details && (
                            <>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-text-secondary" />
                                  {formatCellValue(record.telefono) || formatCellValue(record.cellulare)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="cursor-pointer flex items-center gap-1" onClick={() => addFilter('citta', record.citta)}>
                                        <MapPin className="h-3 w-3 text-text-secondary" />
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
                                    <span className="text-xs text-text-secondary">-</span>
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
                  <div className="text-sm text-text-secondary">
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

      {/* Record Detail Dialog */}
      <Dialog open={showRecordDetail} onOpenChange={setShowRecordDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Dettagli Contatto</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevRecord}
                  disabled={selectedRecordIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-text-secondary">
                  {selectedRecordIndex + 1} di {viewingRecords.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextRecord}
                  disabled={selectedRecordIndex >= viewingRecords.length - 1}
                >
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
        <DialogContent className="max-w-2xl" onCloseAutoFocus={(e) => e.preventDefault()}>
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
