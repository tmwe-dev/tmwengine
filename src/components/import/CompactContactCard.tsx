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
      "border transition-all duration-200 hover:shadow-sm bg-background",
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
                  
                  {/* Contatti disponibili */}
                  <div className="flex items-center gap-1 ml-auto">
                    {contact.email && <Mail className="h-3 w-3 text-blue-500" />}
                    {(contact.phone || contact.cell) && <Phone className="h-3 w-3 text-green-500" />}
                  </div>
                </div>
              </div>
              
              {/* Azioni compatte */}
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onView}
                  className="h-6 w-6 p-0 text-blue-500 hover:text-blue-600"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            {/* Persona di contatto se diversa dall'azienda */}
            {contact.name && contact.name !== contact.company_name && (
              <div className="text-xs text-muted-foreground mt-1 truncate">
                👤 {formatCellValue(contact.name)}
              </div>
            )}
            
            {/* Origin badge se presente */}
            {contact.origin && (
              <div className="mt-1">
                <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                  {formatCellValue(contact.origin)}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}