import React from 'react';
import { Building, Phone, Mail, MapPin, Tag, Eye, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ActivityIndicators } from '@/components/ui/activity-indicators';
import { cn } from '@/lib/utils';

interface Contact {
  [key: string]: any;
}

interface ContactMobileCardProps {
  contact: Contact;
  index: number;
  isSelected: boolean;
  onSelect: (index: number, selected: boolean) => void;
  onView: () => void;
  onCreateActivity: () => void;
  getCompanyActivities: (companyId: string) => any[];
  visibleColumns?: {
    company: boolean;
    details: boolean;
    metadata: boolean;
  };
}

// Function to get country flag emoji
const getCountryFlag = (countryName: string): string => {
  if (!countryName) return '';
  
  const countryFlags: { [key: string]: string } = {
    'italy': '🇮🇹', 'italia': '🇮🇹', 'it': '🇮🇹',
    'france': '🇫🇷', 'francia': '🇫🇷', 'fr': '🇫🇷',
    'germany': '🇩🇪', 'germania': '🇩🇪', 'de': '🇩🇪',
    'spain': '🇪🇸', 'spagna': '🇪🇸', 'es': '🇪🇸',
    'united kingdom': '🇬🇧', 'uk': '🇬🇧', 'gb': '🇬🇧',
    'united states': '🇺🇸', 'usa': '🇺🇸', 'us': '🇺🇸',
    'netherlands': '🇳🇱', 'olanda': '🇳🇱', 'nl': '🇳🇱',
    'belgium': '🇧🇪', 'belgio': '🇧🇪', 'be': '🇧🇪',
    'switzerland': '🇨🇭', 'svizzera': '🇨🇭', 'ch': '🇨🇭',
    'austria': '🇦🇹', 'at': '🇦🇹',
    'canada': '🇨🇦', 'ca': '🇨🇦',
    'australia': '🇦🇺', 'au': '🇦🇺',
  };
  
  const normalizedCountry = countryName.toLowerCase().trim();
  return countryFlags[normalizedCountry] || '🌍';
};

export function ContactMobileCard({
  contact,
  index,
  isSelected,
  onSelect,
  onView,
  onCreateActivity,
  getCompanyActivities,
  visibleColumns = { company: true, details: true, metadata: true }
}: ContactMobileCardProps) {
  
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined || value === '' || value === false || value === '-') {
      return '';
    }
    if (typeof value === 'boolean') {
      return value ? 'Sì' : '';
    }
    return String(value);
  };

  const activities = getCompanyActivities(contact.id);
  const hasOpenActivities = activities.some((a: any) => 
    a.stato === 'aperta' || a.stato === 'in_corso'
  );
  const hasOverdueActivities = activities.some((a: any) => 
    a.scadenza && new Date(a.scadenza) < new Date() && a.stato !== 'completata'
  );
  
  const cardBgColor = hasOverdueActivities
    ? 'bg-gradient-to-bl from-red-800/10 from-20% to-black/20 to-60% dark:from-red-900/10 dark:to-black/30 border-red-700 dark:border-red-800' 
    : hasOpenActivities 
    ? 'bg-gradient-to-bl from-green-800/10 from-20% to-black/20 to-60% dark:from-green-900/10 dark:to-black/30 border-green-700 dark:border-green-800'
    : '';

  return (
    <Card className={cn(
      "border-card shadow-soft transition-all duration-200 relative overflow-hidden",
      cardBgColor,
      isSelected && "ring-2 ring-primary border-primary"
    )}>
      {(hasOverdueActivities || hasOpenActivities) && (
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none" 
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)'
          }} 
        />
      )}
      <CardContent className="p-4 space-y-3 relative z-10">
        {/* Header con numero, checkbox e azienda */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xs text-muted-foreground font-mono">
              #{index + 1}
            </span>
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(index, !!checked)}
            />
            <div className="flex-1">
              <div className="font-semibold text-foreground text-base leading-tight">
                {formatCellValue(contact.azienda) || 'Azienda non specificata'}
              </div>
              {formatCellValue(contact.nome) && (
                <div className="text-sm text-muted-foreground mt-1">
                  {formatCellValue(contact.nome)}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <ActivityIndicators 
                  companyId={contact.id} 
                  activities={getCompanyActivities(contact.id)}
                  size="sm"
                />
              </div>
            </div>
          </div>
          
          {formatCellValue(contact.origine) && (
            <Badge variant="outline" className="ml-2">
              {formatCellValue(contact.origine)}
            </Badge>
          )}
        </div>

        {/* Contatti - Solo se details è visibile */}
        {visibleColumns.details && (
          <div className="space-y-2">
            {(formatCellValue(contact.email) || formatCellValue(contact.telefono) || formatCellValue(contact.cellulare)) && (
              <div className="grid gap-2">
                {formatCellValue(contact.email) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{formatCellValue(contact.email)}</span>
                  </div>
                )}
                
                {(formatCellValue(contact.telefono) || formatCellValue(contact.cellulare)) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {formatCellValue(contact.telefono) || formatCellValue(contact.cellulare)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Localizzazione e altre info - Solo se details è visibile */}
        {visibleColumns.details && (
          <>
            {(formatCellValue(contact.citta) || formatCellValue(contact.paese)) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  {formatCellValue(contact.paese) && (
                    <span>{getCountryFlag(contact.paese)}</span>
                  )}
                  <span className="text-foreground">
                    {[formatCellValue(contact.citta), formatCellValue(contact.paese)]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              </div>
            )}

            {formatCellValue(contact.responsabile) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Responsabile: </span>
                <span className="text-foreground">{formatCellValue(contact.responsabile)}</span>
              </div>
            )}

            {formatCellValue(contact.settore) && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs">
                  {formatCellValue(contact.settore)}
                </Badge>
              </div>
            )}
          </>
        )}

        {/* Metadati - Solo se metadata è visibile */}
        {visibleColumns.metadata && contact.created_at && (
          <div className="text-xs text-muted-foreground border-t border-border pt-2">
            Aggiunto: {new Date(contact.created_at).toLocaleDateString('it-IT', { 
              day: '2-digit', 
              month: 'short',
              year: 'numeric'
            })}
          </div>
        )}

        {/* Azioni */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="h-8 px-3 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Dettagli
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={onCreateActivity}
            className="h-8 px-3 text-xs"
          >
            <Users className="h-3 w-3 mr-1" />
            Attività
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}