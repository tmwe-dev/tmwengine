import React from 'react';
import { Phone, Mail, MapPin, Trash2, Pickaxe } from 'lucide-react';
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
  onSelect: (index: number, selected: boolean) => void;
  onView: () => void;
  onDelete: () => void;
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
  onDelete,
  onCreateActivity,
  getCountryFlag,
  formatCellValue
}: CompactContactCardProps) {
  
  return (
    <Card className={cn(
      "border transition-all duration-200 hover:shadow-sm relative w-[95%] mx-auto",
      "bg-gradient-to-l from-purple-500/10 via-purple-500/5 via-35% to-transparent border-purple-500/20",
      "hover:from-purple-500/10 hover:via-purple-500/5 hover:via-35% hover:to-transparent hover:border-purple-500/30",
      isSelected && "ring-2 ring-purple-500 border-purple-500/40 from-purple-500/20 via-purple-500/10 via-35% to-transparent"
    )}>
      <CardContent className="p-3 -mt-[8.5px]">
        <div className="flex items-center gap-2">
          {/* Checkbox e numero record */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(index, !!checked)}
              className="h-4 w-4"
            />
            <span className="text-xs font-medium text-white">#{index + 1}</span>
          </div>
          
          {/* Contenuto principale ultra-compatto */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
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
              
              {/* Azioni compatte */}
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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