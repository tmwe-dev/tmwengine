import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, Clock, User, CheckCircle, AlertCircle, Pause, X, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
          rubrica:rubrica_id (
            azienda,
            nome
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedActivities: Activity[] = data?.map(activity => ({
        ...activity,
        tipo: activity.tipo as 'chiamata' | 'meeting' | 'email' | 'task',
        stato: activity.stato as 'aperta' | 'in_corso' | 'completata' | 'annullata',
        priorita: activity.priorita as 'alta' | 'media' | 'bassa',
        rubrica_nome: activity.rubrica?.azienda || activity.rubrica?.nome || ''
      })) || [];

      setActivities(formattedActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le attività",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
          rubrica_id: null, // Per attività singole dalla pagina attività
          tipo: tipo,
          descrizione: descrizione,
          stato: 'aperta',
          scadenza: null,
          priorita: activityData.priorita || 'media',
          assegnato_a: null,
          creato_da: null
        }])
        .select()
        .single();

      if (error) throw error;

      await loadActivities(); // Ricarica la lista
      setIsFormOpen(false);
      toast({
        title: "Attività aggiunta",
        description: "L'attività è stata creata con successo."
      });
    } catch (error) {
      console.error('Error creating activity:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare l'attività",
        variant: "destructive"
      });
    }
  };

  const handleEditActivity = async (activityData: any) => {
    if (!selectedActivity) return;

    try {
      const { error } = await supabase
        .from('attivita')
        .update({
          rubrica_id: activityData.rubrica_id || null,
          tipo: activityData.tipo,
          descrizione: activityData.descrizione,
          stato: activityData.stato,
          scadenza: activityData.scadenza || null,
          priorita: activityData.priorita,
          assegnato_a: activityData.assegnato_a || null
        })
        .eq('id', selectedActivity.id);

      if (error) throw error;

      await loadActivities(); // Ricarica la lista
      setSelectedActivity(null);
      setIsFormOpen(false);
      toast({
        title: "Attività modificata",
        description: "Le modifiche sono state salvate con successo."
      });
    } catch (error) {
      console.error('Error updating activity:', error);
      toast({
        title: "Errore",
        description: "Impossibile modificare l'attività",
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

      await loadActivities(); // Ricarica la lista
      toast({
        title: "Attività eliminata",
        description: "L'attività è stata rimossa."
      });
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare l'attività",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (activityId: string, newStatus: Activity['stato']) => {
    try {
      const { error } = await supabase
        .from('attivita')
        .update({ stato: newStatus })
        .eq('id', activityId);

      if (error) throw error;

      await loadActivities(); // Ricarica la lista
      toast({
        title: "Stato aggiornato",
        description: `L'attività è ora ${STATO_LABELS[newStatus].toLowerCase()}.`
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato",
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

  const getStatoBadgeVariant = (stato: Activity['stato']) => {
    switch (stato) {
      case 'completata': return 'default';
      case 'in_corso': return 'secondary';
      case 'aperta': return 'outline';
      case 'annullata': return 'destructive';
      default: return 'outline';
    }
  };

  const getPrioritaBadgeVariant = (priorita: Activity['priorita']) => {
    switch (priorita) {
      case 'alta': return 'destructive';
      case 'media': return 'secondary';
      case 'bassa': return 'outline';
      default: return 'outline';
    }
  };

  const getStatoIcon = (stato: Activity['stato']) => {
    switch (stato) {
      case 'completata': return CheckCircle;
      case 'in_corso': return Clock;
      case 'aperta': return AlertCircle;
      case 'annullata': return X;
      default: return AlertCircle;
    }
  };

  const getStatsData = () => {
    return {
      totali: activities.length,
      aperte: activities.filter(a => a.stato === 'aperta').length,
      in_corso: activities.filter(a => a.stato === 'in_corso').length,
      completate: activities.filter(a => a.stato === 'completata').length,
      scadute: activities.filter(a => {
        if (!a.scadenza) return false;
        return new Date(a.scadenza) < new Date();
      }).length
    };
  };

  const stats = getStatsData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-heading-1 font-bold text-text-primary">Attività</h1>
          <p className="text-body text-text-secondary">
            Gestisci e monitora tutte le tue attività
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
                <Button variant="outline" className="shadow-soft">
                  <Filter className="h-4 w-4" />
                  Filtri
                  {Object.values(filters).filter(Boolean).length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {Object.values(filters).filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Filtri Avanzati</DialogTitle>
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

      {/* Activities List */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <Card className="border-card shadow-soft">
            <CardContent className="p-12 text-center">
              <div className="text-text-secondary mb-4">
                {activities.length === 0 ? (
                  <>
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-heading-3 font-semibold mb-2">Nessuna attività</h3>
                    <p className="text-body mb-4">
                      Inizia creando la tua prima attività
                    </p>
                    <Button onClick={openAddForm}>
                      <Plus className="h-4 w-4" />
                      Crea Prima Attività
                    </Button>
                  </>
                ) : (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-heading-3 font-semibold mb-2">Nessun risultato</h3>
                    <p className="text-body">
                      Prova a modificare i termini di ricerca o i filtri
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredActivities.map((activity) => {
            const StatoIcon = getStatoIcon(activity.stato);
            return (
              <Card key={activity.id} className="border-card shadow-soft hover:shadow-medium transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <StatoIcon className="h-5 w-5 text-text-secondary" />
                        <CardTitle className="text-heading-4 font-semibold text-text-primary">
                          {activity.descrizione}
                        </CardTitle>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getStatoBadgeVariant(activity.stato)}>
                          {STATO_LABELS[activity.stato]}
                        </Badge>
                        <Badge variant="outline">
                          {TIPO_LABELS[activity.tipo]}
                        </Badge>
                        <Badge variant={getPrioritaBadgeVariant(activity.priorita)}>
                          {PRIORITA_LABELS[activity.priorita]}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {activity.stato !== 'completata' && activity.stato !== 'annullata' && (
                        <>
                          {activity.stato === 'aperta' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(activity.id, 'in_corso')}
                            >
                              Inizia
                            </Button>
                          )}
                          {activity.stato === 'in_corso' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(activity.id, 'completata')}
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
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteActivity(activity.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {activity.rubrica_nome && (
                    <div className="flex items-center gap-2 text-body text-text-secondary">
                      <User className="h-4 w-4" />
                      <span>Contatto: {activity.rubrica_nome}</span>
                    </div>
                  )}
                  
                  {activity.scadenza && (
                    <div className="flex items-center gap-2 text-body text-text-secondary">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Scadenza: {new Date(activity.scadenza).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {new Date(activity.scadenza) < new Date() && (
                        <Badge variant="destructive" className="text-xs">
                          Scaduta
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {activity.assegnato_nome && (
                    <div className="flex items-center gap-2 text-body text-text-secondary">
                      <User className="h-4 w-4" />
                      <span>Assegnato a: {activity.assegnato_nome}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}