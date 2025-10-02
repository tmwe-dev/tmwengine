import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, Mail, Users, FileText, MapPin, Globe, Building, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { ActivityCard } from './ActivityCard';

interface CompanyInfo {
  id: string;
  nome: string;
  azienda: string;
  email?: string;
  telefono?: string;
  cellulare?: string;
  indirizzo?: string;
  citta?: string;
  paese?: string;
  origine?: string;
}

interface Activity {
  id: string;
  tipo: 'chiamata' | 'meeting' | 'email' | 'task';
  descrizione: string;
  stato: 'aperta' | 'in_corso' | 'completata' | 'annullata';
  scadenza?: string;
  priorita: 'alta' | 'media' | 'bassa';
  data_creazione: string;
  ora_creazione?: string;
}

interface CompanyDialogProps {
  isOpen: boolean;
  companyId: string | null;
  onClose: () => void;
  filters?: {
    stato: string;
    tipo: string;
    priorita: string;
    scadenza: string;
    hasNotes: boolean;
  };
  statusFilter?: string;
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

export function CompanyDialog({ isOpen, companyId, onClose, filters, statusFilter }: CompanyDialogProps) {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && companyId) {
      loadCompanyData();
    }
  }, [isOpen, companyId]);

  const loadCompanyData = async () => {
    if (!companyId) return;

    try {
      setIsLoading(true);
      
      // Prova prima in rubrica
      const { data: rubricaData, error: rubricaError } = await supabase
        .from('rubrica')
        .select('*')
        .eq('id', companyId)
        .maybeSingle();

      let companyData: CompanyInfo | null = null;

      if (rubricaData) {
        companyData = rubricaData as CompanyInfo;
      } else {
        // Se non trovato in rubrica, cerca in imported_contacts
        const { data: importedData, error: importedError } = await supabase
          .from('imported_contacts')
          .select('*')
          .eq('id', companyId)
          .maybeSingle();

        if (importedData) {
          // Mappa i campi da imported_contacts a formato rubrica
          companyData = {
            id: importedData.id,
            nome: importedData.name || '',
            azienda: importedData.company_name || '',
            email: importedData.email,
            telefono: importedData.phone,
            cellulare: importedData.cell,
            indirizzo: importedData.address,
            citta: importedData.city,
            paese: importedData.country,
            origine: importedData.origin
          };
        }
      }

      if (!companyData) {
        console.error('Contatto non trovato');
        return;
      }

      setCompanyInfo(companyData);

      // Carica attività dell'azienda - ordine decrescente (più recente prima)
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('attivita')
        .select('*')
        .eq('rubrica_id', companyId)
        .order('data_creazione', { ascending: false });

      if (activitiesError) throw activitiesError;
      
      let formattedActivities: Activity[] = (activitiesData || []).map(activity => ({
        id: activity.id,
        tipo: activity.tipo as Activity['tipo'],
        descrizione: activity.descrizione,
        stato: activity.stato as Activity['stato'],
        scadenza: activity.scadenza,
        priorita: activity.priorita as Activity['priorita'],
        data_creazione: activity.data_creazione,
        ora_creazione: activity.ora_creazione
      }));
      
      // Applica i filtri se forniti
      if (filters) {
        formattedActivities = formattedActivities.filter(activity => {
          // Filtro stato
          const matchesStato = !filters.stato || filters.stato === 'all' || 
            filters.stato.split(',').includes(activity.stato);
          
          // Filtro tipo
          const matchesTipo = !filters.tipo || filters.tipo === 'all' || activity.tipo === filters.tipo;
          
          // Filtro priorità
          const matchesPriorita = !filters.priorita || filters.priorita === 'all' || 
            activity.priorita === filters.priorita;
          
          // Filtro note
          const matchesNotes = !filters.hasNotes; // CompanyDialog non ha accesso alle note
          
          return matchesStato && matchesTipo && matchesPriorita && matchesNotes;
        });
      }
      
      // Applica statusFilter se fornito
      if (statusFilter && statusFilter !== 'all') {
        formattedActivities = formattedActivities.filter(activity => {
          const isActivityFuture = activity.scadenza && new Date(activity.scadenza) > new Date();
          
          if (statusFilter === 'future') return isActivityFuture;
          if (statusFilter === 'completate') return activity.stato === 'completata';
          if (statusFilter === 'in_corso') return activity.stato === 'in_corso';
          if (statusFilter === 'scadute') {
            return activity.scadenza && new Date(activity.scadenza) < new Date() && 
              activity.stato !== 'completata';
          }
          
          return true;
        });
      }
      
      setActivities(formattedActivities);

    } catch (error) {
      console.error('Errore nel caricamento dati azienda:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (tipo: string) => {
    switch (tipo) {
      case 'chiamata': return Phone;
      case 'email': return Mail;
      case 'meeting': return Users;
      case 'task': return FileText;
      default: return FileText;
    }
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

  if (!companyInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 space-y-3">
          {/* Breadcrumb e pulsante indietro */}
          <div className="flex items-center justify-between">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink className="text-sm">Attività</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-sm font-medium">Dettaglio Azienda</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Indietro
            </Button>
          </div>

          {/* Titolo */}
          <DialogTitle className="flex items-center gap-3">
            <Building className="h-5 w-5 text-primary" />
            <span className="text-xl">{companyInfo.azienda}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Info Azienda */}
          <Card className="border-card shadow-soft">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Informazioni Contatto
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-white">{companyInfo.nome}</span>
                    </div>
                    {companyInfo.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-white">{companyInfo.email}</span>
                      </div>
                    )}
                    {companyInfo.telefono && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-white">{companyInfo.telefono}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Localizzazione
                  </h3>
                  <div className="space-y-2">
                    {companyInfo.citta && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-white">{companyInfo.citta}</span>
                      </div>
                    )}
                    {companyInfo.paese && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-white">{companyInfo.paese}</span>
                      </div>
                    )}
                    {companyInfo.origine && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Origine:</span>
                        <span className="text-sm text-white">{companyInfo.origine}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Elenco Attività */}
          <div>
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Attività Associate ({activities.length})
            </h3>
            
            {isLoading ? (
              <div className="text-center py-8 text-white">
                Caricamento attività...
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-white">
                Nessuna attività trovata per questa azienda
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => {
                  const ActivityIcon = getActivityIcon(activity.tipo);
                  const isOverdue = activity.scadenza && new Date(activity.scadenza) < new Date();
                  const isOpen = activity.stato === 'aperta';
                  
                  return (
                    <ActivityCard key={activity.id} isOverdue={isOverdue} isOpen={isOpen}>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <ActivityIcon className="h-5 w-5 text-blue-500" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="font-medium text-white truncate">
                                  {TIPO_LABELS[activity.tipo]}
                                </h4>
                                <p className="text-sm text-gray-300 mt-1">
                                  {activity.descrizione}
                                </p>
                              </div>
                              
                              <div className="flex-shrink-0 text-right">
                                <div className="text-lg font-bold text-blue-600">
                                  {format(new Date(activity.data_creazione), 'dd MMM')}
                                </div>
                                {activity.ora_creazione && (
                                  <div className="text-base font-semibold text-blue-500">
                                    {activity.ora_creazione.substring(0, 5)}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-3">
                              <Badge variant={getStatoBadgeVariant(activity.stato)}>
                                {STATO_LABELS[activity.stato]}
                              </Badge>
                              <Badge variant={getPrioritaBadgeVariant(activity.priorita)}>
                                {PRIORITA_LABELS[activity.priorita]}
                              </Badge>
                              {activity.scadenza && (
                                <span className="text-xs text-gray-300">
                                  Scadenza: {format(new Date(activity.scadenza), 'dd MMM HH:mm')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                    </ActivityCard>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}