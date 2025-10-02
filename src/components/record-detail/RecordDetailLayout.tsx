import React, { useState } from 'react';
import { FieldRenderer } from './FieldRenderer';
import { MobileRecordDetailLayout } from './MobileRecordDetailLayout';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building, Users, Mail, Phone, MapPin, Database, Clock, Settings, Search, Award, Apple, ChevronDown, ChevronRight, UserPlus, FileText, Plus, Calendar } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AdvancedMultipleActivityForm } from '@/components/attivita/AdvancedMultipleActivityForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCompanyActivities } from '@/hooks/useCompanyActivities';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface RecordDetailLayoutProps {
  record: any;
  formatCellValue: (value: any, fieldKey?: string) => string;
}

export function RecordDetailLayout({ record, formatCellValue }: RecordDetailLayoutProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { getCompanyActivities, getActivityCount } = useCompanyActivities();
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [showSystemDetails, setShowSystemDetails] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(record.note || record.notes || '');
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  
  // Modalità modifica sempre attiva - rimosso isEditing
  const [editValues, setEditValues] = useState({
    address: record.address || record.indirizzo || '',
    city: record.city || record.citta || '',
    zip_code: record.zip_code || '',
    country: record.country || record.paese || '',
    email: record.email || '',
    phone: record.phone || record.telefono || '',
    cell: record.cell || record.cellulare || '',
    company_name: record.company_name || record.azienda || '',
    company_alias: record.company_alias || '',
    name: record.name || record.nome || '',
    alias: record.alias || '',
    title: record.title || '',
    position: record.position || '',
    origin: record.origin || record.origine || '',
  });

  // Recupera le attività del contatto
  const activities = getCompanyActivities(record.id);
  const activityCount = getActivityCount(record.id);

  // Use mobile layout for mobile devices
  if (isMobile) {
    return <MobileRecordDetailLayout record={record} formatCellValue={formatCellValue} />;
  }

  // Function to get country code for flag
  const getCountryCode = (country: string) => {
    if (!country) return 'UN'; // United Nations flag as default
    
    const countryMap: { [key: string]: string } = {
      'italy': 'IT',
      'italia': 'IT',
      'united states': 'US',
      'usa': 'US',
      'america': 'US',
      'stati uniti': 'US',
      'germany': 'DE',
      'germania': 'DE',
      'france': 'FR',
      'francia': 'FR',
      'spain': 'ES',
      'spagna': 'ES',
      'united kingdom': 'GB',
      'uk': 'GB',
      'regno unito': 'GB',
      'england': 'GB',
      'inghilterra': 'GB',
      'china': 'CN',
      'cina': 'CN',
      'japan': 'JP',
      'giappone': 'JP',
      'canada': 'CA',
      'australia': 'AU',
      'brazil': 'BR',
      'brasile': 'BR',
      'india': 'IN',
      'russia': 'RU',
      'russian federation': 'RU',
      'federazione russa': 'RU',
      'netherlands': 'NL',
      'olanda': 'NL',
      'paesi bassi': 'NL',
      'belgium': 'BE',
      'belgio': 'BE',
      'switzerland': 'CH',
      'svizzera': 'CH',
      'austria': 'AT',
      'poland': 'PL',
      'polonia': 'PL',
      'portugal': 'PT',
      'portogallo': 'PT',
      'greece': 'GR',
      'grecia': 'GR',
      'turkey': 'TR',
      'turchia': 'TR',
      'south korea': 'KR',
      'korea': 'KR',
      'corea del sud': 'KR',
      'corea': 'KR',
      'mexico': 'MX',
      'messico': 'MX',
      'argentina': 'AR',
      'sweden': 'SE',
      'svezia': 'SE',
      'norway': 'NO',
      'norvegia': 'NO',
      'denmark': 'DK',
      'danimarca': 'DK',
      'finland': 'FI',
      'finlandia': 'FI',
      'ireland': 'IE',
      'irlanda': 'IE',
      'croatia': 'HR',
      'croazia': 'HR',
      'czech republic': 'CZ',
      'repubblica ceca': 'CZ',
      'hungary': 'HU',
      'ungheria': 'HU',
      'romania': 'RO',
      'bulgaria': 'BG',
      'slovenia': 'SI',
      'slovakia': 'SK',
      'slovacchia': 'SK',
      'estonia': 'EE',
      'latvia': 'LV',
      'lettonia': 'LV',
      'lithuania': 'LT',
      'lituania': 'LT'
    };
    
    const lowerCountry = country.toLowerCase().trim();
    return countryMap[lowerCountry] || 'UN';
  };

  const handleImportToRubrica = async () => {
    setIsImporting(true);
    try {
      // Usa la funzione database per trasferimento completo con attività
      const { data, error } = await supabase.rpc('transfer_company_to_rubrica', {
        imported_contact_id: record.id
      });

      if (error) {
        throw error;
      }

      const result = data as {
        success: boolean;
        new_rubrica_id: string;
        activities_transferred: number;
        message: string;
      };

      if (result.success) {
        toast({
          title: "Azienda trasferita",
          description: result.message,
        });
        
        // Il record viene automaticamente rimosso dalle tabelle import dalla funzione
        // Non è necessario aggiornare lo stato locale
      } else {
        throw new Error('Trasferimento fallito');
      }

    } catch (error) {
      console.error('Error importing to rubrica:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il trasferimento dell'azienda.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveNote = async () => {
    try {
      // Determina la tabella in base ai campi presenti nel record
      const isImportedContact = record.hasOwnProperty('import_log_id');
      const tableName = isImportedContact ? 'imported_contacts' : 'rubrica';
      
      const { error } = await supabase
        .from(tableName)
        .update({ note: noteValue })
        .eq('id', record.id);

      if (error) {
        throw error;
      }

      // Aggiorna il record locale
      record.note = noteValue;
      setEditingNote(false);
      
      toast({
        title: "Note salvate",
        description: "Le note sono state aggiornate con successo.",
      });
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio delle note.",
        variant: "destructive",
      });
    }
  };

  const handleSaveFields = async () => {
    try {
      // Determina la tabella in base ai campi presenti nel record
      const isImportedContact = record.hasOwnProperty('import_log_id');
      const tableName = isImportedContact ? 'imported_contacts' : 'rubrica';
      
      // Prepara l'oggetto di aggiornamento con i campi corretti per la tabella
      const updateData: any = {};
      
      if (isImportedContact) {
        updateData.address = editValues.address;
        updateData.city = editValues.city;
        updateData.zip_code = editValues.zip_code;
        updateData.country = editValues.country;
        updateData.email = editValues.email;
        updateData.phone = editValues.phone;
        updateData.cell = editValues.cell;
        updateData.company_name = editValues.company_name;
        updateData.company_alias = editValues.company_alias;
        updateData.name = editValues.name;
        updateData.alias = editValues.alias;
        updateData.title = editValues.title;
        updateData.position = editValues.position;
        updateData.origin = editValues.origin;
      } else {
        updateData.indirizzo = editValues.address;
        updateData.citta = editValues.city;
        updateData.zip_code = editValues.zip_code;
        updateData.paese = editValues.country;
        updateData.email = editValues.email;
        updateData.telefono = editValues.phone;
        updateData.cellulare = editValues.cell;
        updateData.azienda = editValues.company_name;
        updateData.company_alias = editValues.company_alias;
        updateData.nome = editValues.name;
        updateData.alias = editValues.alias;
        updateData.title = editValues.title;
        updateData.position = editValues.position;
        updateData.origine = editValues.origin;
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', record.id);

      if (error) {
        throw error;
      }

      // Aggiorna il record locale
      if (isImportedContact) {
        record.address = editValues.address;
        record.city = editValues.city;
        record.zip_code = editValues.zip_code;
        record.country = editValues.country;
        record.email = editValues.email;
        record.phone = editValues.phone;
        record.cell = editValues.cell;
        record.company_name = editValues.company_name;
        record.company_alias = editValues.company_alias;
        record.name = editValues.name;
        record.alias = editValues.alias;
        record.title = editValues.title;
        record.position = editValues.position;
        record.origin = editValues.origin;
      } else {
        record.indirizzo = editValues.address;
        record.citta = editValues.city;
        record.zip_code = editValues.zip_code;
        record.paese = editValues.country;
        record.email = editValues.email;
        record.telefono = editValues.phone;
        record.cellulare = editValues.cell;
        record.azienda = editValues.company_name;
        record.company_alias = editValues.company_alias;
        record.nome = editValues.name;
        record.alias = editValues.alias;
        record.title = editValues.title;
        record.position = editValues.position;
        record.origine = editValues.origin;
      }
      
      toast({
        title: "Modifiche salvate",
        description: "I dati sono stati aggiornati con successo.",
      });
    } catch (error) {
      console.error('Error saving fields:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio dei dati.",
        variant: "destructive",
      });
    }
  };

  const handleCreateActivity = async (activityData: any) => {
    try {
      // Crea l'attività basata sul tipo selezionato
      let descrizione = '';
      let tipo = activityData.tipo;
      
      if (activityData.tipo === 'email') {
        descrizione = `Email: ${activityData.oggetto_email || 'Nessun oggetto'}`;
      } else if (activityData.tipo === 'chiamata') {
        descrizione = `Chiamata: ${activityData.note_generali || 'Nessuna descrizione'}`;
      }

      const { data, error } = await supabase
        .from('attivita')
        .insert([{
          rubrica_id: record.id,
          tipo: tipo,
          descrizione: descrizione,
          stato: 'aperta',
          scadenza: null,
          priorita: activityData.priorita || 'media',
          assegnato_a: null,
          creato_da: null
        }])
        .select()
        .single();

      if (error) throw error;
      
      setIsActivityDialogOpen(false);
      toast({
        title: "Attività creata",
        description: "L'attività è stata creata con successo.",
      });
    } catch (error) {
      console.error('Error creating activity:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione dell'attività.",
        variant: "destructive",
      });
    }
  };
  
  
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink className="text-sm cursor-pointer" onClick={() => navigate('/gestisci-import')}>
              Record Importati
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-sm font-medium">
              {record.company_name || record.azienda || 'Dettaglio Record'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Pulsanti azione centrali - sticky */}
      <div className="sticky top-0 z-10 bg-background py-4 border-b">
        {/* Info località */}
        <div className="text-sm text-muted-foreground flex items-center gap-2 mb-3">
          <span className="text-base">
            {(() => {
              const countryCode = getCountryCode(record.country || record.paese || '');
              if (countryCode === 'UN') return '🌐';
              // Converti il codice ISO in emoji bandiera (es. IT -> 🇮🇹)
              return String.fromCodePoint(
                ...[...countryCode.toUpperCase()].map(char => 127397 + char.charCodeAt(0))
              );
            })()}
          </span>
          <span>{record.country || record.paese || "N/A"}</span>
          <span>•</span>
          <span>{record.city || record.citta || "N/A"}</span>
        </div>

        {/* Pulsanti */}
        <div className="flex justify-center items-center gap-3">
          {/* Pulsante Importa in Rubrica - solo per record importati */}
          {record.hasOwnProperty('is_imported_to_rubrica') && (
            <Button 
              onClick={handleImportToRubrica}
              disabled={isImporting || record.is_imported_to_rubrica}
              className="flex items-center gap-2"
              variant={record.is_imported_to_rubrica ? "outline" : "default"}
              size="default"
            >
              <UserPlus className="h-4 w-4" />
              {isImporting ? "Importando..." : 
               record.is_imported_to_rubrica ? "Già importato" : "Importa in Rubrica"}
            </Button>
          )}
          
          {/* Pulsante Crea Attività */}
          <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                size="default"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Crea Attività
              </Button>
            </DialogTrigger>
            <DialogContent className={cn("max-h-[85vh] flex flex-col", isMobile ? "max-w-[95vw] p-4" : "max-w-4xl")}>
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Crea Nuova Attività</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto">
                <AdvancedMultipleActivityForm
                  contacts={[{
                    id: record.id,
                    company_name: record.company_name || record.azienda || record.name || 'Azienda non specificata',
                    email: record.email,
                    phone: record.telefono || record.phone,
                    cell: record.cellulare || record.cell
                  }]}
                  onSubmit={handleCreateActivity}
                  onCancel={() => setIsActivityDialogOpen(false)}
                  isSubmitting={false}
                  showSaveToRubrica={false}
                />
              </div>
            </DialogContent>
          </Dialog>

          {/* Pulsante Aggiorna */}
          <Button
            variant="default"
            size="default"
            onClick={handleSaveFields}
          >
            Aggiorna
          </Button>
        </div>
      </div>
      
      {/* Header con country e città - rimosso perché ora è nella toolbar */}
      
      {/* Sezione Date Sistema - in alto sotto i selettori */}
      {(record.created_at !== undefined || record.updated_at !== undefined) && (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <Clock className="h-5 w-5 text-primary mt-5" />
            
            <div className="flex gap-4">
              {record.created_at !== undefined && (
                <div className="text-left">
                  <div className="text-sm font-medium text-blue-600 mb-1">
                    Created At
                  </div>
                  <div className="text-sm text-foreground">
                    {formatCellValue(record.created_at, 'created_at')}
                  </div>
                </div>
              )}
              
              {record.updated_at !== undefined && (
                <div className="text-left">
                  <div className="text-sm font-medium text-blue-600 mb-1">
                    Updated At
                  </div>
                  <div className="text-sm text-foreground">
                    {formatCellValue(record.updated_at, 'updated_at')}
                  </div>
                </div>
              )}
              
              {record.position !== undefined && (
                <div className="text-left">
                  <div className="text-sm font-medium text-blue-600 mb-1">
                    Position
                  </div>
                  <div className="text-sm text-foreground">
                    {formatCellValue(record.position, 'position')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sezione Informazioni Azienda */}
      <div className="space-y-4">
        <h3 className="font-semibold text-text-primary flex items-center gap-2 text-lg">
          <Building className="h-5 w-5 text-primary" />
          Informazioni Azienda
        </h3>
        <div className="flex items-start gap-4 pl-7">
          
          {/* Company fields + Origin sempre modificabili */}
          <div className="max-w-[200px] min-w-[200px]">
            <div>
              <Label className="text-xs text-blue-600 mb-1">Company Name</Label>
              <Input
                value={editValues.company_name}
                onChange={(e) => setEditValues(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Nome Azienda"
              />
            </div>
          </div>
          
          <div className="min-w-[200px]">
            <div>
              <Label className="text-xs text-blue-600 mb-1">Company Alias</Label>
              <Input
                value={editValues.company_alias}
                onChange={(e) => setEditValues(prev => ({ ...prev, company_alias: e.target.value }))}
                placeholder="Alias Azienda"
              />
            </div>
          </div>
          
          <div className="flex-1"></div>
          
          {/* Origin */}
          <div className="min-w-[140px]">
            <div>
              <Label className="text-xs text-blue-600 mb-1">Origin</Label>
              <Input
                value={editValues.origin}
                onChange={(e) => setEditValues(prev => ({ ...prev, origin: e.target.value }))}
                placeholder="Origine"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sezione Informazioni Contatto */}
      <div className="space-y-4">
        <h3 className="font-semibold text-text-primary flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Informazioni Contatto
        </h3>
        <div className="flex items-start gap-4 pl-7">
          
          {/* Name, Title, Alias sempre modificabili */}
          <div className="max-w-[200px] min-w-[180px]">
            <div>
              <Label className="text-xs text-blue-600 mb-1">Name</Label>
              <Input
                value={editValues.name}
                onChange={(e) => setEditValues(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome"
              />
            </div>
          </div>
          
          <div className="min-w-[160px]">
            <div>
              <Label className="text-xs text-blue-600 mb-1">Title</Label>
              <Input
                value={editValues.title}
                onChange={(e) => setEditValues(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Titolo"
              />
            </div>
          </div>
          
          <div className="min-w-[140px]">
            <div>
              <Label className="text-xs text-blue-600 mb-1">Alias</Label>
              <Input
                value={editValues.alias}
                onChange={(e) => setEditValues(prev => ({ ...prev, alias: e.target.value }))}
                placeholder="Alias"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sezione Contatti */}
      <div className="space-y-4">
        <h3 className="font-semibold text-text-primary flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-primary" />
          Contatti
        </h3>
        <div className="flex items-start gap-4 pl-7">
          
          {/* Campi contatti con icone - sempre modificabili */}
          <div className="flex-1 min-w-[250px] flex items-start gap-2">
            <Mail className="h-4 w-4 text-blue-500 mt-5" />
            <div className="flex-1">
              <Label className="text-xs text-blue-600 mb-1">Email</Label>
              <Input
                value={editValues.email}
                onChange={(e) => setEditValues(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                type="email"
              />
            </div>
          </div>
          
          <div className="min-w-[150px] flex items-start gap-2">
            <Phone className="h-4 w-4 text-green-500 mt-5" />
            <div className="flex-1">
              <Label className="text-xs text-blue-600 mb-1">Phone</Label>
              <Input
                value={editValues.phone}
                onChange={(e) => setEditValues(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Telefono"
              />
            </div>
          </div>
          
          <div className="min-w-[150px] flex items-start gap-2">
            <Phone className="h-4 w-4 text-orange-500 mt-5" />
            <div className="flex-1">
              <Label className="text-xs text-blue-600 mb-1">Cell</Label>
              <Input
                value={editValues.cell}
                onChange={(e) => setEditValues(prev => ({ ...prev, cell: e.target.value }))}
                placeholder="Cellulare"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sezione Ubicazione - sempre visibile */}
      <div className="space-y-4">
          <div className="flex items-start gap-4">
            <button 
              onClick={() => setShowLocationDetails(!showLocationDetails)}
              className="h-5 w-5 text-primary mt-1 hover:text-primary/80 transition-colors"
            >
              {showLocationDetails ? <ChevronDown /> : <ChevronRight />}
            </button>
            <span className="text-sm font-medium text-muted-foreground mt-1">
              Dettagli Ubicazione
            </span>
          </div>
          
          {showLocationDetails && (
            <div className="flex items-start gap-4 ml-9">
              <div className="max-w-[200px] min-w-[200px]">
                <div>
                  <Label className="text-xs text-blue-600 mb-1">City</Label>
                  <Input
                    value={editValues.city}
                    onChange={(e) => setEditValues(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Città"
                  />
                </div>
              </div>
              
              <div className="max-w-[200px] min-w-[100px]">
                <div>
                  <Label className="text-xs text-blue-600 mb-1">Zip Code</Label>
                  <Input
                    value={editValues.zip_code}
                    onChange={(e) => setEditValues(prev => ({ ...prev, zip_code: e.target.value }))}
                    placeholder="CAP"
                  />
                </div>
              </div>
              
              <div className="max-w-[200px] min-w-[200px]">
                <div>
                  <Label className="text-xs text-blue-600 mb-1">Address</Label>
                  <Input
                    value={editValues.address}
                    onChange={(e) => setEditValues(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Indirizzo"
                  />
                </div>
              </div>
              
              <div className="max-w-[200px] min-w-[150px]">
                <div>
                  <Label className="text-xs text-blue-600 mb-1">Country</Label>
                  <Input
                    value={editValues.country}
                    onChange={(e) => setEditValues(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="Paese"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Sezione Date e Programmazioni */}
      {(record.last_contact !== undefined || record.next_contact_date !== undefined || record.scheduled_contact !== undefined) && (
        <div className="space-y-4">
          <h3 className="font-semibold text-text-primary flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Programmazioni Contatto
          </h3>
          <div className="flex items-start gap-4 pl-7">
            
            <div className="flex gap-6">
              {record.last_contact !== undefined && (
                <div className="text-left">
                  <div className="text-sm font-medium text-blue-600 mb-1">
                    Last Contact
                  </div>
                  <div className="text-sm text-foreground">
                    {formatCellValue(record.last_contact, 'last_contact')}
                  </div>
                </div>
              )}
              
              {record.next_contact_date !== undefined && (
                <div className="text-left">
                  <div className="text-sm font-medium text-blue-600 mb-1">
                    Next Contact Date
                  </div>
                  <div className="text-sm text-foreground">
                    {formatCellValue(record.next_contact_date, 'next_contact_date')}
                  </div>
                </div>
              )}
              
              {record.scheduled_contact !== undefined && (
                <div className="text-left">
                  <div className="text-sm font-medium text-blue-600 mb-1">
                    Scheduled Contact
                  </div>
                  <div className="text-sm text-foreground">
                    {formatCellValue(record.scheduled_contact, 'scheduled_contact')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sezione Note */}
      <div className="space-y-4">
        <h3 className="font-semibold text-text-primary flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Note
        </h3>
        <div className="flex items-start gap-4 pl-7">
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-blue-600">Note</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (editingNote) {
                    handleSaveNote();
                  } else {
                    setEditingNote(true);
                  }
                }}
              >
                {editingNote ? 'Salva' : 'Modifica'}
              </Button>
            </div>
            
            {editingNote ? (
              <div className="space-y-2">
                <Textarea
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  placeholder="Inserisci le note..."
                  className="min-h-[100px] resize-y"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNoteValue(record.note || record.notes || '');
                      setEditingNote(false);
                    }}
                  >
                    Annulla
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-muted/20 rounded-md border min-h-[60px]">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {noteValue || 'Nessuna nota presente. Clicca "Modifica" per aggiungerne una.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sezione Informazioni Sistema */}
      {(record.original_id !== undefined || record.commercial_anagrafiche_id !== undefined || record.stato !== undefined || record.agent_id !== undefined || record.completed !== undefined || record.archiviata !== undefined || record.has_actions !== undefined || record.row_number !== undefined || record.is_imported_to_rubrica !== undefined) && (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <button 
              onClick={() => setShowSystemDetails(!showSystemDetails)}
              className="h-5 w-5 text-primary mt-1 hover:text-primary/80 transition-colors"
            >
              {showSystemDetails ? <ChevronDown /> : <ChevronRight />}
            </button>
            <span className="text-sm font-medium text-muted-foreground mt-1">
              Informazioni Sistema
            </span>
          </div>
          
          {showSystemDetails && (
            <div className={cn("gap-4 ml-9", isMobile ? "grid grid-cols-1" : "grid grid-cols-1 md:grid-cols-4")}>
              {['original_id', 'commercial_anagrafiche_id', 'stato', 'agent_id', 'completed', 'archiviata', 'has_actions', 'row_number', 'is_imported_to_rubrica']
                .filter(key => record[key] !== undefined && record[key] !== null && record[key] !== '')
                .map(field => (
                  <div key={field} className="text-left">
                    <div className="text-sm font-medium text-blue-600 mb-1">
                      {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="text-sm text-foreground">
                      {formatCellValue(record[field], field)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Sezione Informazioni Aggiuntive - tutti i campi rimanenti */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <Database className="h-5 w-5 text-primary mt-5" />
          
          <div className={cn("gap-4 flex-1", isMobile ? "grid grid-cols-1" : "grid grid-cols-1 md:grid-cols-4")}>
            {/* Mostra tutti i campi che non sono già stati visualizzati nelle sezioni precedenti */}
            {Object.keys(record)
              .filter(key => ![
                'id', 'import_log_id', 'company_name', 'company_alias', 'origin', 'country',
                'name', 'title', 'alias', 'position', 'email', 'phone', 'cell',
                'city', 'zip_code', 'address', 'last_contact',
                'next_contact_date', 'scheduled_contact', 'created_at', 'updated_at',
                'original_id', 'commercial_anagrafiche_id', 'stato', 'agent_id', 
                'completed', 'archiviata', 'has_actions', 'row_number', 'is_imported_to_rubrica',
                'note', 'notes'
              ].includes(key) && !key.startsWith('meta_') && record[key] !== undefined && record[key] !== null && record[key] !== '')
              .map(field => (
                <div key={field} className="text-left">
                  <div className="text-sm font-medium text-blue-600 mb-1">
                    {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <div className="text-sm text-foreground">
                    {formatCellValue(record[field], field)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Sezione Attività */}
      {activityCount > 0 && (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <button 
              onClick={() => setShowActivities(!showActivities)}
              className="h-5 w-5 text-primary mt-1 hover:text-primary/80 transition-colors"
            >
              {showActivities ? <ChevronDown /> : <ChevronRight />}
            </button>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                Attività ({activityCount})
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/attivita', { state: { filterByContact: record.id } })}
              className="ml-auto text-xs"
            >
              Vai ad Attività
            </Button>
          </div>
          
          {showActivities && (
            <div className="ml-9 space-y-2">
              {activities.map((activity: any) => (
                <div 
                  key={activity.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => navigate('/attivita', { state: { filterByContact: record.id } })}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Badge variant={
                      activity.stato === 'aperta' ? 'default' : 
                      activity.stato === 'in_corso' ? 'secondary' : 
                      'outline'
                    }>
                      {activity.tipo}
                    </Badge>
                    <span className="text-sm text-foreground">
                      {activity.descrizione}
                    </span>
                  </div>
                  {activity.scadenza && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.scadenza).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sezione Meta Flags - organizzata per colonne specifiche e spostata in fondo */}
      {Object.keys(record).some(key => key.startsWith('meta_')) && (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center mt-1">
              <div className="h-2 w-2 bg-white rounded-full"></div>
            </div>
            
            <div className={cn("gap-6 flex-1", isMobile ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 md:grid-cols-4 gap-6")}>
              {/* Colonna 1: Servizi (Settings icon) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                  <Settings className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600">Servizi</span>
                </div>
                {['meta_wca', 'meta_express', 'meta_sea_freight', 'meta_air_freight']
                  .filter(key => record[key] !== undefined)
                  .map(key => (
                    <div key={key} className="flex justify-between items-center">
                      <div className="text-sm font-medium text-blue-600">
                        {key.replace('meta_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      {record[key] === true && (
                        <div className="text-sm font-medium text-foreground">
                          Sì
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {/* Colonna 2: Clienti (Search icon) */}
                <div className="space-y-3">
                 <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                   <Search className="h-4 w-4 text-blue-600" />
                   <span className="text-xs font-medium text-blue-600">Clienti</span>
                 </div>
                 {['meta_client', 'meta_exclient', 'meta_hight_value_customer', 'meta_interested']
                   .filter(key => record[key] !== undefined)
                   .map(key => (
                     <div key={key} className="flex justify-between items-center">
                       <div className="text-sm font-medium text-blue-600">
                         {key.replace('meta_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                       </div>
                       {record[key] === true && (
                         <div className="text-sm font-medium text-foreground">
                           Sì
                         </div>
                       )}
                     </div>
                   ))}
               </div>

               {/* Colonna 3: Risultati (Award icon) */}
               <div className="space-y-3">
                 <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                   <Award className="h-4 w-4 text-blue-600" />
                   <span className="text-xs font-medium text-blue-600">Risultati</span>
                 </div>
                 {['meta_tutorial', 'meta_presentation', 'meta_contact_required_email', 'meta_reception_required_email']
                   .filter(key => record[key] !== undefined)
                   .map(key => (
                     <div key={key} className="flex justify-between items-center">
                       <div className="text-sm font-medium text-blue-600">
                         {key.replace('meta_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                       </div>
                       {record[key] === true && (
                         <div className="text-sm font-medium text-foreground">
                           Sì
                         </div>
                       )}
                     </div>
                   ))}
               </div>

               {/* Colonna 4: Stato (Apple icon) */}
               <div className="space-y-3">
                 <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                   <Apple className="h-4 w-4 text-blue-600" />
                   <span className="text-xs font-medium text-blue-600">Stato</span>
                 </div>
                 {['meta_exworks', 'meta_rejected']
                   .filter(key => record[key] !== undefined)
                   .map(key => (
                     <div key={key} className="flex justify-between items-center">
                       <div className="text-sm font-medium text-blue-600">
                         {key.replace('meta_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                       </div>
                       {record[key] === true && (
                         <div className="text-sm font-medium text-foreground">
                           Sì
                         </div>
                       )}
                     </div>
                   ))}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}