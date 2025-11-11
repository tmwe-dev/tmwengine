import React from 'react';
import { Phone, Mail, MapPin, Pickaxe, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface ImportedContact {
  [key: string]: any;
}

interface CompactContactCardProps {
  contact: ImportedContact;
  index: number;
  isSelected: boolean;
  onSelect: (recordId: string, selected: boolean) => void;
  onView: () => void;
  onGenerateAliases?: () => void;
  onCreateActivity: (activityType?: 'chiamata' | 'email') => void;
  getCountryFlag: (countryName: string) => string;
  formatCellValue: (value: any, fieldKey?: string) => string;
}

export function CompactContactCard({
  contact,
  index,
  isSelected,
  onSelect,
  onView,
  onGenerateAliases,
  onCreateActivity,
  getCountryFlag,
  formatCellValue
}: CompactContactCardProps) {
  
  return (
    <Card className={cn(
      "border transition-all duration-200 hover:shadow-sm relative w-[95%] mx-auto",
      "bg-gradient-to-l from-purple-500/10 via-purple-500/5 via-35% to-transparent border-purple-500/20",
      "hover:from-purple-500/10 hover:via-purple-500/5 hover:via-35% hover:to-transparent hover:border-purple-500/30",
      isSelected && "ring-1 ring-purple-500 border-purple-500/40 from-purple-500/20 via-purple-500/10 via-35% to-transparent"
    )}>
      <CardContent className="p-3 -mt-[8.5px]">
        <div className="flex items-center gap-2">
          {/* Checkbox e numero record */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(contact.id, !!checked)}
              className="h-4 w-4"
            />
            <span className="text-xs font-medium text-white">#{index + 1}</span>
          </div>
          
          {/* Contenuto principale ultra-compatto */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              {/* Info principale */}
              <div className="flex-1 min-w-0">
                <div 
                  className="font-medium text-sm text-primary cursor-pointer hover:underline truncate"
                  onClick={onView}
                >
                  {contact.company_name || contact.name || 'N/A'}
                </div>
                
                {/* Riga informazioni compatta */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {/* Paese + Città */}
                  {contact.country && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{getCountryFlag(contact.country)}</span>
                      <span>{formatCellValue(contact.country)}</span>
                      {contact.city && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="truncate max-w-[80px]">{formatCellValue(contact.city)}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Persona di contatto se diversa dall'azienda */}
            {contact.name && contact.name !== contact.company_name && (
              <div className="text-xs text-muted-foreground mt-1 truncate flex items-center gap-1">
                <span className="text-sm">👤</span>
                <span>{formatCellValue(contact.name)}</span>
              </div>
            )}
            
            {/* Origin badge se presente */}
            {contact.origin && (
              <div className="mt-1">
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 rounded">
                  {formatCellValue(contact.origin)}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Icone contatti e azioni in basso a destra */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10">
          {/* Generate Aliases icon - mostra solo se mancano alias */}
          {onGenerateAliases && (!contact.alias || !contact.company_alias) && (
            <div 
              className="p-1.5 rounded-full cursor-pointer bg-purple-600/10 hover:bg-purple-600/20 transition-colors"
              onClick={onGenerateAliases}
              title="Genera alias AI"
            >
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
          )}
          
          {/* Create activity icon */}
          <div 
            className="p-1.5 rounded-full cursor-pointer bg-primary/10 hover:bg-primary/20 transition-colors"
            onClick={() => onCreateActivity()}
          >
            <Pickaxe className="h-4 w-4 text-primary" />
          </div>
          {contact.email && (
            <div 
              className="p-1.5 rounded-full cursor-pointer bg-blue-600/10 hover:bg-blue-600/20 transition-colors"
              onClick={() => onCreateActivity('email')}
            >
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
          )}
          {(contact.phone || contact.cell) && (
            <div 
              className="p-1.5 rounded-full cursor-pointer bg-green-600/10 hover:bg-green-600/20 transition-colors"
              onClick={() => onCreateActivity('chiamata')}
            >
              <Phone className="h-4 w-4 text-green-600" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}