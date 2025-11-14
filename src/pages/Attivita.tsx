import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Calendar, Clock, User, CheckCircle, AlertCircle, Pause, X, Settings, Trash2, Phone, Mail, Users, FileText, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, CalendarIcon, EyeOff, Eye, SearchCheck, SearchX, Database, Circle, Pickaxe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AdvancedMultipleActivityForm } from '@/components/attivita/AdvancedMultipleActivityForm';
import { ActivityFilters } from '@/components/attivita/ActivityFilters';
import { ActivityMobileCard } from '@/components/attivita/ActivityMobileCard';
import { GestisciAttivitaDialog } from '@/components/attivita/GestisciAttivitaDialog';
import { CompanyDialog } from '@/components/attivita/CompanyDialog';
import { CallDialog } from '@/components/attivita/CallDialog';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UnifiedAICommunicationBadge } from '@/components/ai/UnifiedAICommunicationBadge';
import { Brain } from 'lucide-react';
import { EmailQueueBadge } from '@/components/email-campagne/EmailQueueBadge';

interface Activity {
  id: string;
  rubrica_id?: string;
  rubrica_nome?: string;
  rubrica_azienda?: string;
  rubrica_origine?: string;
  rubrica_paese?: string;
  rubrica_citta?: string;
  rubrica_alias?: string;
  rubrica_company_alias?: string;
  rubrica_state?: string;
  tipo: 'chiamata' | 'meeting' | 'email' | 'task';
  descrizione: string;
  stato: 'aperta' | 'in_corso' | 'completata' | 'annullata';
  scadenza?: string;
  priorita: 'alta' | 'media' | 'bassa';
  assegnato_a?: string;
  assegnato_nome?: string;
  creato_da?: string;
  data_creazione: string;
  note?: string;
  ora_creazione?: string;
  data_ultima_modifica?: string;
  modifiche_log?: any[];
  selezionata?: boolean;
  cellulare?: string;
  telefono?: string;
  contact_source?: 'rubrica' | 'imported_contacts';
}

const TIPO_LABELS = {
  chiamata: 'Chiamata',
  meeting: 'Meeting',
  email: 'Email',
  task: 'Task'
};

const STATO_LABELS = {
  aperta: 'Aperta',
  in_corso: 'In Corso',
  completata: 'Completata',
  annullata: 'Annullata'
};

const PRIORITA_LABELS = {
  alta: 'Alta',
  media: 'Media',
  bassa: 'Bassa'
};

