import React, { useState } from 'react';
import { FieldRenderer } from './FieldRenderer';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Users, Mail, Phone, MapPin, Database, Clock, Settings, Search, Award, Apple, ChevronDown, ChevronRight, UserPlus, FileText, Plus, Edit, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AdvancedMultipleActivityForm } from '@/components/attivita/AdvancedMultipleActivityForm';
import { useCompanyActivities } from '@/hooks/useCompanyActivities';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { emailMessageApi } from '@/lib/tmwe-api-integrated';

interface MobileRecordDetailLayoutProps {
  record: any;
  formatCellValue: (value: any, fieldKey?: string) => string;
}

export function MobileRecordDetailLayout({ record, formatCellValue }: MobileRecordDetailLayoutProps) {
  const navigate = useNavigate();
  const { getCompanyActivities, getActivityCount } = useCompanyActivities();
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [showSystemDetails, setShowSystemDetails] = useState(false);
  const [showMetaDetails, setShowMetaDetails] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(record.note || record.notes || '');
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);

  // Recupera le attività del contatto
  const activities = getCompanyActivities(record.id);
  const activityCount = getActivityCount(record.id);

  // Function to get country flag emoji
  const getCountryFlag = (countryName: string): string => {
    if (!countryName) return '🌍';
    
    const countryFlags: { [key: string]: string } = {
      'italy': '🇮🇹', 'italia': '🇮🇹', 'it': '🇮🇹',
      'india': '🇮🇳', 'in': '🇮🇳',
      'united states': '🇺🇸', 'usa': '🇺🇸', 'us': '🇺🇸',
      'germany': '🇩🇪', 'de': '🇩🇪',
      'france': '🇫🇷', 'fr': '🇫🇷',
      'spain': '🇪🇸', 'es': '🇪🇸',
      'united kingdom': '🇬🇧', 'uk': '🇬🇧', 'gb': '🇬🇧',
      'china': '🇨🇳', 'cn': '🇨🇳',
      'japan': '🇯🇵', 'jp': '🇯🇵',
      'canada': '🇨🇦', 'ca': '🇨🇦',
      'australia': '🇦🇺', 'au': '🇦🇺',
      'brazil': '🇧🇷', 'br': '🇧🇷',
      'russia': '🇷🇺', 'ru': '🇷🇺',
      'netherlands': '🇳🇱', 'nl': '🇳🇱'
    };
    
    const normalizedCountry = countryName.toLowerCase().trim();
    return countryFlags[normalizedCountry] || '🌍';
  };

  const handleImportToRubrica = async () => {
    setIsImporting(true);
    try {
      const { data, error } = await supabase.rpc('transfer_company_to_rubrica', {
        imported_contact_id: record.id
      });

      if (error) throw error;

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
      const isImportedContact = record.hasOwnProperty('import_log_id');
      const tableName = isImportedContact ? 'imported_contacts' : 'rubrica';
      
      const { error } = await supabase
        .from(tableName)
        .update({ note: noteValue })
        .eq('id', record.id);

      if (error) throw error;

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

  const handleCreateActivity = async (activityData: any) => {
    try {
      let descrizione = '';
      let tipo = activityData.tipo;
      let emailSendResult = null;
      
      if (activityData.tipo === 'email') {
        if (record.email && activityData.oggetto_email && activityData.testo_email) {
          try {
            const response = await emailMessageApi.sendMessage({
              to: [record.email],
              subject: activityData.oggetto_email,
              body: activityData.testo_email,
              body_type: 'text'
            });

            if (response?.success) {
              emailSendResult = 'success';
              descrizione = `✅ Email INVIATA\n\nOggetto: ${activityData.oggetto_email}\nDestinatario: ${record.email}\nAzienda: ${record.company_name || record.azienda || ''}\nMessage ID: ${response.message_id || 'N/A'}\n\nTesto inviato:\n${activityData.testo_email}`;
            } else {
              descrizione = `❌ Email NON INVIATA\n\nOggetto: ${activityData.oggetto_email}\nDestinatario: ${record.email}\nAzienda: ${record.company_name || record.azienda || ''}\n\nTesto:\n${activityData.testo_email}`;
            }
          } catch (err: any) {
            descrizione = `❌ Email NON INVIATA - Errore: ${err.message}\n\nOggetto: ${activityData.oggetto_email}\nDestinatario: ${record.email}\nAzienda: ${record.company_name || record.azienda || ''}\n\nTesto:\n${activityData.testo_email}`;
          }
        } else {
          descrizione = `❌ Email NON INVIATA - Dati mancanti\n\nOggetto: ${activityData.oggetto_email || 'Nessun oggetto'}\nAzienda: ${record.company_name || record.azienda || ''}\n\nEmail: ${record.email || 'Non disponibile'}`;
        }
      } else if (activityData.tipo === 'chiamata') {
        descrizione = `Chiamata: ${activityData.note_generali || 'Nessuna descrizione'}`;
      }

      const { data, error } = await supabase
        .from('attivita')
        .insert([{
          rubrica_id: record.id,
          tipo: tipo,
          descrizione: descrizione,
          stato: (activityData.tipo === 'email' && emailSendResult === 'success') ? 'completata' : 'aperta',
          scadenza: null,
          priorita: activityData.priorita || 'media',
          assegnato_a: null,
          creato_da: null
        }])
        .select()
        .single();

      if (error) throw error;
      
      setIsActivityDialogOpen(false);
      
      if (emailSendResult === 'success') {
        toast({
          title: "Email inviata e attività creata",
          description: "La mail è stata inviata con successo e l'attività registrata.",
        });
      } else if (activityData.tipo === 'email') {
        toast({
          title: "Attività creata (email NON inviata)",
          description: "L'attività è stata registrata ma l'email non è stata inviata.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Attività creata",
          description: "L'attività è stata creata con successo.",
        });
      }
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
    <>
    <div className="space-y-3 px-1">
      {/* Header Card - Location Info */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Ubicazione</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-lg">{getCountryFlag(record.country || record.paese)}</span>
              <span>{record.city || record.citta || "N/A"}</span>
              <span>•</span>
              <span>{record.country || record.paese || "N/A"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Timestamps - Compact */}
      {(record.created_at || record.updated_at) && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Sistema</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {record.created_at && (
                <div>
                  <div className="text-muted-foreground">Created At</div>
                  <div className="font-medium">{formatCellValue(record.created_at, 'created_at')}</div>
                </div>
              )}
              {record.updated_at && (
                <div>
                  <div className="text-muted-foreground">Updated At</div>
                  <div className="font-medium">{formatCellValue(record.updated_at, 'updated_at')}</div>
                </div>
              )}
            </div>
            {record.position && (
              <div className="mt-2 pt-2 border-t">
                <div className="text-xs text-muted-foreground">Position</div>
                <div className="text-sm font-medium">{formatCellValue(record.position)}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card className="border-primary/20">
        <CardContent className="p-3">
          <div className="space-y-2">
            {/* Import button for imported contacts */}
            {record.hasOwnProperty('is_imported_to_rubrica') && (
              <Button 
                onClick={handleImportToRubrica}
                disabled={isImporting || record.is_imported_to_rubrica}
                className="w-full"
                variant={record.is_imported_to_rubrica ? "outline" : "default"}
                size="sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {isImporting ? "Importando..." : 
                 record.is_imported_to_rubrica ? "Già importato" : "Importa in Rubrica"}
              </Button>
            )}
            
            {/* Create Activity Button */}
            <Button 
              onClick={() => setIsActivityDialogOpen(true)}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crea Attività
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Building className="h-4 w-4" />
            Azienda
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {(record.company_name || record.azienda) && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Nome Azienda</div>
              <div className="font-semibold text-primary text-lg">
                {formatCellValue(record.company_name || record.azienda)}
              </div>
            </div>
          )}
          
          {record.company_alias && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Alias Azienda</div>
              <div className="text-sm">{formatCellValue(record.company_alias)}</div>
            </div>
          )}
          
          {(record.origin || record.origine) && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground">Origine</span>
              <Badge variant="secondary" className="text-xs">
                {formatCellValue(record.origin || record.origine)}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Person */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Contatto
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {(record.name || record.nome) && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Nome</div>
              <div className="font-semibold text-lg">
                {formatCellValue(record.name || record.nome)}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-3">
            {record.title && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Titolo</div>
                <div className="text-sm">{formatCellValue(record.title)}</div>
              </div>
            )}
            
            {record.alias && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Alias</div>
                <div className="text-sm">{formatCellValue(record.alias)}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4" />
            Contatti
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {record.email && (
            <div className="flex items-center gap-2 p-2 border border-blue-200 rounded-lg bg-blue-50">
              <Mail className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <div className="text-xs text-blue-600 mb-1">Email</div>
                <div className="text-sm font-medium text-blue-900 break-all">
                  {formatCellValue(record.email)}
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-2">
            {(record.phone || record.telefono) && (
              <div className="flex items-center gap-2 p-2 border rounded-lg">
                <Phone className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-xs text-green-600">Telefono</div>
                  <div className="text-sm font-medium text-green-900">
                    {formatCellValue(record.phone || record.telefono)}
                  </div>
                </div>
              </div>
            )}
            
            {(record.cell || record.cellulare) && (
              <div className="flex items-center gap-2 p-2 border rounded-lg">
                <Phone className="h-4 w-4 text-orange-600" />
                <div>
                  <div className="text-xs text-orange-600">Cellulare</div>
                  <div className="text-sm font-medium text-orange-900">
                    {formatCellValue(record.cell || record.cellulare)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location Details - Collapsible */}
      {(record.city || record.citta || record.zip_code || record.address || record.indirizzo) && (
        <Card>
          <CardContent className="p-3">
            <button 
              onClick={() => setShowLocationDetails(!showLocationDetails)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Dettagli Ubicazione</span>
              </div>
              {showLocationDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            
            {showLocationDetails && (
              <div className="mt-3 space-y-2">
                {(record.city || record.citta) && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Città</span>
                    <span className="text-sm font-medium">{formatCellValue(record.city || record.citta)}</span>
                  </div>
                )}
                {record.zip_code && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">CAP</span>
                    <span className="text-sm font-medium">{formatCellValue(record.zip_code)}</span>
                  </div>
                )}
                {(record.address || record.indirizzo) && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Indirizzo</div>
                    <div className="text-sm">{formatCellValue(record.address || record.indirizzo)}</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contact Scheduling */}
      {(record.last_contact || record.next_contact_date || record.scheduled_contact) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              Programmazione
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 gap-2 text-xs">
              {record.last_contact && (
                <div className="flex justify-between p-2 border rounded">
                  <span className="text-muted-foreground">Last Contact</span>
                  <span className="font-medium">{formatCellValue(record.last_contact)}</span>
                </div>
              )}
              {record.next_contact_date && (
                <div className="flex justify-between p-2 border rounded">
                  <span className="text-blue-600">Next Contact Date</span>
                  <span className="font-medium text-blue-900">{formatCellValue(record.next_contact_date, 'next_contact_date')}</span>
                </div>
              )}
              {record.scheduled_contact && (
                <div className="flex justify-between p-2 border rounded">
                  <span className="text-green-600">Scheduled Contact</span>
                  <span className="font-medium text-green-900">{formatCellValue(record.scheduled_contact, 'scheduled_contact')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Notes Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              Note
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (editingNote) {
                  handleSaveNote();
                } else {
                  setEditingNote(true);
                }
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {editingNote ? (
            <div className="space-y-2">
              <Textarea
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder="Inserisci le note..."
                className="min-h-[80px] text-sm"
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
            <div className="p-2 bg-muted/20 rounded border min-h-[60px]">
              <p className="text-sm whitespace-pre-wrap">
                {noteValue || 'Nessuna nota presente. Tocca l\'icona per aggiungerne una.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Information - Collapsible */}
      {(record.original_id || record.commercial_anagrafiche_id || record.stato || record.agent_id || record.completed || record.archiviata || record.has_actions || record.row_number || record.is_imported_to_rubrica) && (
        <Card>
          <CardContent className="p-3">
            <button 
              onClick={() => setShowSystemDetails(!showSystemDetails)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Informazioni Sistema</span>
              </div>
              {showSystemDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            
            {showSystemDetails && (
              <div className="mt-3 space-y-2">
                {['original_id', 'commercial_anagrafiche_id', 'stato', 'agent_id', 'completed', 'archiviata', 'has_actions', 'row_number', 'is_imported_to_rubrica']
                  .filter(key => record[key] !== undefined && record[key] !== null && record[key] !== '')
                  .map(field => (
                    <div key={field} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="font-medium">
                        {formatCellValue(record[field], field)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Meta Information - Collapsible */}
      {Object.keys(record).some(key => key.startsWith('meta_')) && (
        <Card>
          <CardContent className="p-3">
            <button 
              onClick={() => setShowMetaDetails(!showMetaDetails)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Meta Informazioni</span>
              </div>
              {showMetaDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            
            {showMetaDetails && (
              <div className="mt-3 space-y-3">
                {/* Servizi */}
                {['meta_wca', 'meta_express', 'meta_sea_freight', 'meta_air_freight'].some(key => record[key]) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">Servizi</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {['meta_wca', 'meta_express', 'meta_sea_freight', 'meta_air_freight']
                        .filter(key => record[key])
                        .map(key => (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {key.replace('meta_', '').replace(/_/g, ' ')}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
                
                {/* Clienti */}
                {['meta_client', 'meta_exclient', 'meta_hight_value_customer', 'meta_interested'].some(key => record[key]) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-medium text-green-600">Clienti</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {['meta_client', 'meta_exclient', 'meta_hight_value_customer', 'meta_interested']
                        .filter(key => record[key])
                        .map(key => (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {key.replace('meta_', '').replace(/_/g, ' ')}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
                
                {/* Altri Meta */}
                {['meta_tutorial', 'meta_presentation', 'meta_contact_required_email', 'meta_reception_required_email', 'meta_exworks', 'meta_rejected'].some(key => record[key]) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="h-3 w-3 text-orange-600" />
                      <span className="text-xs font-medium text-orange-600">Altri</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {['meta_tutorial', 'meta_presentation', 'meta_contact_required_email', 'meta_reception_required_email', 'meta_exworks', 'meta_rejected']
                        .filter(key => record[key])
                        .map(key => (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {key.replace('meta_', '').replace(/_/g, ' ')}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Additional Fields */}
      {Object.keys(record)
        .filter(key => ![
          'id', 'import_log_id', 'company_name', 'company_alias', 'origin', 'country',
          'name', 'title', 'alias', 'position', 'email', 'phone', 'cell',
          'city', 'zip_code', 'address', 'last_contact',
          'next_contact_date', 'scheduled_contact', 'created_at', 'updated_at',
          'original_id', 'commercial_anagrafiche_id', 'stato', 'agent_id', 
          'completed', 'archiviata', 'has_actions', 'row_number', 'is_imported_to_rubrica',
          'note', 'notes', 'azienda', 'nome', 'telefono', 'cellulare', 'citta', 'paese', 'origine', 'indirizzo'
        ].includes(key) && !key.startsWith('meta_') && record[key] !== undefined && record[key] !== null && record[key] !== '').length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4" />
              Campi Aggiuntivi
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {Object.keys(record)
                .filter(key => ![
                  'id', 'import_log_id', 'company_name', 'company_alias', 'origin', 'country',
                  'name', 'title', 'alias', 'position', 'email', 'phone', 'cell',
                  'city', 'zip_code', 'address', 'last_contact',
                  'next_contact_date', 'scheduled_contact', 'created_at', 'updated_at',
                  'original_id', 'commercial_anagrafiche_id', 'stato', 'agent_id', 
                  'completed', 'archiviata', 'has_actions', 'row_number', 'is_imported_to_rubrica',
                  'note', 'notes', 'azienda', 'nome', 'telefono', 'cellulare', 'citta', 'paese', 'origine', 'indirizzo'
                ].includes(key) && !key.startsWith('meta_') && record[key] !== undefined && record[key] !== null && record[key] !== '')
                .map(field => (
                  <div key={field} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="font-medium text-right flex-1 ml-2">
                      {formatCellValue(record[field], field)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sezione Attività */}
      {activityCount > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                Attività ({activityCount})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/attivita', { state: { filterByContact: record.id } })}
                className="text-xs h-7"
              >
                Vai ad Attività
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {activities.slice(0, 3).map((activity: any) => (
                <div 
                  key={activity.id} 
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  onClick={() => navigate('/attivita', { state: { filterByContact: record.id } })}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Badge variant={
                      activity.stato === 'aperta' ? 'default' : 
                      activity.stato === 'in_corso' ? 'secondary' : 
                      'outline'
                    } className="text-xs">
                      {activity.tipo}
                    </Badge>
                    <span className="text-xs text-foreground truncate">
                      {activity.descrizione}
                    </span>
                  </div>
                  {activity.scadenza && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(activity.scadenza).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                </div>
              ))}
              {activityCount > 3 && (
                <div className="text-xs text-center text-muted-foreground pt-1">
                  + altre {activityCount - 3} attività
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    
    {/* Dialog per Crea Attività */}
    <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
      <DialogContent className="max-w-[95vw] max-h-[85vh] flex flex-col p-4">
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
    </>
  );
}