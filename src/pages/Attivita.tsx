import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, Clock, User, CheckCircle, AlertCircle, Pause, X, Settings, Trash2, Phone, Mail, Users, FileText, ChevronUp, ChevronDown, CalendarIcon } from 'lucide-react';
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
import { AdvancedMultipleActivityForm } from '@/components/attivita/AdvancedMultipleActivityForm';
import { ActivityFilters } from '@/components/attivita/ActivityFilters';
import { GestisciAttivitaDialog } from '@/components/attivita/GestisciAttivitaDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  rubrica_id?: string;
  rubrica_nome?: string;
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
  const [filters, setFilters] = useState({
    stato: 'aperta,in_corso', // Default: mostra solo attività da svolgere
    tipo: '',
    priorita: '',
    scadenza: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('attivita')
        .select(`
          *,
          rubrica (
            id,
            nome,
            azienda
          )
        `)
        .order('data_creazione', { ascending: false });

      if (error) throw error;

      const formattedActivities: Activity[] = (data || []).map(activity => ({
        id: activity.id,
        rubrica_id: activity.rubrica_id,
        rubrica_nome: activity.rubrica?.[0]?.nome || activity.rubrica?.[0]?.azienda,
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
      }));

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

  // Date filter function
  const handleDateFilter = (date: Date | undefined) => {
    setFilterDate(date);
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.descrizione.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.rubrica_nome?.toLowerCase().includes(searchTerm.toLowerCase());

    // Gestione filtro stato multiplo (es: "aperta,in_corso") o "all"
    const matchesStato = !filters.stato || filters.stato === 'all' || 
      filters.stato.split(',').includes(activity.stato);
    
    const matchesFilters = 
      matchesStato &&
      (!filters.tipo || filters.tipo === 'all' || activity.tipo === filters.tipo) &&
      (!filters.priorita || filters.priorita === 'all' || activity.priorita === filters.priorita) &&
      (!filters.scadenza || filters.scadenza === 'all' || checkScadenzaFilter(activity.scadenza, filters.scadenza));

    const matchesDateFilter = !filterDate || 
      (activity.scadenza && format(new Date(activity.scadenza), 'yyyy-MM-dd') === format(filterDate, 'yyyy-MM-dd'));

    return matchesSearch && matchesFilters && matchesDateFilter;
  }).sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    return sortDirection === 'asc' ? comparison : -comparison;
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
      let descrizione = '';
      let tipo = activityData.tipo;
      
      if (activityData.tipo === 'email') {
        descrizione = `Email: ${activityData.oggetto_email || 'Nessun oggetto'}`;
      } else if (activityData.tipo === 'chiamata') {
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
          creato_da: null
        }])
        .select();

      if (error) throw error;
      
      setIsFormOpen(false);
      setSelectedActivity(null);
      await loadActivities();
      
      toast({
        title: "Attività creata",
        description: "L'attività è stata creata con successo.",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione dell'attività.",
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

  const handleGestisciActivity = async (updates: Partial<Activity>) => {
    if (!selectedActivity) return;

    try {
      const { error } = await supabase
        .from('attivita')
        .update(updates)
        .eq('id', selectedActivity.id);

      if (error) throw error;

      await loadActivities();
      setIsGestisciOpen(false);
      setSelectedActivity(null);
      
      toast({
        title: "Attività aggiornata",
        description: "Le modifiche sono state salvate con successo.",
      });
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
    const totali = activities.length;
    const future = activities.filter(a => isActivityFuture(a)).length;
    const completate = activities.filter(a => a.stato === 'completata').length;
    const in_corso = activities.filter(a => a.stato === 'in_corso').length;
    
    const today = new Date();
    const scadute = activities.filter(a => {
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

  return (
    <div className="section-spacing">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-heading-1 font-bold text-text-primary mb-2">
            Gestione Attività
          </h1>
          <p className="text-body text-text-secondary">
            Organizza e gestisci tutte le tue attività di business
          </p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddForm} className="shadow-soft">
              <Plus className="h-4 w-4" />
              Nuova Attività
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>
                {selectedActivity ? 'Modifica Attività' : 'Nuova Attività'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <AdvancedMultipleActivityForm
                contacts={[]}
                onSubmit={selectedActivity ? handleEditActivity : handleAddActivity}
                onCancel={() => setIsFormOpen(false)}
                isSubmitting={false}
                showSaveToRubrica={false}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className="border-card shadow-soft">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                placeholder="Cerca per descrizione o contatto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {filterDate ? format(filterDate, 'dd/MM/yyyy') : 'Filtra per data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={filterDate}
                  onSelect={handleDateFilter}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            <Select
              value={filters.stato}
              onValueChange={(value) => setFilters(prev => ({ ...prev, stato: value }))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtra per stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le attività</SelectItem>
                <SelectItem value="aperta,in_corso">Da svolgere</SelectItem>
                <SelectItem value="completata">Completate</SelectItem>
                <SelectItem value="annullata">Annullate</SelectItem>
                <SelectItem value="aperta">Solo aperte</SelectItem>
                <SelectItem value="in_corso">Solo in corso</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtri Avanzati
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
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-card shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="text-heading-3 font-bold text-text-primary">{stats.totali}</div>
            <div className="text-small text-text-secondary">Totali</div>
          </CardContent>
        </Card>
        
        <Card className="border-card shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="text-heading-3 font-bold text-orange-600">{stats.future}</div>
            <div className="text-small text-text-secondary">In Sospeso</div>
          </CardContent>
        </Card>

        <Card className="border-card shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="text-heading-3 font-bold text-blue-600">{stats.in_corso}</div>
            <div className="text-small text-text-secondary">In Corso</div>
          </CardContent>
        </Card>

        <Card className="border-card shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="text-heading-3 font-bold text-green-600">{stats.completate}</div>
            <div className="text-small text-text-secondary">Completate</div>
          </CardContent>
        </Card>

        <Card className="border-card shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="text-heading-3 font-bold text-red-600">{stats.scadute}</div>
            <div className="text-small text-text-secondary">Scadute</div>
          </CardContent>
        </Card>
      </div>

      {/* Azioni per selezione multipla */}
      {selectedActivities.length > 0 && (
        <Card className="border-card shadow-soft bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-700">
                  {selectedActivities.length} attività selezionate
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Calendar className="h-4 w-4 mr-2" />
                      Riprogramma
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
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedActivities([])}
                >
                  <X className="h-4 w-4 mr-2" />
                  Deseleziona
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activities Table */}
      <Card className="border-card shadow-soft">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedActivities.length === filteredActivities.length && filteredActivities.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 w-16" 
                  onClick={() => handleSort('tipo')}
                >
                  <div className="flex items-center gap-2">
                    Tipo
                    {sortField === 'tipo' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
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
                  onClick={() => handleSort('priorita')}
                >
                  <div className="flex items-center gap-2">
                    Priorità
                    {sortField === 'priorita' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-32">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
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
                filteredActivities.map((activity) => {
                  const ActivityIcon = getActivityIcon(activity.tipo);
                  const activityStatus = getActivityStatus(activity);
                  return (
                    <TableRow 
                      key={activity.id} 
                      className={cn(
                        "hover:bg-muted/50 cursor-pointer",
                        selectedActivities.includes(activity.id) && "bg-blue-50"
                      )}
                      onClick={() => handleDateFilter(activity.scadenza ? new Date(activity.scadenza) : undefined)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedActivities.includes(activity.id)}
                          onCheckedChange={(checked) => handleActivitySelect(activity.id, !!checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <ActivityIcon className="h-5 w-5 text-blue-500" />
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div>
                          <div className="font-medium text-text-primary truncate">
                            {activity.rubrica_nome || 'Nessun contatto'}
                          </div>
                          <div className="text-sm text-text-secondary truncate">
                            {activity.descrizione}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {activity.scadenza ? (
                          <div className="space-y-1">
            <div className="font-semibold text-blue-600">
              {format(new Date(activity.scadenza), 'dd MMM')}
            </div>
            <div className="text-sm font-medium text-blue-500">
              {format(new Date(activity.scadenza), 'HH:mm')}
            </div>
                            {!isActivityFuture(activity) && activity.stato !== 'completata' && (
                              <Badge variant="destructive" className="text-xs">
                                Scaduta
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-secondary">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
          <div className="font-semibold text-blue-600">
            {format(new Date(activity.data_creazione), 'dd MMM')}
          </div>
                          {activity.ora_creazione && (
                            <div className="text-sm text-blue-500">
                              {activity.ora_creazione}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            activityStatus === 'in sospeso' ? 'secondary' :
                            activityStatus === 'completata' ? 'default' :
                            activityStatus === 'scaduta' ? 'destructive' : 'outline'
                          }
                        >
                          {activityStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPrioritaBadgeVariant(activity.priorita)}>
                          {PRIORITA_LABELS[activity.priorita]}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openGestisciForm(activity)}
                            className="h-7 px-2 text-xs"
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Gestisci
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteActivity(activity.id)}
                            className="h-7 w-7 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Gestisci Attività */}
      <GestisciAttivitaDialog
        isOpen={isGestisciOpen}
        activity={selectedActivity}
        onClose={() => setIsGestisciOpen(false)}
        onSave={handleGestisciActivity}
      />
    </div>
  );
}