export default function Attivita() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isGestisciOpen, setIsGestisciOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof Activity>('data_creazione');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [multipleContacts, setMultipleContacts] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    stato: 'aperta,in_corso', // Default: mostra solo attività da svolgere
    tipo: '',
    priorita: '',
    scadenza: '',
    hasNotes: false,
    origine: '',
    myActivitiesOnly: false
  });
  const [statusFilter, setStatusFilter] = useState<string>('future'); // Default: mostra attività future/da svolgere
  const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true); // Clean_Top pattern: controls header visibility
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false); // Controls search card visibility
  const [currentPage, setCurrentPage] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(25);
  const scrollPositionRef = useRef<number>(0);
  const [filterByContactId, setFilterByContactId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const openAIChat = () => {
    navigate('/chat?page=/attivita');
  };

  useEffect(() => {
    loadActivities();
    
    // Carica l'ID utente corrente
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
    
    // Gestione filtro per contatto dalla navigazione
    if (location.state?.filterByContact) {
      setFilterByContactId(location.state.filterByContact);
      setStatusFilter('all'); // Mostra tutte le attività per questo contatto
      toast({
        title: "Filtro applicato",
        description: "Visualizzazione attività per contatto selezionato",
      });
    }
  }, [location.state]);

  // Funzione per tornare a Record Importati
  const handleBackNavigation = () => {
    // Torna sempre alla pagina import-templates con openRecordsDialog
    navigate('/import-templates', { 
      state: { openRecordsDialog: true }
    });
  };

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      
      // Carica le attività
      const { data: attivitaData, error: attivitaError } = await supabase
        .from('attivita')
        .select('*')
        .order('data_creazione', { ascending: false });

      if (attivitaError) throw attivitaError;

      // Recupera tutti i contatti (sia da rubrica che imported_contacts)
      const rubricaIds = [...new Set(attivitaData?.map(a => a.rubrica_id).filter(Boolean))];
      
      let contactsMap = new Map<string, {contact: any, source: 'rubrica' | 'imported_contacts'}>();
      
      if (rubricaIds.length > 0) {
        // Carica da rubrica
        const { data: rubricaData } = await supabase
          .from('rubrica')
          .select('id, nome, azienda, origine, paese, citta, telefono, cellulare, alias, company_alias, state')
          .in('id', rubricaIds);
        
        rubricaData?.forEach(contact => {
          contactsMap.set(contact.id, { contact, source: 'rubrica' });
        });
        
        // Carica da imported_contacts (solo quelli non trovati in rubrica)
        const notFoundInRubrica = rubricaIds.filter(id => !contactsMap.has(id));
        
        if (notFoundInRubrica.length > 0) {
          const { data: importedData } = await supabase
            .from('imported_contacts')
            .select('id, name, company_name, origin, country, city, phone, cell, alias, company_alias, state')
            .in('id', notFoundInRubrica);
          
          importedData?.forEach(contact => {
            contactsMap.set(contact.id, {
              contact: {
                id: contact.id,
                nome: contact.name,
                azienda: contact.company_name,
                origine: contact.origin,
                paese: contact.country,
                citta: contact.city,
                telefono: contact.phone,
                cellulare: contact.cell,
                alias: contact.alias,
                company_alias: contact.company_alias,
                state: contact.state
              },
              source: 'imported_contacts'
            });
          });
        }
      }

      const formattedActivities: Activity[] = (attivitaData || []).map(activity => {
        const contactData = activity.rubrica_id ? contactsMap.get(activity.rubrica_id) : null;
        const contact = contactData?.contact;
        const source = contactData?.source;
        
        return {
          id: activity.id,
          rubrica_id: activity.rubrica_id,
          rubrica_nome: contact?.nome,
          rubrica_azienda: contact?.azienda,
          rubrica_origine: contact?.origine,
          rubrica_paese: contact?.paese,
          rubrica_citta: contact?.citta,
          rubrica_alias: contact?.alias,
          rubrica_company_alias: contact?.company_alias,
          rubrica_state: contact?.state,
          telefono: contact?.telefono,
          cellulare: contact?.cellulare,
          contact_source: source,
          tipo: activity.tipo as Activity['tipo'],
          descrizione: activity.descrizione,
          stato: activity.stato as Activity['stato'],
          scadenza: activity.scadenza,
          priorita: activity.priorita as Activity['priorita'],
          assegnato_a: activity.assegnato_a,
          assegnato_nome: null,
          creato_da: activity.creato_da,
          data_creazione: activity.data_creazione,
          note: activity.note,
          ora_creazione: activity.ora_creazione,
          data_ultima_modifica: activity.data_ultima_modifica,
          modifiche_log: Array.isArray(activity.modifiche_log) ? activity.modifiche_log : [],
          selezionata: activity.selezionata || false
        };
      });

      setActivities(formattedActivities);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile caricare le attività",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get activity type icon
  const getActivityIcon = (tipo: string) => {
    switch (tipo) {
      case 'chiamata': return Phone;
      case 'email': return Mail;
      case 'meeting': return Users;
      case 'task': return FileText;
      default: return FileText;
    }
  };

  // Determina se l'attività è futura o passata
  const isActivityFuture = (activity: Activity) => {
    if (!activity.scadenza) return false;
    return new Date(activity.scadenza) > new Date();
  };

  // Classifica attività: future = in sospeso, passate = completate
  const getActivityStatus = (activity: Activity) => {
    const isFuture = isActivityFuture(activity);
    if (isFuture) {
      return activity.stato === 'completata' ? 'programmata' : 'in sospeso';
    } else {
      return activity.stato === 'completata' ? 'completata' : 'scaduta';
    }
  };

  // Sorting function
  const handleSort = (field: keyof Activity) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Selection functions
  const handleActivitySelect = (activityId: string, selected: boolean) => {
    if (selected) {
      setSelectedActivities(prev => [...prev, activityId]);
    } else {
      setSelectedActivities(prev => prev.filter(id => id !== activityId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedActivities(filteredActivities.map(a => a.id));
    } else {
      setSelectedActivities([]);
    }
  };

  // Status filter functions per i summary cards
  const handleStatusFilter = (status: string) => {
    // Salva la posizione di scroll prima di cambiare il filtro
    scrollPositionRef.current = window.scrollY;
    setStatusFilter(status);
    setSelectedActivities([]); // Reset selezione quando cambia filtro
  };

  // Usa useLayoutEffect per ripristinare la posizione di scroll prima che il browser dipinga
  useLayoutEffect(() => {
    if (scrollPositionRef.current > 0) {
      window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
      scrollPositionRef.current = 0;
    }
  }, [statusFilter]);

  // Date filter function
  const handleDateFilter = (date: Date | undefined) => {
    setFilterDate(date);
  };

  // Filtri base (escludendo statusFilter dalle card) per calcolare le statistiche
  const baseFilteredActivities = activities.filter(activity => {
    const matchesSearch = activity.descrizione.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.rubrica_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.rubrica_azienda?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.rubrica_citta?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.rubrica_state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.rubrica_alias?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.rubrica_company_alias?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.rubrica_origine?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.rubrica_id?.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro per contatto specifico
    const matchesContact = !filterByContactId || activity.rubrica_id === filterByContactId;

    // Filtro per attività dell'agente loggato
    const matchesMyActivities = !filters.myActivitiesOnly || 
      (currentUserId && activity.assegnato_a === currentUserId);

    // Gestione filtro stato multiplo (es: "aperta,in_corso") o "all"
    const matchesStato = !filters.stato || filters.stato === 'all' || 
      filters.stato.split(',').includes(activity.stato);
    
    const matchesFilters = 
      matchesStato &&
      (!filters.tipo || filters.tipo === 'all' || activity.tipo === filters.tipo) &&
      (!filters.priorita || filters.priorita === 'all' || activity.priorita === filters.priorita) &&
      (!filters.scadenza || filters.scadenza === 'all' || checkScadenzaFilter(activity.scadenza, filters.scadenza)) &&
      (!filters.hasNotes || (activity.note && activity.note.trim() !== '')) &&
      (!filters.origine || filters.origine === 'all' || activity.rubrica_origine === filters.origine);

    const matchesDateFilter = !filterDate || 
      (activity.scadenza && format(new Date(activity.scadenza), 'yyyy-MM-dd') === format(filterDate, 'yyyy-MM-dd'));

    return matchesSearch && matchesContact && matchesMyActivities && matchesFilters && matchesDateFilter;
  });

  // Filtri completi (includendo statusFilter dalle card) per la visualizzazione
  const filteredActivities = baseFilteredActivities.filter(activity => {
    // Filtro per status dalla card summary
    const matchesStatusFilter = statusFilter === 'all' || 
      (statusFilter === 'future' && isActivityFuture(activity)) ||
      (statusFilter === 'completate' && activity.stato === 'completata') ||
      (statusFilter === 'in_corso' && activity.stato === 'in_corso') ||
      (statusFilter === 'scadute' && activity.scadenza && new Date(activity.scadenza) < new Date() && activity.stato !== 'completata');

    return matchesStatusFilter;
  }).sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Paginazione
  const totalPages = Math.ceil(filteredActivities.length / recordsPerPage);
  const paginatedActivities = filteredActivities.slice(
    currentPage * recordsPerPage,
    (currentPage + 1) * recordsPerPage
  );

  // Debug per mobile
  console.log('🔍 DEBUG PAGINATION:', {
    filteredActivitiesCount: filteredActivities.length,
    recordsPerPage,
    totalPages,
    currentPage,
    isMobile,
    shouldShowPagination: totalPages > 1
  });

  const checkScadenzaFilter = (scadenza: string | undefined, filter: string) => {
    if (!scadenza) return filter === 'senza_scadenza';
    
    const today = new Date();
    const scadenzaDate = new Date(scadenza);
    const diffTime = scadenzaDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (filter) {
      case 'scadute':
        return diffDays < 0;
      case 'oggi':
        return diffDays === 0;
      case 'domani':
        return diffDays === 1;
      case 'questa_settimana':
        return diffDays >= 0 && diffDays <= 7;
      default:
        return true;
    }
  };

  const handleAddActivity = async (activityData: any) => {
    try {
      console.log('📝 Tentativo creazione attività:', activityData);
      
      let descrizione = '';
      let tipo = activityData.tipo;
      
      if (activityData.tipo === 'email') {
        if (!activityData.oggetto_email || !activityData.testo_email) {
          toast({
            title: "Campi mancanti",
            description: "Compila oggetto e testo dell'email per continuare.",
            variant: "destructive"
          });
          return;
        }
        descrizione = `Email: ${activityData.oggetto_email || 'Nessun oggetto'}`;
      } else if (activityData.tipo === 'chiamata') {
        if (!activityData.note_generali || activityData.note_generali.trim().length === 0) {
          toast({
            title: "Campi mancanti",
            description: "Compila le note della chiamata per continuare.",
            variant: "destructive"
          });
          return;
        }
        descrizione = `Chiamata: ${activityData.note_generali || 'Nessuna descrizione'}`;
      }

      const { data, error } = await supabase
        .from('attivita')
        .insert([{
          tipo: tipo,
          descrizione: descrizione,
          stato: 'aperta',
          scadenza: null,
          priorita: activityData.priorita || 'media',
          assegnato_a: null,
          creato_da: null,
          rubrica_id: null
        }])
        .select();

      if (error) {
        console.error('❌ Errore creazione attività:', error);
        throw error;
      }
      
      console.log('✅ Attività creata con successo:', data);
      
      setIsFormOpen(false);
      setSelectedActivity(null);
      await loadActivities();
      
      toast({
        title: "Attività creata",
        description: "L'attività è stata creata con successo.",
      });
    } catch (error: any) {
      console.error('❌ Errore catch:', error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione dell'attività.",
        variant: "destructive"
      });
    }
  };

  const handleMultipleActivities = async (activityData: any) => {
    try {
      console.log('📝 Creazione attività multiple per:', multipleContacts);
      
      if (multipleContacts.length === 0) {
        toast({
          title: "Errore",
          description: "Nessun contatto selezionato per creare attività multiple",
          variant: "destructive"
        });
        return;
      }

      let descrizione = '';
      let tipo = activityData.tipo;
      
      if (activityData.tipo === 'email') {
        if (!activityData.oggetto_email || !activityData.testo_email) {
          toast({
            title: "Campi mancanti",
            description: "Compila oggetto e testo dell'email per continuare.",
            variant: "destructive"
          });
          return;
        }
        descrizione = `Email: ${activityData.oggetto_email || 'Nessun oggetto'}`;
      } else if (activityData.tipo === 'chiamata') {
        if (!activityData.note_generali || activityData.note_generali.trim().length === 0) {
          toast({
            title: "Campi mancanti",
            description: "Compila le note della chiamata per continuare.",
            variant: "destructive"
          });
          return;
        }
        descrizione = `Chiamata: ${activityData.note_generali || 'Nessuna descrizione'}`;
      }

      // Crea un'attività per ogni contatto selezionato
      const activitiesToCreate = multipleContacts.map(contact => ({
        tipo: tipo,
        descrizione: descrizione,
        stato: 'aperta',
        scadenza: null,
        priorita: activityData.priorita || 'media',
        assegnato_a: null,
        creato_da: null,
        rubrica_id: contact.id
      }));

      const { data, error } = await supabase
        .from('attivita')
        .insert(activitiesToCreate)
        .select();

      if (error) {
        console.error('❌ Errore creazione attività multiple:', error);
        throw error;
      }
      
      console.log('✅ Attività multiple create con successo:', data);
      
      setIsFormOpen(false);
      setMultipleContacts([]);
      setSelectedActivities([]);
      await loadActivities();
      
      toast({
        title: "Attività create",
        description: `${data.length} attività create con successo per i contatti selezionati.`,
      });
    } catch (error: any) {
      console.error('❌ Errore catch:', error);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione delle attività.",
        variant: "destructive"
      });
    }
  };


  const handleEditActivity = async (activityData: any) => {
    if (!selectedActivity) return;

    try {
      let descrizione = '';
      let tipo = activityData.tipo;
      
      if (activityData.tipo === 'email') {
        descrizione = `Email: ${activityData.oggetto_email || 'Nessun oggetto'}`;
      } else if (activityData.tipo === 'chiamata') {
        descrizione = `Chiamata: ${activityData.note_generali || 'Nessuna descrizione'}`;
      }

      const { error } = await supabase
        .from('attivita')
        .update({
          tipo: tipo,
          descrizione: descrizione,
          priorita: activityData.priorita || 'media'
        })
        .eq('id', selectedActivity.id);

      if (error) throw error;

      setIsFormOpen(false);
      setSelectedActivity(null);
      await loadActivities();
      
      toast({
        title: "Attività aggiornata",
        description: "L'attività è stata aggiornata con successo.",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento dell'attività.",
        variant: "destructive"
      });
    }
  };

  const handleRescheduleSelected = async (newDate: Date) => {
    if (selectedActivities.length === 0) return;

    try {
      const { error } = await supabase
        .from('attivita')
        .update({ 
          scadenza: newDate.toISOString(),
          stato: 'aperta' // Reset to 'aperta' when rescheduling
        })
        .in('id', selectedActivities);

      if (error) throw error;

      await loadActivities();
      setSelectedActivities([]);
      
      toast({
        title: "Attività riprogrammate",
        description: `${selectedActivities.length} attività sono state riprogrammate per ${format(newDate, 'dd/MM/yyyy HH:mm')}.`,
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la riprogrammazione.",
        variant: "destructive"
      });
    }
  };

  const handleGestisciActivity = async (updates: Partial<Activity>, updateCompany?: boolean) => {
    if (!selectedActivity) return;

    try {
      // Separa i campi dell'attività da quelli della rubrica
      const activityUpdates: any = { ...updates };
      const rubricaUpdates: any = {};
      
      // Rimuovi i campi che non appartengono alla tabella attivita
      if (activityUpdates.telefono !== undefined) {
        rubricaUpdates.telefono = activityUpdates.telefono;
        delete activityUpdates.telefono;
      }
      if (activityUpdates.cellulare !== undefined) {
        rubricaUpdates.cellulare = activityUpdates.cellulare;
        delete activityUpdates.cellulare;
      }

      // Se è un'attività email che viene completata, invia l'email
      if (selectedActivity.tipo === 'email' && activityUpdates.stato === 'completata' && selectedActivity.stato !== 'completata') {
        // Estrai oggetto e testo dalla descrizione esistente
        const emailMatch = selectedActivity.descrizione.match(/Email: (.+)/);
        const oggetto = emailMatch ? emailMatch[1] : 'Nessun oggetto';
        
        // Cerca di ottenere il testo dalle note o dalla descrizione
        const testo = selectedActivity.note || 'Email inviata dalla gestione attività';
        
        // Recupera l'email del contatto se esiste rubrica_id
        let recipientEmail = '';
        if (selectedActivity.rubrica_id) {
          const { data: contact } = await supabase
            .from('rubrica')
            .select('email')
            .eq('id', selectedActivity.rubrica_id)
            .maybeSingle();
          
          if (contact?.email) {
            recipientEmail = contact.email;
            
            try {
              const { emailMessageApi } = await import('@/lib/tmwe-api-integrated');
              const response = await emailMessageApi.sendMessage({
                to: [recipientEmail],
                subject: oggetto,
                body: testo,
                body_type: 'text'
              });

              if (response?.success) {
                activityUpdates.descrizione = `✅ Email INVIATA\n\nA: ${recipientEmail}\nOggetto: ${oggetto}\nMessage ID: ${response.message_id || 'N/A'}\n\nTesto inviato:\n${testo}`;
              } else {
                activityUpdates.descrizione = `❌ Email NON INVIATA\n\nA: ${recipientEmail}\nOggetto: ${oggetto}\n\nTesto:\n${testo}`;
                activityUpdates.stato = 'aperta'; // Mantieni aperta se l'invio fallisce
              }
            } catch (err: any) {
              activityUpdates.descrizione = `❌ Email NON INVIATA - Errore: ${err.message}\n\nA: ${recipientEmail}\nOggetto: ${oggetto}\n\nTesto:\n${testo}`;
              activityUpdates.stato = 'aperta'; // Mantieni aperta se l'invio fallisce
            }
          }
        }
      }

      // Aggiorna sempre l'attività (solo con i campi validi)
      const { error } = await supabase
        .from('attivita')
        .update(activityUpdates)
        .eq('id', selectedActivity.id);

      if (error) throw error;

      // Se richiesto, aggiorna anche l'azienda nella rubrica
      if (updateCompany && selectedActivity.rubrica_id && Object.keys(rubricaUpdates).length > 0) {
        const { error: rubricaError } = await supabase
          .from('rubrica')
          .update(rubricaUpdates)
          .eq('id', selectedActivity.rubrica_id);

        if (rubricaError) {
          console.error('Errore aggiornamento rubrica:', rubricaError);
          toast({
            title: "Attività aggiornata",
            description: "L'attività è stata aggiornata ma non è stato possibile aggiornare l'azienda nella rubrica.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Aggiornamento completato",
            description: "Attività e azienda aggiornate con successo.",
          });
        }
      } else {
        toast({
          title: "Attività aggiornata",
          description: "Le modifiche sono state salvate con successo.",
        });
      }

      await loadActivities();
      setIsGestisciOpen(false);
      setSelectedActivity(null);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('attivita')
        .delete()
        .eq('id', activityId);

      if (error) throw error;

      await loadActivities();
      
      toast({
        title: "Attività eliminata",
        description: "L'attività è stata eliminata con successo.",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'eliminazione dell'attività.",
        variant: "destructive"
      });
    }
  };

  const handlePhoneClick = async (activity: Activity) => {
    if (!activity.rubrica_id) return;

    try {
      const { data: contact, error } = await supabase
        .from('rubrica')
        .select('id, nome, azienda, telefono, cellulare')
        .eq('id', activity.rubrica_id)
        .maybeSingle();

      if (error) throw error;
      
      setSelectedContact(contact);
      setIsCallDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile recuperare i dati del contatto",
        variant: "destructive"
      });
    }
  };

  const handleSaveContact = async (contactId: string, telefono: string, cellulare: string) => {
    try {
      const { error } = await supabase
        .from('rubrica')
        .update({ telefono, cellulare })
        .eq('id', contactId);

      if (error) throw error;

      // Aggiorna il contatto selezionato con i nuovi valori
      setSelectedContact(prev => ({
        ...prev,
        telefono,
        cellulare
      }));

      toast({
        title: "Contatto aggiornato",
        description: "I numeri di telefono sono stati salvati con successo.",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile salvare le modifiche al contatto",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (activityId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('attivita')
        .update({ stato: newStatus })
        .eq('id', activityId);

      if (error) throw error;

      await loadActivities();
      
      toast({
        title: "Stato aggiornato",
        description: `Lo stato dell'attività è stato cambiato in ${STATO_LABELS[newStatus as keyof typeof STATO_LABELS]}.`,
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento dello stato.",
        variant: "destructive"
      });
    }
  };

  const openGestisciForm = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsGestisciOpen(true);
  };

  const openEditForm = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsFormOpen(true);
  };

  const openAddForm = () => {
    setSelectedActivity(null);
    setIsFormOpen(true);
  };

  const openCompanyDialog = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setIsCompanyDialogOpen(true);
  };

  const getStatoBadgeVariant = (stato: string) => {
    switch (stato) {
      case 'aperta': return 'default' as const;
      case 'in_corso': return 'secondary' as const;
      case 'completata': return 'default' as const;
      case 'annullata': return 'destructive' as const;
      default: return 'default' as const;
    }
  };

  const getPrioritaBadgeVariant = (priorita: string) => {
    switch (priorita) {
      case 'alta': return 'destructive' as const;
      case 'media': return 'secondary' as const;
      case 'bassa': return 'outline' as const;
      default: return 'outline' as const;
    }
  };

  const getStatoIcon = (stato: string) => {
    switch (stato) {
      case 'aperta': return AlertCircle;
      case 'in_corso': return Clock;
      case 'completata': return CheckCircle;
      case 'annullata': return X;
      default: return AlertCircle;
    }
  };

  const getStatsData = () => {
    // Usa baseFilteredActivities per le statistiche (esclude il filtro statusFilter dalle card)
    const totali = baseFilteredActivities.length;
    const future = baseFilteredActivities.filter(a => isActivityFuture(a)).length;
    const completate = baseFilteredActivities.filter(a => a.stato === 'completata').length;
    const in_corso = baseFilteredActivities.filter(a => a.stato === 'in_corso').length;
    
    const today = new Date();
    const scadute = baseFilteredActivities.filter(a => {
      if (!a.scadenza) return false;
      return new Date(a.scadenza) < today && a.stato !== 'completata';
    }).length;

    return { totali, future, completate, in_corso, scadute };
  };

  const stats = getStatsData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Caricamento attività...</div>
      </div>
    );
  }

  console.log('🔴 ATTIVITA PAGE - filterByContactId:', filterByContactId);
  
  return (
    <>
      <div
        className={cn("section-spacing", isMobile && "space-y-4")}
      >
      {/* Pulsante Indietro - Sempre visibile quando filterByContactId è attivo */}
      {filterByContactId && (
        <div className="mb-4">
          <Button
            variant="outline"
            size="default"
            onClick={handleBackNavigation}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Indietro ai Record Importati
          </Button>
        </div>
      )}
      
      {/* Header with Title and Toggle - Clean_Top Pattern */}
      <div className="flex justify-between items-start gap-4 mb-4">
        <div>
          <h1 className="text-heading-1 font-bold text-text-primary">Gestione Attività</h1>
          {isHeaderVisible && (
            <p className="text-body text-text-secondary animate-accordion-down">
              Gestisci tutte le tue attività della rubrica
            </p>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsHeaderVisible(!isHeaderVisible)}
          className="h-8 w-8 shrink-0 mt-2.5"
        >
          {isHeaderVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Action Buttons and Filters - Clean_Top Pattern */}
      {isHeaderVisible && (
        <div className="animate-accordion-down space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              {/* Left-aligned action buttons */}
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" onClick={openAddForm} className="shadow-soft h-10 w-10">
                    <Plus className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle>
                      {multipleContacts.length > 0 
                        ? `Crea Attività Multiple (${multipleContacts.length} contatti)` 
                        : (selectedActivity ? 'Modifica Attività' : 'Nuova Attività')
                      }
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto">
                    <AdvancedMultipleActivityForm
                      contacts={multipleContacts}
                      onSubmit={
                        multipleContacts.length > 0 
                          ? handleMultipleActivities 
                          : (selectedActivity ? handleEditActivity : handleAddActivity)
                      }
                      onCancel={() => {
                        setIsFormOpen(false);
                        setMultipleContacts([]);
                      }}
                      isSubmitting={false}
                      showSaveToRubrica={false}
                    />
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10"
                onClick={() => setIsSearchVisible(!isSearchVisible)}
              >
                <Search className="h-5 w-5" />
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <CalendarIcon className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filterDate}
                    onSelect={handleDateFilter}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              
              <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <Filter className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Filtri Attività</DialogTitle>
                  </DialogHeader>
                  <ActivityFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    onClose={() => setIsFiltersOpen(false)}
                    activities={activities}
                  />
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Right-aligned AI/Settings icons */}
              <EmailQueueBadge />
              <UnifiedAICommunicationBadge pageRoute="/attivita" />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={openAIChat}
                className="h-8 w-8"
              >
                <Brain className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Card - Only when search is visible */}
          {isSearchVisible && (
            <Card className="bg-card-transparent border-card shadow-soft animate-accordion-down">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <Input
                    placeholder="Cerca per descrizione o contatto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>
          )}


          {/* Stats Cards - Under Filters */}
          {!isMobile && (
            <div className="flex justify-center">
              <div className="flex gap-2 flex-wrap justify-center">
                <Card 
                  className={cn(
                    "border-2 border-border bg-card/50 backdrop-blur-sm shadow-md cursor-pointer hover:shadow-lg transition-all",
                    statusFilter === 'all' && "ring-2 ring-primary border-primary"
                  )}
                  onClick={() => handleStatusFilter('all')}
                >
                  <CardContent className="text-center p-3 w-20">
                    <div className="font-bold text-text-primary text-xl">{stats.totali}</div>
                    <div className="text-text-secondary text-xs">Totali</div>
                  </CardContent>
                </Card>
                
                <Card 
                  className={cn(
                    "border-2 border-border bg-card/50 backdrop-blur-sm shadow-md cursor-pointer hover:shadow-lg transition-all",
                    statusFilter === 'future' && "ring-2 ring-primary border-primary"
                  )}
                  onClick={() => handleStatusFilter('future')}
                >
                  <CardContent className="text-center p-3 w-20">
                    <div className="font-bold text-orange-600 text-xl">{stats.future}</div>
                    <div className="text-text-secondary text-xs">In Sospeso</div>
                  </CardContent>
                </Card>

                <Card 
                  className={cn(
                    "border-2 border-border bg-card/50 backdrop-blur-sm shadow-md cursor-pointer hover:shadow-lg transition-all",
                    statusFilter === 'scadute' && "ring-2 ring-primary border-primary"
                  )}
                  onClick={() => handleStatusFilter('scadute')}
                >
                  <CardContent className="text-center p-3 w-20">
                    <div className="font-bold text-red-600 text-xl">{stats.scadute}</div>
                    <div className="text-text-secondary text-xs">Scadute</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Azioni per selezione multipla */}
      {selectedActivities.length > 0 && (
        <Card className="border-card shadow-soft border-blue-200">
          <CardContent className={cn(isMobile ? "p-3" : "p-4")}>
            <div className={cn("flex items-center", isMobile ? "flex-col gap-3" : "justify-between")}>
              <div className={cn("flex items-center gap-2", isMobile && "w-full justify-center")}>
                <span className="text-sm font-medium text-blue-700">
                  {selectedActivities.length} attività selezionate
                </span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size="icon"
                        onClick={() => {
                          const selectedContacts = activities
                            .filter(a => selectedActivities.includes(a.id))
                            .filter(a => a.rubrica_id)
                            .map(a => ({
                              id: a.rubrica_id!,
                              name: a.rubrica_nome || '',
                              company_name: a.rubrica_azienda || '',
                              source: a.contact_source || 'rubrica'
                            }));
                          
                          // Rimuovi duplicati per ID
                          const uniqueContacts = Array.from(
                            new Map(selectedContacts.map(c => [c.id, c])).values()
                          );
                          
                          if (uniqueContacts.length === 0) {
                            toast({
                              title: "Nessun contatto",
                              description: "Le attività selezionate non hanno contatti associati",
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          // Apri il form multiplo con i contatti
                          setMultipleContacts(uniqueContacts);
                          setSelectedActivity(null);
                          setIsFormOpen(true);
                        }}
                      >
                        <Users className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Crea Attività Multiple</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('attivita')
                        .update({ stato: 'completata' })
                        .in('id', selectedActivities);
                      
                      if (error) throw error;
                      
                      toast({
                        title: "Successo",
                        description: `${selectedActivities.length} attività ${selectedActivities.length === 1 ? 'completata' : 'completate'}`,
                      });
                      
                      setSelectedActivities([]);
                      loadActivities();
                    } catch (error: any) {
                      toast({
                        title: "Errore",
                        description: error.message,
                        variant: "destructive"
                      });
                    }
                  }}
                  className="hover:bg-transparent"
                  title="Completa"
                >
                  <CheckCircle className="h-6 w-6" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="hover:bg-transparent"
                      title="Riprogramma"
                    >
                      <Calendar className="h-6 w-6" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={undefined}
                      onSelect={(date) => {
                        if (date) handleRescheduleSelected(date);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedActivities([])}
                  className="hover:bg-transparent"
                  title="Deseleziona"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activities */}
      {isMobile ? (
        /* Mobile Card Layout */
        <div className="space-y-3">
          {/* Mobile Segmented Control Filter */}
          <div className="mb-2">
            <ToggleGroup 
              type="single" 
              value={statusFilter} 
              onValueChange={(value) => value && handleStatusFilter(value)}
              className="grid grid-cols-3 w-full p-0 gap-2"
            >
              <ToggleGroupItem 
                value="all" 
                className="relative hover:bg-transparent rounded-none transition-all py-3 pb-2 data-[state=on]:after:absolute data-[state=on]:after:bottom-0 data-[state=on]:after:left-1/2 data-[state=on]:after:-translate-x-1/2 data-[state=on]:after:w-1/2 data-[state=on]:after:h-[1px] data-[state=on]:after:bg-foreground data-[state=on]:bg-transparent data-[state=off]:bg-transparent"
              >
                <div className="flex flex-col items-center gap-0.5 pb-3">
                  <span className="text-xs font-medium text-muted-foreground">Totali</span>
                  <span className="text-lg font-bold text-foreground">{baseFilteredActivities.length}</span>
                </div>
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="future" 
                className="relative hover:bg-transparent rounded-none transition-all py-3 pb-2 data-[state=on]:after:absolute data-[state=on]:after:bottom-0 data-[state=on]:after:left-1/2 data-[state=on]:after:-translate-x-1/2 data-[state=on]:after:w-1/2 data-[state=on]:after:h-[1px] data-[state=on]:after:bg-warning data-[state=on]:bg-transparent data-[state=off]:bg-transparent"
              >
                <div className="flex flex-col items-center gap-0.5 pb-3">
                  <span className="text-xs font-medium text-muted-foreground">In Sospeso</span>
                  <span className="text-lg font-bold text-foreground">
                    {baseFilteredActivities.filter(a => isActivityFuture(a) && a.stato !== 'completata').length}
                  </span>
                </div>
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="scadute" 
                className="relative hover:bg-transparent rounded-none transition-all py-3 pb-2 data-[state=on]:after:absolute data-[state=on]:after:bottom-0 data-[state=on]:after:left-1/2 data-[state=on]:after:-translate-x-1/2 data-[state=on]:after:w-1/2 data-[state=on]:after:h-[1px] data-[state=on]:after:bg-destructive data-[state=on]:bg-transparent data-[state=off]:bg-transparent"
              >
                <div className="flex flex-col items-center gap-0.5 pb-3">
                  <span className="text-xs font-medium text-muted-foreground">Scadute</span>
                  <span className="text-lg font-bold text-foreground">
                    {baseFilteredActivities.filter(a => a.scadenza && new Date(a.scadenza) < new Date() && a.stato !== 'completata').length}
                  </span>
                </div>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Selezione multipla mobile */}
          {paginatedActivities.length > 0 && (
            <Card className="border-card shadow-soft mb-4">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={
                        paginatedActivities.length > 0 && 
                        paginatedActivities.every(activity => selectedActivities.includes(activity.id))
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const newSelected = [...selectedActivities];
                          paginatedActivities.forEach(activity => {
                            if (!newSelected.includes(activity.id)) {
                              newSelected.push(activity.id);
                            }
                          });
                          setSelectedActivities(newSelected);
                        } else {
                          const pageActivityIds = paginatedActivities.map(activity => activity.id);
                          setSelectedActivities(selectedActivities.filter(id => !pageActivityIds.includes(id)));
                        }
                      }}
                    />
                    <span className="text-sm font-medium">Seleziona tutti</span>
                  </div>
                  {selectedActivities.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {selectedActivities.length} selezionati
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

           {paginatedActivities.length === 0 ? (
            <Card className="border-card shadow-soft">
              <CardContent className="p-8 text-center">
                {activities.length === 0 ? (
                  <div className="text-text-secondary">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Nessuna attività</h3>
                    <p className="text-sm mb-4">
                      Inizia creando la tua prima attività
                    </p>
                    <Button onClick={openAddForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crea Prima Attività
                    </Button>
                  </div>
                ) : (
                  <div className="text-text-secondary">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Nessun risultato</h3>
                    <p className="text-sm">
                      Prova a modificare i termini di ricerca o i filtri
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            paginatedActivities.map((activity) => (
              <ActivityMobileCard
                key={activity.id}
                activity={activity}
                index={paginatedActivities.indexOf(activity) + currentPage * recordsPerPage}
                isSelected={selectedActivities.includes(activity.id)}
                onSelect={handleActivitySelect}
                onPhoneClick={() => handlePhoneClick(activity)}
                onCompanyClick={() => activity.rubrica_id && openCompanyDialog(activity.rubrica_id)}
                onGestisci={() => openGestisciForm(activity)}
              />
            ))
           )}
          
          {/* Paginazione Mobile */}
          {totalPages > 1 && (
            <Card className="border-card shadow-soft mt-4">
              <CardContent className="p-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-text-secondary">Per pagina:</span>
                    <Select 
                      value={recordsPerPage.toString()} 
                      onValueChange={(value) => {
                        setRecordsPerPage(Number(value));
                        setCurrentPage(0);
                      }}
                    >
                      <SelectTrigger className="w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="text-center text-sm text-text-secondary">
                    {filteredActivities.length} risultati totali
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm px-3 py-1 bg-muted rounded">
                        {currentPage + 1} di {totalPages}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage >= totalPages - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Desktop Table Layout */
        <Card className="border-card shadow-soft">
          <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center"></TableHead>
                <TableHead className="w-16 text-center">Attività</TableHead>
                <TableHead className="w-16">
                  <div className="flex items-center gap-2">
                    <span>#</span>
                    <Checkbox
                      checked={
                        paginatedActivities.length > 0 && 
                        paginatedActivities.every(activity => selectedActivities.includes(activity.id))
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // Seleziona tutti gli elementi della pagina corrente
                          const newSelected = [...selectedActivities];
                          paginatedActivities.forEach(activity => {
                            if (!newSelected.includes(activity.id)) {
                              newSelected.push(activity.id);
                            }
                          });
                          setSelectedActivities(newSelected);
                        } else {
                          // Deseleziona tutti gli elementi della pagina corrente
                          const pageActivityIds = paginatedActivities.map(activity => activity.id);
                          setSelectedActivities(selectedActivities.filter(id => !pageActivityIds.includes(id)));
                        }
                      }}
                    />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 w-20 text-center" 
                  onClick={() => handleSort('tipo')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Tipo
                    {sortField === 'tipo' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-20 text-center">Azioni</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('rubrica_nome')}
                >
                  <div className="flex items-center gap-2">
                    Contatto
                    {sortField === 'rubrica_nome' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('scadenza')}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-600">Data/Ora</span>
                    {sortField === 'scadenza' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('data_creazione')}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-600">Creata</span>
                    {sortField === 'data_creazione' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('stato')}
                >
                  <div className="flex items-center gap-2">
                    Stato
                    {sortField === 'stato' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('rubrica_origine')}
                >
                  <div className="flex items-center gap-2">
                    Origine
                    {sortField === 'rubrica_origine' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('rubrica_paese')}
                >
                  <div className="flex items-center gap-2">
                    Paese
                    {sortField === 'rubrica_paese' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('rubrica_citta')}
                >
                  <div className="flex items-center gap-2">
                    Città
                    {sortField === 'rubrica_citta' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('priorita')}
                >
                  <div className="flex items-center gap-2">
                    Priorità
                    {sortField === 'priorita' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-12">
                    {activities.length === 0 ? (
                      <div className="text-text-secondary">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-heading-3 font-semibold mb-2">Nessuna attività</h3>
                        <p className="text-body mb-4">
                          Inizia creando la tua prima attività
                        </p>
                        <Button onClick={openAddForm}>
                          <Plus className="h-4 w-4" />
                          Crea Prima Attività
                        </Button>
                      </div>
                    ) : (
                      <div className="text-text-secondary">
                        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-heading-3 font-semibold mb-2">Nessun risultato</h3>
                        <p className="text-body">
                          Prova a modificare i termini di ricerca o i filtri
                        </p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedActivities.map((activity) => {
                  const ActivityIcon = getActivityIcon(activity.tipo);
                  const activityStatus = getActivityStatus(activity);
                  const isOverdue = activity.scadenza && new Date(activity.scadenza) < new Date() && activity.stato !== 'completata';
                  const isOpen = activity.stato === 'aperta';
                  
                  // Applica stile come ActivityCard
                  const bgColor = isOverdue 
                    ? 'bg-gradient-to-bl from-red-800/10 from-20% to-black/20 to-60% dark:from-red-900/10 dark:to-black/30 border-red-700 dark:border-red-800' 
                    : isOpen 
                    ? 'bg-gradient-to-bl from-green-800/10 from-20% to-black/20 to-60% dark:from-green-900/10 dark:to-black/30 border-green-700 dark:border-green-800'
                    : '';
                  
                  return (
                     <TableRow 
                      key={activity.id} 
                      className={cn(
                        "hover:bg-muted/50 cursor-pointer",
                        bgColor,
                        selectedActivities.includes(activity.id) && selectedActivities.length > 0 && "!border-2 !border-red-500"
                      )}
                      onClick={() => handleDateFilter(activity.scadenza ? new Date(activity.scadenza) : undefined)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()} className="text-center align-middle">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteActivity(activity.id)}
                          className="h-7 w-7 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                      <TableCell className="w-16 align-middle text-center">
                        <span className="text-sm font-semibold text-primary">1</span>
                      </TableCell>
                      <TableCell className="w-16 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">
                            #{paginatedActivities.indexOf(activity) + 1 + currentPage * recordsPerPage}
                          </span>
                          <Checkbox
                            checked={selectedActivities.includes(activity.id)}
                            onCheckedChange={(checked) => handleActivitySelect(activity.id, !!checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                       </TableCell>
                       <TableCell className="align-middle">
                         <div 
                           className={cn(
                             "flex items-center justify-center gap-2",
                             activity.tipo === 'chiamata' && activity.rubrica_id && "cursor-pointer hover:bg-muted/50 rounded p-1"
                           )}
                           onClick={(e) => {
                             e.stopPropagation();
                             if (activity.tipo === 'chiamata' && activity.rubrica_id) {
                               handlePhoneClick(activity);
                             }
                           }}
                         >
                           <ActivityIcon className="h-5 w-5 text-blue-500" />
                           {activity.contact_source && (
                             <Tooltip>
                               <TooltipTrigger>
                                 {activity.contact_source === 'rubrica' ? (
                                   <Database className="h-4 w-4 text-green-600" />
                                 ) : (
                                   <FileText className="h-4 w-4 text-orange-600" />
                                 )}
                               </TooltipTrigger>
                               <TooltipContent>
                                 {activity.contact_source === 'rubrica' ? 'Contatto in Rubrica' : 'Contatto Importato'}
                               </TooltipContent>
                             </Tooltip>
                           )}
                         </div>
                       </TableCell>
                       <TableCell onClick={(e) => e.stopPropagation()} className="text-center align-middle">
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => openGestisciForm(activity)}
                           className="h-7 w-7"
                         >
                           <Pickaxe className="h-4 w-4" />
                         </Button>
                       </TableCell>
                       <TableCell 
                         className="max-w-[280px] cursor-pointer hover:border-2 hover:border-green-500 focus:!bg-black focus:!border-2 focus:!border-green-500 focus:outline-none"
                         tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activity.rubrica_id) {
                            openCompanyDialog(activity.rubrica_id);
                          }
                        }}
                      >
                        <div>
                          <div className="font-medium text-text-primary truncate">
                            {activity.rubrica_azienda || 'Nessuna azienda'}
                          </div>
          <div className="text-sm text-gray-500 truncate">
            {activity.descrizione}
          </div>
                        </div>
                      </TableCell>
                      <TableCell 
                        className="align-middle cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activity.scadenza) {
                            const scadenzaDate = new Date(activity.scadenza);
                            setFilterDate(scadenzaDate);
                            toast({
                              title: "Filtro data applicato",
                              description: `Visualizzazione attività del ${format(scadenzaDate, 'dd MMM yyyy')}`,
                            });
                          }
                        }}
                      >
                        {activity.scadenza ? (
                          <div className="space-y-1">
            <div className="font-semibold text-blue-600">
              {format(new Date(activity.scadenza), 'dd MMM')}
            </div>
            <div className="text-sm font-medium text-blue-500">
              {format(new Date(activity.scadenza), 'HH:mm')}
            </div>
                          </div>
                        ) : (
                          <span className="text-text-secondary">-</span>
                        )}
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="space-y-1">
          <div className="font-semibold text-blue-600">
            {format(new Date(activity.data_creazione), 'dd MMM')}
          </div>
                          {activity.ora_creazione && (
                            <div className="text-sm text-blue-500">
                              {activity.ora_creazione.substring(0, 5)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell 
                        className="text-center align-middle"
                      >
                        <div className="flex justify-center">
                          {activityStatus === 'in sospeso' ? (
                            <Clock className="h-5 w-5 text-yellow-500" />
                          ) : activityStatus === 'completata' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : activityStatus === 'scaduta' ? (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <span className="text-text-secondary text-sm">
                          {activity.rubrica_origine || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle">
                        <div className="flex items-center gap-2">
                          {activity.rubrica_paese && (
                            <img 
                              src={`https://flagcdn.com/16x12/${activity.rubrica_paese.toLowerCase()}.png`}
                              alt={activity.rubrica_paese}
                              className="w-4 h-3 object-cover border border-gray-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <span className="text-text-secondary text-sm">
                            {activity.rubrica_paese || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <span className="text-text-secondary text-sm">
                          {activity.rubrica_citta || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle">
                        <Badge variant={getPrioritaBadgeVariant(activity.priorita)}>
                          {PRIORITA_LABELS[activity.priorita]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          
          {/* Paginazione */}
          {totalPages > 1 && (
            <div className={cn(
              "mt-4 px-4 pb-4",
              isMobile ? "space-y-3" : "flex items-center justify-between"
            )}>
              {isMobile ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-text-secondary">Per pagina:</span>
                    <Select 
                      value={recordsPerPage.toString()} 
                      onValueChange={(value) => {
                        setRecordsPerPage(Number(value));
                        setCurrentPage(0);
                      }}
                    >
                      <SelectTrigger className="w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="text-center text-sm text-text-secondary">
                    {filteredActivities.length} risultati totali
                  </div>
                  
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm px-3 py-1 bg-muted rounded">
                        {currentPage + 1} di {totalPages}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                        disabled={currentPage >= totalPages - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-secondary">Righe per pagina:</span>
                    <Select 
                      value={recordsPerPage.toString()} 
                      onValueChange={(value) => {
                        setRecordsPerPage(Number(value));
                        setCurrentPage(0);
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="text-sm text-text-secondary">
                    Pagina {currentPage + 1} di {totalPages} 
                    ({filteredActivities.length} risultati totali)
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
                    <span className="text-sm px-3 py-1 bg-muted rounded">
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
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Dialog Gestisci Attività */}
      <GestisciAttivitaDialog
        isOpen={isGestisciOpen}
        activity={selectedActivity}
        onClose={() => setIsGestisciOpen(false)}
        onSave={handleGestisciActivity}
      />

      {/* Dialog Azienda */}
      <CompanyDialog
        isOpen={isCompanyDialogOpen}
        companyId={selectedCompanyId}
        onClose={() => setIsCompanyDialogOpen(false)}
        filters={filters}
        statusFilter={statusFilter}
      />

      {/* Dialog Chiamate */}
      <CallDialog
        isOpen={isCallDialogOpen}
        contact={selectedContact}
        onClose={() => setIsCallDialogOpen(false)}
        onSave={handleSaveContact}
      />
    </div>
    </>
  );
}