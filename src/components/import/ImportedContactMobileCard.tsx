import React from 'react';
import { Phone, Mail, FileText, Trash2, Building, MapPin, Flag, Pickaxe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  onCreateActivity: () => void;
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
  onCreateActivity,
  getCompanyActivities,
  getCountryFlag,
  formatCellValue
}: ImportedContactMobileCardProps) {

  return (
    <TooltipProvider>
      <Card className={cn(
        "border transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 rounded-xl bg-gradient-to-br from-background to-muted/30",
        isSelected && "ring-2 ring-primary border-primary bg-primary/5 shadow-md"
      )}>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Checkbox with enhanced styling */}
            <div className="relative">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect(index, !!checked)}
                className="mt-1 h-5 w-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-200"
              />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Header with enhanced styling */}
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-3 min-w-0">
                   {contact.note && (
                     <div className="bg-blue-100 p-1.5 rounded-full">
                       <FileText className="h-3 w-3 text-blue-600" />
                     </div>
                   )}
                 </div>
                 {/* Icons row */}
                 <div className="flex items-center gap-2">
                   {/* Create activity icon */}
                   <div 
                     className="bg-primary/10 p-1.5 rounded-full cursor-pointer hover:bg-primary/20 transition-colors flex items-center justify-center"
                     onClick={onCreateActivity}
                   >
                     <Pickaxe className="h-3.5 w-3.5 text-primary" />
                   </div>
                   {/* Mail icon with tooltip */}
                   {contact.email && (
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <div className="bg-blue-100 p-1.5 rounded-full cursor-pointer hover:bg-blue-200 transition-colors flex items-center justify-center">
                           <Mail className="h-3.5 w-3.5 text-blue-600" />
                         </div>
                       </TooltipTrigger>
                       <TooltipContent>
                         <p>{contact.email}</p>
                       </TooltipContent>
                     </Tooltip>
                   )}
                 </div>
               </div>

              {/* Company Name with enhanced styling and record number */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-muted/50 text-muted-foreground px-2 py-1 rounded text-xs font-mono">
                    #{index + 1}
                  </div>
                  <div 
                    className="font-semibold text-lg text-primary cursor-pointer hover:underline truncate transition-colors duration-200 hover:text-primary/80 flex-1"
                    onClick={onView}
                  >
                    {contact.company_name || contact.name || 'Azienda non specificata'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ActivityIndicators 
                    companyId={contact.id} 
                    activities={getCompanyActivities(contact.id)}
                    size="sm"
                  />
                </div>
              </div>

              {/* Contact Details with enhanced styling */}
              {contact.name && contact.name !== contact.company_name && (
                <div className="rounded-lg p-3 mb-3 border border-border">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <div className="p-1 rounded-full border border-primary/20">
                      👤
                    </div>
                    <span className="font-medium">{formatCellValue(contact.name)}</span>
                  </div>
                </div>
              )}

              {/* Location with enhanced styling */}
              <div className="flex items-center gap-4 text-sm mb-4">
                {contact.country && (
                  <div className="flex items-center gap-2 bg-muted/30 rounded-full px-3 py-1.5">
                    <span className="text-lg">{getCountryFlag(contact.country)}</span>
                    <span className="font-medium text-foreground">{formatCellValue(contact.country)}</span>
                  </div>
                )}
                {contact.city && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{formatCellValue(contact.city)}</span>
                  </div>
                )}
              </div>

              {/* Contact Methods with enhanced styling */}
              <div className="flex items-center gap-3 mb-4">
                {contact.email && (
                  <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-full text-sm font-medium">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </div>
                )}
                {(contact.phone || contact.cell) && (
                  <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-full text-sm font-medium">
                    <Phone className="h-4 w-4" />
                    <span>Tel</span>
                  </div>
                )}
              </div>

              {/* Origin with enhanced styling */}
              {contact.origin && (
                <div className="flex justify-between items-end">
                  <Badge variant="outline" className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 text-primary font-medium px-3 py-1">
                    {formatCellValue(contact.origin)}
                  </Badge>
                  {/* Delete button moved to bottom */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              {!contact.origin && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}