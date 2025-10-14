import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Plus, Search, Filter, Calendar, Clock, User, CheckCircle, AlertCircle, Pause, X, Settings, Trash2, Phone, Mail, Users, FileText, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, CalendarIcon, EyeOff, Eye, SearchCheck, SearchX, Database, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

interface Activity {
  id: string;
  rubrica_id?: string;
  rubrica_nome?: string;
  rubrica_azienda?: string;
  rubrica_origine?: string;
  rubrica_paese?: string;
  rubrica_citta?: string;
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
  campagna_id?: string;
  campagna_nome?: string;
}

interface AttivitaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterByContactId?: string | null;
  filterByCampaignId?: string | null;
  showBackButton?: boolean;
  onBackToRecords?: () => void;
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

export function AttivitaDialog({ open, onOpenChange, filterByContactId, filterByCampaignId, showBackButton, onBackToRecords }: AttivitaDialogProps) {
  console.log('AttivitaDialog props:', { open, filterByContactId, filterByCampaignId, showBackButton, hasOnBackToRecords: !!onBackToRecords });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGestisciOpen, setIsGestisciOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof Activity>('data_creazione');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    stato: filterByContactId ? 'all' : 'aperta,in_corso',
    tipo: '',
    priorita: '',
    scadenza: '',
    hasNotes: false
  });
  const [statusFilter, setStatusFilter] = useState<string>(filterByContactId ? 'all' : 'future');
  const [currentPage, setCurrentPage] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(25);
  const scrollPositionRef = useRef<number>(0);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      loadActivities();
    }
  }, [open, filterByContactId, filterByCampaignId]);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('attivita')
        .select('*');
      
      // Filtra per campagna se specificato
      if (filterByCampaignId) {
        query = query.eq('campagna_id', filterByCampaignId);
      }
      
      const { data: attivitaData, error: attivitaError } = await query
        .order('data_creazione', { ascending: false });

      if (attivitaError) throw attivitaError;

      const rubricaIds = [...new Set(attivitaData?.map(a => a.rubrica_id).filter(Boolean))];
      
      let contactsMap = new Map<string, {contact: any, source: 'rubrica' | 'imported_contacts'}>();
      
      if (rubricaIds.length > 0) {
        const { data: rubricaData } = await supabase
          .from('rubrica')
          .select('id, nome, azienda, origine, paese, citta, telefono, cellulare')
          .in('id', rubricaIds);
        
        rubricaData?.forEach(contact => {
          contactsMap.set(contact.id, { contact, source: 'rubrica' });
        });
        
        const notFoundInRubrica = rubricaIds.filter(id => !contactsMap.has(id));
        
        if (notFoundInRubrica.length > 0) {
          const { data: importedData } = await supabase
            .from('imported_contacts')
            .select('id, name, company_name, origin, country, city, phone, cell')
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
                cellulare: contact.cell
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
          selezionata: activity.selezionata || false,
          campagna_id: activity.campagna_id,
          campagna_nome: null
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

  const isActivityFuture = (activity: Activity) => {
    if (!activity.scadenza) return false;
    return new Date(activity.scadenza) > new Date();
  };

  const baseFilteredActivities = activities.filter(activity => {
    const matchesSearch = activity.descrizione.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.rubrica_azienda?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.rubrica_citta?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.rubrica_origine?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesContact = !filterByContactId || activity.rubrica_id === filterByContactId;
    const matchesCampaign = !filterByCampaignId || activity.campagna_id === filterByCampaignId;

    const matchesStato = !filters.stato || filters.stato === 'all' || 
      filters.stato.split(',').includes(activity.stato);
    
    const matchesFilters = 
      matchesStato &&
      (!filters.tipo || filters.tipo === 'all' || activity.tipo === filters.tipo) &&
      (!filters.priorita || filters.priorita === 'all' || activity.priorita === filters.priorita) &&
      (!filters.hasNotes || (activity.note && activity.note.trim() !== ''));

    return matchesSearch && matchesContact && matchesCampaign && matchesFilters;
  });

  const filteredActivities = baseFilteredActivities.filter(activity => {
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

  const totalPages = Math.ceil(filteredActivities.length / recordsPerPage);
  const paginatedActivities = filteredActivities.slice(
    currentPage * recordsPerPage,
    (currentPage + 1) * recordsPerPage
  );

  const getStatsData = () => {
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh]">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Caricamento attività...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBackButton && onBackToRecords && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBackToRecords}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Indietro
              </Button>
            )}
            <span>Gestione Attività {filterByContactId && '- Filtrato per contatto'} {filterByCampaignId && '- Filtrato per campagna'}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Search and Filters */}
        <Card className="border-card shadow-soft">
          <CardContent className="p-4">
            <div className="flex gap-3 flex-col sm:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per descrizione o contatto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select
                value={filters.stato}
                onValueChange={(value) => setFilters(prev => ({ ...prev, stato: value }))}
              >
                <SelectTrigger className="flex-1 min-w-[200px]">
                  <SelectValue placeholder={`Risultati: ${filteredActivities.length}/${activities.length}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte ({activities.length})</SelectItem>
                  <SelectItem value="aperta,in_corso">Da svolgere ({activities.filter(a => a.stato === 'aperta' || a.stato === 'in_corso').length})</SelectItem>
                  <SelectItem value="completata">Completate ({activities.filter(a => a.stato === 'completata').length})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Badge filtro contatto attivo */}
            {filterByContactId && (
              <div className="mt-4 flex items-center justify-center">
                <Badge 
                  variant="secondary" 
                  className="flex items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 transition-colors"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                  Filtrato per contatto - Clicca per tornare indietro
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className={cn("cursor-pointer transition-all", statusFilter === 'all' && "ring-2 ring-primary")} onClick={() => setStatusFilter('all')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.totali}</div>
              <div className="text-sm text-muted-foreground">Totali</div>
            </CardContent>
          </Card>
          <Card className={cn("cursor-pointer transition-all", statusFilter === 'future' && "ring-2 ring-primary")} onClick={() => setStatusFilter('future')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.future}</div>
              <div className="text-sm text-muted-foreground">Future</div>
            </CardContent>
          </Card>
          <Card className={cn("cursor-pointer transition-all", statusFilter === 'completate' && "ring-2 ring-primary")} onClick={() => setStatusFilter('completate')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.completate}</div>
              <div className="text-sm text-muted-foreground">Completate</div>
            </CardContent>
          </Card>
          <Card className={cn("cursor-pointer transition-all", statusFilter === 'in_corso' && "ring-2 ring-primary")} onClick={() => setStatusFilter('in_corso')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.in_corso}</div>
              <div className="text-sm text-muted-foreground">In Corso</div>
            </CardContent>
          </Card>
          <Card className={cn("cursor-pointer transition-all", statusFilter === 'scadute' && "ring-2 ring-primary")} onClick={() => setStatusFilter('scadute')}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.scadute}</div>
              <div className="text-sm text-muted-foreground">Scadute</div>
            </CardContent>
          </Card>
        </div>

        {/* Activities Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead>Contatto</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Priorità</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Campagna</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nessuna attività trovata
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedActivities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <Badge variant="outline">{TIPO_LABELS[activity.tipo]}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{activity.descrizione}</TableCell>
                        <TableCell>{activity.rubrica_azienda || activity.rubrica_nome || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            activity.stato === 'aperta' ? 'default' :
                            activity.stato === 'in_corso' ? 'secondary' :
                            activity.stato === 'completata' ? 'default' :
                            'destructive'
                          }>
                            {STATO_LABELS[activity.stato]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            activity.priorita === 'alta' ? 'destructive' :
                            activity.priorita === 'media' ? 'secondary' :
                            'outline'
                          }>
                            {PRIORITA_LABELS[activity.priorita]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {activity.scadenza ? format(new Date(activity.scadenza), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {activity.campagna_id && (
                            <Badge variant="secondary" className="gap-1">
                              📧 C
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Pagina {currentPage + 1} di {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DialogContent>
    </Dialog>
  );
}
