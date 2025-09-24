import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { X, CalendarIcon, Filter, RotateCcw, Search, Tag } from 'lucide-react';
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EmailFiltersProps {
  onFiltersChange?: (filters: any) => void;
  onClearFilters?: () => void;
}

interface FilterState {
  dateFrom?: Date;
  dateTo?: Date;
  senders: string[];
  status: string[];
  priority: string[];
  categories: string[];
  hasAttachments: boolean;
  aiClassified: boolean;
  confidenceThreshold: number[];
  readStatus: string;
  keywords: string;
  minLength: number;
  maxLength: number;
}

export const EmailFilters: React.FC<EmailFiltersProps> = ({
  onFiltersChange,
  onClearFilters
}) => {
  const [filters, setFilters] = useState<FilterState>({
    senders: [],
    status: [],
    priority: [],
    categories: [],
    hasAttachments: false,
    aiClassified: false,
    confidenceThreshold: [70],
    readStatus: 'all',
    keywords: '',
    minLength: 0,
    maxLength: 10000
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Opzioni per i filtri
  const statusOptions = [
    { value: 'unread', label: 'Non lette' },
    { value: 'read', label: 'Lette' },
    { value: 'replied', label: 'Risposte' },
    { value: 'archived', label: 'Archiviate' },
    { value: 'draft', label: 'Bozze' }
  ];

  const priorityOptions = [
    { value: 'high', label: 'Alta', color: 'destructive' },
    { value: 'medium', label: 'Media', color: 'default' },
    { value: 'low', label: 'Bassa', color: 'secondary' }
  ];

  const categoryOptions = [
    { value: 'vendite', label: 'Vendite' },
    { value: 'supporto', label: 'Supporto' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'amministrativo', label: 'Amministrativo' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'interno', label: 'Interno' }
  ];

  const senderOptions = [
    'cliente@esempio.com',
    'partner@azienda.com',
    'supporto@fornitore.com',
    'marketing@servizi.com',
    'hr@partner.com'
  ];

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    
    // Calcola il numero di filtri attivi
    let count = 0;
    if (updatedFilters.dateFrom || updatedFilters.dateTo) count++;
    if (updatedFilters.senders.length > 0) count++;
    if (updatedFilters.status.length > 0) count++;
    if (updatedFilters.priority.length > 0) count++;
    if (updatedFilters.categories.length > 0) count++;
    if (updatedFilters.hasAttachments) count++;
    if (updatedFilters.aiClassified) count++;
    if (updatedFilters.readStatus !== 'all') count++;
    if (updatedFilters.keywords.trim()) count++;
    if (updatedFilters.minLength > 0 || updatedFilters.maxLength < 10000) count++;
    
    setActiveFiltersCount(count);
    onFiltersChange?.(updatedFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters: FilterState = {
      senders: [],
      status: [],
      priority: [],
      categories: [],
      hasAttachments: false,
      aiClassified: false,
      confidenceThreshold: [70],
      readStatus: 'all',
      keywords: '',
      minLength: 0,
      maxLength: 10000
    };
    
    setFilters(clearedFilters);
    setActiveFiltersCount(0);
    onClearFilters?.();
  };

  const toggleArrayFilter = (array: string[], value: string) => {
    return array.includes(value)
      ? array.filter(item => item !== value)
      : [...array, value];
  };

  const removeFilter = (filterType: string, value?: string) => {
    switch (filterType) {
      case 'dateRange':
        updateFilters({ dateFrom: undefined, dateTo: undefined });
        break;
      case 'sender':
        updateFilters({ senders: filters.senders.filter(s => s !== value) });
        break;
      case 'status':
        updateFilters({ status: filters.status.filter(s => s !== value) });
        break;
      case 'priority':
        updateFilters({ priority: filters.priority.filter(p => p !== value) });
        break;
      case 'category':
        updateFilters({ categories: filters.categories.filter(c => c !== value) });
        break;
      case 'attachments':
        updateFilters({ hasAttachments: false });
        break;
      case 'aiClassified':
        updateFilters({ aiClassified: false });
        break;
      case 'readStatus':
        updateFilters({ readStatus: 'all' });
        break;
      case 'keywords':
        updateFilters({ keywords: '' });
        break;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtri Email
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Cancella Tutti
            </Button>
          )}
        </div>

        {/* Filtri attivi */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {filters.dateFrom && (
              <Badge variant="outline" className="gap-1">
                Dal {format(filters.dateFrom, "dd/MM/yyyy")}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('dateRange')}
                />
              </Badge>
            )}
            
            {filters.senders.map(sender => (
              <Badge key={sender} variant="outline" className="gap-1">
                {sender}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('sender', sender)}
                />
              </Badge>
            ))}
            
            {filters.status.map(status => (
              <Badge key={status} variant="outline" className="gap-1">
                {statusOptions.find(s => s.value === status)?.label}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('status', status)}
                />
              </Badge>
            ))}
            
            {filters.priority.map(priority => (
              <Badge key={priority} variant="outline" className="gap-1">
                {priorityOptions.find(p => p.value === priority)?.label}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('priority', priority)}
                />
              </Badge>
            ))}
            
            {filters.categories.map(category => (
              <Badge key={category} variant="outline" className="gap-1">
                {categoryOptions.find(c => c.value === category)?.label}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('category', category)}
                />
              </Badge>
            ))}
            
            {filters.hasAttachments && (
              <Badge variant="outline" className="gap-1">
                Con allegati
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('attachments')}
                />
              </Badge>
            )}
            
            {filters.aiClassified && (
              <Badge variant="outline" className="gap-1">
                Classificate AI
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('aiClassified')}
                />
              </Badge>
            )}
            
            {filters.readStatus !== 'all' && (
              <Badge variant="outline" className="gap-1">
                {filters.readStatus === 'read' ? 'Solo lette' : 'Solo non lette'}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('readStatus')}
                />
              </Badge>
            )}
            
            {filters.keywords.trim() && (
              <Badge variant="outline" className="gap-1">
                "{filters.keywords}"
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeFilter('keywords')}
                />
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Range di date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Data inizio</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Seleziona data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) => updateFilters({ dateFrom: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Data fine</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateTo ? format(filters.dateTo, "PPP") : "Seleziona data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(date) => updateFilters({ dateTo: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Parole chiave */}
        <div>
          <Label htmlFor="keywords">Parole chiave</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="keywords"
              placeholder="Cerca nel contenuto..."
              value={filters.keywords}
              onChange={(e) => updateFilters({ keywords: e.target.value })}
              className="pl-8"
            />
          </div>
        </div>

        {/* Mittenti */}
        <div>
          <Label>Mittenti</Label>
          <div className="space-y-2 mt-2">
            {senderOptions.map((sender) => (
              <div key={sender} className="flex items-center space-x-2">
                <Checkbox
                  id={`sender-${sender}`}
                  checked={filters.senders.includes(sender)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateFilters({ senders: [...filters.senders, sender] });
                    } else {
                      updateFilters({ senders: filters.senders.filter(s => s !== sender) });
                    }
                  }}
                />
                <Label htmlFor={`sender-${sender}`} className="text-sm">
                  {sender}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <Label>Status</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {statusOptions.map((status) => (
              <div key={status.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status.value}`}
                  checked={filters.status.includes(status.value)}
                  onCheckedChange={(checked) => {
                    updateFilters({
                      status: checked 
                        ? [...filters.status, status.value]
                        : filters.status.filter(s => s !== status.value)
                    });
                  }}
                />
                <Label htmlFor={`status-${status.value}`} className="text-sm">
                  {status.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Priorità */}
        <div>
          <Label>Priorità</Label>
          <div className="flex space-x-4 mt-2">
            {priorityOptions.map((priority) => (
              <div key={priority.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`priority-${priority.value}`}
                  checked={filters.priority.includes(priority.value)}
                  onCheckedChange={(checked) => {
                    updateFilters({
                      priority: checked 
                        ? [...filters.priority, priority.value]
                        : filters.priority.filter(p => p !== priority.value)
                    });
                  }}
                />
                <Label htmlFor={`priority-${priority.value}`} className="text-sm">
                  <Badge variant={priority.color as any} className="text-xs">
                    {priority.label}
                  </Badge>
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Categorie */}
        <div>
          <Label>Categorie</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {categoryOptions.map((category) => (
              <div key={category.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category.value}`}
                  checked={filters.categories.includes(category.value)}
                  onCheckedChange={(checked) => {
                    updateFilters({
                      categories: checked 
                        ? [...filters.categories, category.value]
                        : filters.categories.filter(c => c !== category.value)
                    });
                  }}
                />
                <Label htmlFor={`category-${category.value}`} className="text-sm">
                  {category.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Opzioni avanzate */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Opzioni Avanzate</Label>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="attachments" className="text-sm">
              Solo email con allegati
            </Label>
            <Switch
              id="attachments"
              checked={filters.hasAttachments}
              onCheckedChange={(checked) => updateFilters({ hasAttachments: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="ai-classified" className="text-sm">
              Solo email classificate da AI
            </Label>
            <Switch
              id="ai-classified"
              checked={filters.aiClassified}
              onCheckedChange={(checked) => updateFilters({ aiClassified: checked })}
            />
          </div>

          {filters.aiClassified && (
            <div>
              <Label className="text-sm">
                Soglia di confidenza AI: {filters.confidenceThreshold[0]}%
              </Label>
              <Slider
                value={filters.confidenceThreshold}
                onValueChange={(value) => updateFilters({ confidenceThreshold: value })}
                max={100}
                min={50}
                step={5}
                className="mt-2"
              />
            </div>
          )}

          <div>
            <Label htmlFor="read-status" className="text-sm">Stato di lettura</Label>
            <Select 
              value={filters.readStatus} 
              onValueChange={(value) => updateFilters({ readStatus: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                <SelectItem value="read">Solo lette</SelectItem>
                <SelectItem value="unread">Solo non lette</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};