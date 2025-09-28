import React from 'react';
import { Phone, Mail, FileText, Trash2, Building, MapPin, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ActivityIndicators } from '@/components/ui/activity-indicators';

interface ImportedContact {
  [key: string]: any;
}

interface ImportedContactMobileCardProps {
  contact: ImportedContact;
  index: number;
  isSelected: boolean;
  onSelect: (index: number, selected: boolean) => void;
  onView: () => void;
  onDelete: () => void;
  getCompanyActivities: (companyId: string) => any[];
  getCountryFlag: (countryName: string) => string;
  formatCellValue: (value: any, fieldKey?: string) => string;
}

export function ImportedContactMobileCard({
  contact,
  index,
  isSelected,
  onSelect,
  onView,
  onDelete,
  getCompanyActivities,
  getCountryFlag,
  formatCellValue
}: ImportedContactMobileCardProps) {

  return (
    <Card className={cn(
      "border transition-all duration-200 hover:shadow-md",
      isSelected && "ring-2 ring-primary border-primary"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(index, !!checked)}
            className="mt-1"
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                {contact.note && (
                  <FileText className="h-3 w-3 text-blue-500 flex-shrink-0" />
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Company Name */}
            <div className="mb-2">
              <div 
                className="font-medium text-primary cursor-pointer hover:underline truncate"
                onClick={onView}
              >
                {contact.company_name || contact.name || 'Azienda non specificata'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <ActivityIndicators 
                  companyId={contact.id} 
                  activities={getCompanyActivities(contact.id)}
                  size="sm"
                />
              </div>
            </div>

            {/* Contact Details */}
            {contact.name && contact.name !== contact.company_name && (
              <div className="text-sm text-muted-foreground mb-1">
                👤 {formatCellValue(contact.name)}
              </div>
            )}

            {/* Location */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              {contact.country && (
                <div className="flex items-center gap-1">
                  <span>{getCountryFlag(contact.country)}</span>
                  <span>{formatCellValue(contact.country)}</span>
                </div>
              )}
              {contact.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{formatCellValue(contact.city)}</span>
                </div>
              )}
            </div>

            {/* Contact Methods */}
            <div className="flex items-center gap-4 text-sm">
              {contact.email && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Mail className="h-3 w-3" />
                  <span className="text-xs">Email</span>
                </div>
              )}
              {(contact.phone || contact.cell) && (
                <div className="flex items-center gap-1 text-green-600">
                  <Phone className="h-3 w-3" />
                  <span className="text-xs">Tel</span>
                </div>
              )}
            </div>

            {/* Origin */}
            {contact.origin && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
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