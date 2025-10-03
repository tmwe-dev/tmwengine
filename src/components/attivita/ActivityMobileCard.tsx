import React from 'react';
import { format } from 'date-fns';
import { Phone, Mail, Users, FileText, Settings, Trash2, Clock, CheckCircle, AlertCircle, X, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ActivityCard } from './ActivityCard';

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
}

interface ActivityMobileCardProps {
  activity: Activity;
  index: number;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onPhoneClick: () => void;
  onCompanyClick: () => void;
  onGestisci: () => void;
  onDelete: () => void;
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

export function ActivityMobileCard({
  activity,
  index,
  isSelected,
  onSelect,
  onPhoneClick,
  onCompanyClick,
  onGestisci,
  onDelete
}: ActivityMobileCardProps) {
  
  const getActivityIcon = (tipo: string) => {
    switch (tipo) {
      case 'chiamata': return Phone;
      case 'email': return Mail;
      case 'meeting': return Users;
      case 'task': return FileText;
      default: return FileText;
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

  const getPrioritaBadgeVariant = (priorita: string) => {
    switch (priorita) {
      case 'alta': return 'destructive' as const;
      case 'media': return 'secondary' as const;
      case 'bassa': return 'outline' as const;
      default: return 'outline' as const;
    }
  };

  const isActivityFuture = (activity: Activity) => {
    if (!activity.scadenza) return false;
    return new Date(activity.scadenza) > new Date();
  };

  const getActivityStatus = (activity: Activity) => {
    const isFuture = isActivityFuture(activity);
    if (isFuture) {
      return activity.stato === 'completata' ? 'programmata' : 'in sospeso';
    } else {
      return activity.stato === 'completata' ? 'completata' : 'scaduta';
    }
  };

  const ActivityIcon = getActivityIcon(activity.tipo);
  const StatoIcon = getStatoIcon(activity.stato);
  const activityStatus = getActivityStatus(activity);
  const isOverdue = activity.scadenza && new Date(activity.scadenza) < new Date() && activity.stato !== 'completata';
  const isOpen = activity.stato === 'aperta';

  return (
    <TooltipProvider>
      <ActivityCard 
        isOverdue={!!isOverdue}
        isOpen={isOpen}
        className={cn(
          "transition-all duration-200",
          isSelected && "ring-2 ring-primary border-primary"
        )}
      >
        <div className="space-y-3">
          {/* Header con numero, checkbox e tipo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-mono">
                #{index + 1}
              </span>
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect(activity.id, !!checked)}
              />
              <div 
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md",
                  activity.tipo === 'chiamata' && activity.rubrica_id && "cursor-pointer hover:bg-muted/50"
                )}
                onClick={() => {
                  if (activity.tipo === 'chiamata' && activity.rubrica_id) {
                    onPhoneClick();
                  }
                }}
              >
                <ActivityIcon className="h-5 w-5 text-primary" />
                <span className="font-medium text-sm">{TIPO_LABELS[activity.tipo]}</span>
              </div>
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
                    {activity.contact_source === 'rubrica' ? 'Cliente in Rubrica' : 'Contatto Importato'}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            
            <Badge variant={getPrioritaBadgeVariant(activity.priorita)}>
              {PRIORITA_LABELS[activity.priorita]}
            </Badge>
          </div>

        {/* Contatto/Azienda */}
        <div 
          className="cursor-pointer hover:bg-muted/20 p-2 rounded-md transition-colors"
          onClick={onCompanyClick}
        >
          <div className="font-semibold text-foreground text-base leading-tight">
            {activity.rubrica_azienda || 'Nessuna azienda'}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {activity.descrizione}
          </div>
        </div>

        {/* Date e stato */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground mb-1">Scadenza</div>
            {activity.scadenza ? (
              <div className="space-y-1">
                <div className="font-semibold text-primary">
                  {format(new Date(activity.scadenza), 'dd MMM yyyy')}
                </div>
                <div className="text-sm text-primary/80">
                  {format(new Date(activity.scadenza), 'HH:mm')}
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
          
          <div>
            <div className="text-muted-foreground mb-1">Stato</div>
            <Badge 
              variant={
                activityStatus === 'in sospeso' ? 'secondary' :
                activityStatus === 'completata' ? 'default' :
                activityStatus === 'scaduta' ? 'destructive' : 'outline'
              }
            >
              {activityStatus}
            </Badge>
          </div>
        </div>

        {/* Informazioni aggiuntive */}
        {(activity.rubrica_origine || activity.rubrica_paese || activity.rubrica_citta) && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Origine</div>
              <div className="text-foreground">{activity.rubrica_origine || '-'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Località</div>
              <div className="flex items-center gap-2">
                {activity.rubrica_paese && (
                  <img 
                    src={`https://flagcdn.com/16x12/${activity.rubrica_paese.toLowerCase()}.png`}
                    alt={activity.rubrica_paese}
                    className="w-4 h-3 object-cover border border-border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <span className="text-foreground">
                  {activity.rubrica_citta || activity.rubrica_paese || '-'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Data creazione */}
        <div className="text-xs text-muted-foreground border-t border-border pt-2">
          Creata: {format(new Date(activity.data_creazione), 'dd MMM yyyy')}
          {activity.ora_creazione && ` alle ${activity.ora_creazione.substring(0, 5)}`}
        </div>

        {/* Azioni */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onGestisci}
            className="h-8 px-3 text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            Gestisci
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        </div>
      </ActivityCard>
    </TooltipProvider>
  );
}