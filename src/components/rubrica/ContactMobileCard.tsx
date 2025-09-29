import React from 'react';
import { Building, Phone, Mail, MapPin, Tag, Eye, Users, User, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface Contact {
  [key: string]: any;
}

interface ContactMobileCardProps {
  contact: Contact;
  index: number;
  isSelected: boolean;
  visibleColumns: {
    company: boolean;
    details: boolean;
    metadata: boolean;
  };
  onSelect: (index: number, selected: boolean) => void;
  onView: () => void;
  onCreateActivity: () => void;
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
  visibleColumns,
  onSelect,
  onView,
  onCreateActivity
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

  return (
    <Card className={cn(
      "border-card shadow-soft transition-all duration-200",
      isSelected && "ring-2 ring-primary border-primary"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header con checkbox e azienda - SEMPRE VISIBILE */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
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
            </div>
          </div>
          
          {formatCellValue(contact.origine) && (
            <Badge variant="outline" className="ml-2">
              {formatCellValue(contact.origine)}
            </Badge>
          )}
        </div>

        {/* SEZIONE COMPANY - Informazioni base azienda */}
        {visibleColumns.company && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
            <h5 className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
              <Building className="h-3 w-3" />
              Azienda
            </h5>
            <div className="space-y-2 text-sm">
              {formatCellValue(contact.responsabile) && (
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-foreground">{formatCellValue(contact.responsabile)}</span>
                </div>
              )}
              {(formatCellValue(contact.citta) || formatCellValue(contact.paese)) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
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
              {formatCellValue(contact.settore) && (
                <div className="flex items-center gap-2">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="secondary" className="text-xs">
                    {formatCellValue(contact.settore)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SEZIONE DETAILS - Contatti e dettagli */}
        {visibleColumns.details && (formatCellValue(contact.email) || formatCellValue(contact.telefono) || formatCellValue(contact.cellulare)) && (
          <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <h5 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1">
              <Phone className="h-3 w-3" />
              Contatti
            </h5>
            <div className="space-y-2">
              {formatCellValue(contact.email) && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="text-foreground">{formatCellValue(contact.email)}</span>
                </div>
              )}
              
              {(formatCellValue(contact.telefono) || formatCellValue(contact.cellulare)) && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-foreground">
                    {formatCellValue(contact.telefono) || formatCellValue(contact.cellulare)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SEZIONE METADATA - Dati di sistema e stato */}
        {visibleColumns.metadata && (
          <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
            <h5 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
              <Database className="h-3 w-3" />
              Metadata
            </h5>
            <div className="space-y-2 text-sm">
              {formatCellValue(contact.stato) && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Stato:</span>
                  <Badge variant={contact.stato === 'A' ? 'default' : 'secondary'} className="text-xs">
                    {contact.stato === 'A' ? 'Attivo' : formatCellValue(contact.stato)}
                  </Badge>
                </div>
              )}
              {formatCellValue(contact.client_code) && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Codice:</span>
                  <span className="text-foreground font-mono text-xs">{formatCellValue(contact.client_code)}</span>
                </div>
              )}
              {contact.created_at && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Creato:</span>
                  <span className="text-foreground text-xs">
                    {new Date(contact.created_at).toLocaleDateString('it-IT', { 
                      day: '2-digit', 
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}
              {contact.last_contact && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Ultimo contatto:</span>
                  <span className="text-foreground text-xs">
                    {new Date(contact.last_contact).toLocaleDateString('it-IT', { 
                      day: '2-digit', 
                      month: 'short'
                    })}
                  </span>
                </div>
              )}
              {contact.next_contact_date && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Prossimo contatto:</span>
                  <span className="text-foreground text-xs">
                    {new Date(contact.next_contact_date).toLocaleDateString('it-IT', { 
                      day: '2-digit', 
                      month: 'short'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Azioni - SEMPRE VISIBILI */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
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