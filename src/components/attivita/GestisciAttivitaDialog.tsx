import React, { useState } from 'react';
import { Calendar, Clock, Edit3, History, Save, X, Phone, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  tipo: 'chiamata' | 'meeting' | 'email' | 'task';
  descrizione: string;
  stato: 'aperta' | 'in_corso' | 'completata' | 'annullata';
  scadenza?: string;
  priorita: 'alta' | 'media' | 'bassa';
  note?: string;
  data_creazione: string;
  ora_creazione?: string;
  data_ultima_modifica?: string;
  modifiche_log?: any[];
  rubrica_nome?: string;
  rubrica_id?: string;
  cellulare?: string;
  telefono?: string;
}

interface GestisciAttivitaDialogProps {
  isOpen: boolean;
  activity: Activity | null;
  onClose: () => void;
  onSave: (updatedActivity: Partial<Activity>, updateCompany?: boolean) => void;
}

export function GestisciAttivitaDialog({ 
  isOpen, 
  activity, 
  onClose, 
  onSave 
}: GestisciAttivitaDialogProps) {
  const [formData, setFormData] = useState<Partial<Activity>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [showUpdateCompanyDialog, setShowUpdateCompanyDialog] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<Partial<Activity> | null>(null);

  React.useEffect(() => {
    if (activity) {
      setFormData({
        descrizione: activity.descrizione,
        stato: activity.stato,
        priorita: activity.priorita,
        note: activity.note || '',
        scadenza: activity.scadenza,
        cellulare: activity.cellulare || '',
        telefono: activity.telefono || ''
      });
      
      if (activity.scadenza) {
        const date = new Date(activity.scadenza);
        setSelectedDate(date);
        setSelectedTime(format(date, 'HH:mm'));
      }
    }
  }, [activity]);

  const handleSave = () => {
    let scadenza = formData.scadenza;
    
    // Se abbiamo una nuova data e ora, combinale
    if (selectedDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(':');
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(hours), parseInt(minutes));
      scadenza = newDate.toISOString();
    } else if (selectedDate) {
      scadenza = selectedDate.toISOString();
    }

    const updatedData = {
      ...formData,
      scadenza
    };

    // Se il cellulare o telefono è cambiato e c'è un rubrica_id, chiedi se aggiornare l'azienda
    const phoneChanged = formData.cellulare !== activity?.cellulare || formData.telefono !== activity?.telefono;
    if (phoneChanged && activity?.rubrica_id) {
      setPendingUpdate(updatedData);
      setShowUpdateCompanyDialog(true);
    } else {
      onSave(updatedData);
      onClose();
    }
  };

  const handleConfirmUpdate = (updateCompany: boolean) => {
    if (pendingUpdate) {
      onSave(pendingUpdate, updateCompany);
      onClose();
    }
    setShowUpdateCompanyDialog(false);
    setPendingUpdate(null);
  };

  const getActivityIcon = (tipo: string) => {
    switch (tipo) {
      case 'chiamata': return '📞';
      case 'email': return '✉️';
      case 'meeting': return '👥';
      case 'task': return '📄';
      default: return '📄';
    }
  };

  const getStatoBadgeVariant = (stato: string) => {
    switch (stato) {
      case 'aperta': return 'default';
      case 'in_corso': return 'secondary';
      case 'completata': return 'default';
      case 'annullata': return 'destructive';
      default: return 'default';
    }
  };

  if (!activity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] flex flex-col overflow-hidden p-3 sm:p-4">
        <DialogHeader className="flex-shrink-0 space-y-2 pb-2">
          {/* Breadcrumb compatto */}
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <BreadcrumbLink>Attività</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3 w-3" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium">Gestione</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Titolo compatto */}
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{getActivityIcon(activity.tipo)}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg">Gestisci Attività</span>
                <Badge variant={getStatoBadgeVariant(activity.stato)} className="text-xs">
                  {activity.stato.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              {activity.rubrica_nome && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {activity.rubrica_nome}
                </div>
              )}
              {/* Data creazione sotto il titolo */}
              <div className="text-xs text-blue-600 font-medium mt-1">
                Creata il {format(new Date(activity.data_creazione), 'dd/MM/yyyy')}
                {activity.ora_creazione && <span className="ml-1">ore {activity.ora_creazione}</span>}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          <div>
            {/* Form di modifica */}
            <div className="space-y-3">
              {/* Prima riga: Stato, Priorità, Icona (a sinistra) e Scadenza (a destra) */}
              <div className="flex justify-between items-end">
                <div className="flex gap-2 items-end">
                  <div className="w-32">
                    <Label htmlFor="stato" className="text-sm">Stato</Label>
                    <Select 
                      value={formData.stato} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, stato: value as Activity['stato'] }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aperta">Aperta</SelectItem>
                        <SelectItem value="in_corso">In Corso</SelectItem>
                        <SelectItem value="completata">Completata</SelectItem>
                        <SelectItem value="annullata">Annullata</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-32">
                    <Label htmlFor="priorita" className="text-sm">Priorità</Label>
                    <Select 
                      value={formData.priorita} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, priorita: value as Activity['priorita'] }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="bassa">Bassa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-center w-9 h-9 text-2xl">
                    {getActivityIcon(activity.tipo)}
                  </div>
                </div>

                {/* Scadenza a destra */}
                <div>
                  <Label className="text-sm">Scadenza</Label>
                  <div className="flex gap-2 mt-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-36 justify-start text-left font-normal h-9 text-sm",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-1 h-3 w-3" />
                          {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-24 h-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Telefoni compatti - affiancati su una riga */}
              <div className="flex gap-3 mt-6">
                <div className="w-40">
                  <Label htmlFor="telefono" className="text-sm flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Telefono
                  </Label>
                  <Input
                    id="telefono"
                    type="tel"
                    value={formData.telefono || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                
                <div className="w-40">
                  <Label htmlFor="cellulare" className="text-sm flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Cellulare
                  </Label>
                  <Input
                    id="cellulare"
                    type="tel"
                    value={formData.cellulare || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, cellulare: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Descrizione e Note affiancati */}
              <div className="flex gap-4 mt-6">
                <div className="flex-1">
                  <Label htmlFor="descrizione" className="text-sm">Descrizione</Label>
                  <Textarea
                    id="descrizione"
                    value={formData.descrizione || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, descrizione: e.target.value }))}
                    className="h-[250px] text-sm resize-none"
                  />
                </div>

                <div className="flex-1">
                  <Label htmlFor="note" className="text-sm">Note</Label>
                  <Textarea
                    id="note"
                    value={formData.note || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="Note aggiuntive..."
                    className="h-[250px] text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Storico modifiche */}
          {activity.modifiche_log && activity.modifiche_log.length > 0 && (
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 mb-3"
              >
                <History className="h-4 w-4" />
                Storico Modifiche ({activity.modifiche_log.length})
              </Button>
              
              {showHistory && (
                <div className="space-y-2 max-h-40 overflow-y-auto bg-muted/20 p-3 rounded">
                  {activity.modifiche_log.map((modifica, index) => (
                    <div key={index} className="text-xs border-l-2 border-blue-500 pl-3 py-1">
                      <div className="font-medium">
                        {format(new Date(modifica.timestamp), 'dd/MM/yyyy HH:mm')}
                      </div>
                      <div className="text-muted-foreground">
                        Campo modificato: {modifica.campo_modificato}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Azioni */}
        <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Annulla
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Salva Modifiche
          </Button>
        </div>
      </DialogContent>

      {/* Dialog di conferma aggiornamento azienda */}
      <AlertDialog open={showUpdateCompanyDialog} onOpenChange={setShowUpdateCompanyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aggiornare anche l'azienda?</AlertDialogTitle>
            <AlertDialogDescription>
              Hai modificato il numero di telefono o cellulare. Vuoi aggiornare anche il record dell'azienda nella rubrica con i nuovi numeri?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleConfirmUpdate(false)}>
              Solo attività
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConfirmUpdate(true)}>
              Aggiorna azienda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}