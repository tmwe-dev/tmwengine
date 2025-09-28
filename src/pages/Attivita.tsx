import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, Clock, User, CheckCircle, AlertCircle, Pause, X, Edit, Trash2, Phone, Mail, Users, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdvancedMultipleActivityForm } from '@/components/attivita/AdvancedMultipleActivityForm';
import { ActivityFilters } from '@/components/attivita/ActivityFilters';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof Activity>('data_creazione');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    stato: '',
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
        data_creazione: activity.data_creazione
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

  // Sorting function
  const handleSort = (field: keyof Activity) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.descrizione.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.rubrica_nome?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilters = 
      (!filters.stato || activity.stato === filters.stato) &&
      (!filters.tipo || activity.tipo === filters.tipo) &&
      (!filters.priorita || activity.priorita === filters.priorita) &&
      (!filters.scadenza || checkScadenzaFilter(activity.scadenza, filters.scadenza));

    return matchesSearch && matchesFilters;
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
      // Crea l'attività basata sul tipo selezionato
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
    const aperte = activities.filter(a => a.stato === 'aperta').length;
    const in_corso = activities.filter(a => a.stato === 'in_corso').length;
    const completate = activities.filter(a => a.stato === 'completata').length;
    
    const today = new Date();
    const scadute = activities.filter(a => {
      if (!a.scadenza) return false;
      return new Date(a.scadenza) < today && a.stato !== 'completata';
    }).length;

    return { totali, aperte, in_corso, completate, scadute };
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
                contacts={[]} // Array vuoto per attività singole
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
            
            <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtri
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
            <div className="text-heading-3 font-bold text-blue-600">{stats.aperte}</div>
            <div className="text-small text-text-secondary">Aperte</div>
          </CardContent>
        </Card>

        <Card className="border-card shadow-soft">
          <CardContent className="p-4 text-center">
            <div className="text-heading-3 font-bold text-orange-600">{stats.in_corso}</div>
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

      {/* Activities Table */}
      <Card className="border-card shadow-soft">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={6} className="text-center py-12">
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
                  return (
                    <TableRow key={activity.id} className="hover:bg-muted/50">
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
                              {new Date(activity.scadenza).toLocaleDateString('it-IT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-sm font-medium text-blue-500">
                              {new Date(activity.scadenza).toLocaleTimeString('it-IT', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            {new Date(activity.scadenza) < new Date() && (
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
                        <Badge variant={getStatoBadgeVariant(activity.stato)}>
                          {STATO_LABELS[activity.stato]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPrioritaBadgeVariant(activity.priorita)}>
                          {PRIORITA_LABELS[activity.priorita]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {activity.stato !== 'completata' && activity.stato !== 'annullata' && (
                            <>
                              {activity.stato === 'aperta' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusChange(activity.id, 'in_corso')}
                                  className="h-7 px-2 text-xs"
                                >
                                  Inizia
                                </Button>
                              )}
                              {activity.stato === 'in_corso' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusChange(activity.id, 'completata')}
                                  className="h-7 px-2 text-xs"
                                >
                                  Completa
                                </Button>
                              )}
                            </>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditForm(activity)}
                            className="h-7 w-7"
                          >
                            <Edit className="h-3 w-3" />
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
    </div>
  );
}