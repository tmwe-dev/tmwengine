import React from 'react';
import { Phone, Mail, MapPin, Trash2, Eye } from 'lucide-react';
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
  getCountryFlag,
  formatCellValue
}: CompactContactCardProps) {
  
  return (
    <Card className={cn(
      "border transition-all duration-200 hover:shadow-sm bg-background relative",
      isSelected && "ring-1 ring-primary border-primary bg-primary/5"
    )}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          {/* Checkbox compatto */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(index, !!checked)}
            className="h-4 w-4 flex-shrink-0"
          />
          
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
              
              {/* Azioni compatte - icone uniformi */}
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onView}
                  className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                >
                  <Eye className="h-4 w-4" />
                </Button>
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

        {/* Icone contatti in basso a destra */}
        {(contact.email || contact.phone || contact.cell) && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-10">
            {contact.email && (
              <div className="p-1.5 bg-blue-100 border border-blue-200 rounded-full shadow-sm hover:bg-blue-200 transition-colors">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
            )}
            {(contact.phone || contact.cell) && (
              <div className="p-1.5 bg-green-100 border border-green-200 rounded-full shadow-sm hover:bg-green-200 transition-colors">
                <Phone className="h-4 w-4 text-green-600" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}