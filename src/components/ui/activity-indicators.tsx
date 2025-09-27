import React from 'react';
import { Mail, Phone, Calendar, Briefcase, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActivityIndicatorsProps {
  companyId: string;
  activities?: Array<{
    id: string;
    tipo: 'chiamata' | 'meeting' | 'email' | 'task';
    stato: 'aperta' | 'in_corso' | 'completata' | 'annullata';
    scadenza?: string;
    descrizione: string;
  }>;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ActivityIndicators({ 
  companyId, 
  activities = [], 
  showCount = true, 
  size = 'md' 
}: ActivityIndicatorsProps) {
  if (!activities.length) {
    return null;
  }

  // Filtra solo attività aperte e in corso
  const activeActivities = activities.filter(
    activity => activity.stato === 'aperta' || activity.stato === 'in_corso'
  );

  if (!activeActivities.length) {
    return null;
  }

  // Raggruppa per tipo
  const activitiesByType = activeActivities.reduce((acc, activity) => {
    if (!acc[activity.tipo]) {
      acc[activity.tipo] = [];
    }
    acc[activity.tipo].push(activity);
    return acc;
  }, {} as Record<string, typeof activeActivities>);

  const getActivityIcon = (tipo: string) => {
    switch (tipo) {
      case 'email': return Mail;
      case 'chiamata': return Phone;
      case 'meeting': return Calendar;
      case 'task': return Briefcase;
      default: return AlertCircle;
    }
  };

  const getActivityColor = (tipo: string) => {
    switch (tipo) {
      case 'email': return 'text-blue-500';
      case 'chiamata': return 'text-green-500';
      case 'meeting': return 'text-purple-500';
      case 'task': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const getActivityLabel = (tipo: string) => {
    switch (tipo) {
      case 'email': return 'Email';
      case 'chiamata': return 'Chiamata';
      case 'meeting': return 'Meeting';
      case 'task': return 'Attività';
      default: return 'Attività';
    }
  };

  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const badgeSize = size === 'sm' ? 'text-xs' : 'text-xs';

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {Object.entries(activitiesByType).map(([tipo, typeActivities]) => {
          const Icon = getActivityIcon(tipo);
          const count = typeActivities.length;
          const hasOverdue = typeActivities.some(activity => 
            activity.scadenza && new Date(activity.scadenza) < new Date()
          );
          const hasInProgress = typeActivities.some(activity => activity.stato === 'in_corso');
          
          const tooltipContent = (
            <div className="space-y-1">
              <div className="font-semibold">{getActivityLabel(tipo)} ({count})</div>
              {typeActivities.slice(0, 3).map(activity => (
                <div key={activity.id} className="text-xs">
                  {activity.descrizione.substring(0, 50)}
                  {activity.descrizione.length > 50 ? '...' : ''}
                  {activity.scadenza && (
                    <div className="text-xs text-muted-foreground">
                      Scadenza: {new Date(activity.scadenza).toLocaleDateString('it-IT')}
                    </div>
                  )}
                </div>
              ))}
              {typeActivities.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{typeActivities.length - 3} altre attività
                </div>
              )}
            </div>
          );

          return (
            <Tooltip key={tipo}>
              <TooltipTrigger asChild>
                <div className="relative inline-flex items-center">
                  <Icon 
                    className={`${iconSize} ${getActivityColor(tipo)} ${
                      hasInProgress ? 'animate-pulse' : ''
                    }`} 
                  />
                  {showCount && count > 1 && (
                    <Badge 
                      variant="secondary" 
                      className={`${badgeSize} h-4 px-1 absolute -top-1 -right-1 min-w-4 flex items-center justify-center`}
                    >
                      {count}
                    </Badge>
                  )}
                  {hasOverdue && (
                    <div className="absolute -top-1 -right-1">
                      <Clock className="h-2 w-2 text-red-500" />
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}