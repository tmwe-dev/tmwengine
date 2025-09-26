import React, { useState } from 'react';
import { FieldRenderer } from './FieldRenderer';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Building, Users, Mail, Phone, MapPin, Database, Clock, Settings, Search, Award, Apple, ChevronDown, ChevronRight, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RecordDetailLayoutProps {
  record: any;
  formatCellValue: (value: any, fieldKey?: string) => string;
}

export function RecordDetailLayout({ record, formatCellValue }: RecordDetailLayoutProps) {
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [showSystemDetails, setShowSystemDetails] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportToRubrica = async () => {
    setIsImporting(true);
    try {
      // Map imported_contacts fields to rubrica fields
      const rubricaData = {
        nome: record.name,
        azienda: record.company_name,
        alias: record.alias,
        company_alias: record.company_alias,
        responsabile: record.name,
        title: record.title,
        position: record.position,
        email: record.email,
        telefono: record.phone,
        cellulare: record.cell,
        indirizzo: record.address,
        citta: record.city,
        paese: record.country,
        zip_code: record.zip_code,
        origine: record.origin,
        client_code: record.client_code,
        note: record.note,
        stato: record.stato,
        created_by: record.created_by,
        last_contact: record.last_contact,
        next_contact_date: record.next_contact_date,
        scheduled_contact: record.scheduled_contact,
        completed: record.completed,
        archiviata: record.archiviata,
        has_actions: record.has_actions,
        meta_client: record.meta_client,
        meta_exclient: record.meta_exclient,
        meta_express: record.meta_express,
        meta_sea_freight: record.meta_sea_freight,
        meta_air_freight: record.meta_air_freight,
        meta_interested: record.meta_interested,
        meta_reception_required_email: record.meta_reception_required_email,
        meta_contact_required_email: record.meta_contact_required_email,
        meta_presentation: record.meta_presentation,
        meta_tutorial: record.meta_tutorial,
        meta_wca: record.meta_wca,
        meta_rejected: record.meta_rejected,
        meta_exworks: record.meta_exworks,
        meta_hight_value_customer: record.meta_hight_value_customer
      };

      // Remove undefined values
      Object.keys(rubricaData).forEach(key => {
        if (rubricaData[key] === undefined) {
          delete rubricaData[key];
        }
      });

      const { error } = await supabase
        .from('rubrica')
        .insert([rubricaData]);

      if (error) {
        throw error;
      }

      // Update the imported_contacts record to mark as imported
      if (record.id) {
        await supabase
          .from('imported_contacts')
          .update({ is_imported_to_rubrica: true })
          .eq('id', record.id);
      }

      toast({
        title: "Contatto importato",
        description: "Il contatto è stato aggiunto alla rubrica con successo.",
      });

    } catch (error) {
      console.error('Error importing to rubrica:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'importazione del contatto.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  
  return (
    <div className="space-y-6">
      {/* Pulsante Importa in Rubrica */}
      <div className="flex justify-end">
        <Button 
          onClick={handleImportToRubrica}
          disabled={isImporting || record.is_imported_to_rubrica}
          className="flex items-center gap-2"
          variant={record.is_imported_to_rubrica ? "outline" : "default"}
        >
          <UserPlus className="h-4 w-4" />
          {isImporting ? "Importando..." : 
           record.is_imported_to_rubrica ? "Già importato" : "Importa in Rubrica"}
        </Button>
      </div>
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
        <div className="flex items-start gap-4">
          <Building className="h-5 w-5 text-primary mt-5" />
          
          {/* Company fields + Origin allineati subito a destra dell'icona */}
          {record.company_name !== undefined && (
            <div className="max-w-[200px] min-w-[200px]">
              <FieldRenderer 
                field="company_name" 
                value={record.company_name} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
          
          {record.company_alias !== undefined && (
            <div className="min-w-[200px]">
              <FieldRenderer 
                field="company_alias" 
                value={record.company_alias} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
          
          <div className="flex-1"></div>
          
          {/* Origin */}
          {record.origin !== undefined && (
            <div className="min-w-[140px]">
              <FieldRenderer 
                field="origin" 
                value={record.origin} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sezione Informazioni Contatto */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <Users className="h-5 w-5 text-primary mt-5" />
          
          {/* Name, Title, Alias allineati subito a destra dell'icona */}
          {record.name !== undefined && (
            <div className="max-w-[200px] min-w-[180px]">
              <FieldRenderer 
                field="name" 
                value={record.name} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
          
          {record.title !== undefined && (
            <div className="min-w-[160px]">
              <FieldRenderer 
                field="title" 
                value={record.title} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
          
          {record.alias !== undefined && (
            <div className="min-w-[140px]">
              <FieldRenderer 
                field="alias" 
                value={record.alias} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sezione Contatti */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          
          {/* Campi contatti con icone */}
          {record.email !== undefined && (
            <div className="flex-1 min-w-[250px] flex items-start gap-2">
              <Mail className="h-4 w-4 text-blue-500 mt-5" />
              <FieldRenderer 
                field="email" 
                value={record.email} 
                formatCellValue={formatCellValue}
                className="flex-1"
              />
            </div>
          )}
          
          {record.phone !== undefined && (
            <div className="min-w-[150px] flex items-start gap-2">
              <Phone className="h-4 w-4 text-green-500 mt-5" />
              <FieldRenderer 
                field="phone" 
                value={record.phone} 
                formatCellValue={formatCellValue}
                className="flex-1"
              />
            </div>
          )}
          
          {record.cell !== undefined && (
            <div className="min-w-[150px] flex items-start gap-2">
              <Phone className="h-4 w-4 text-orange-500 mt-5" />
              <FieldRenderer 
                field="cell" 
                value={record.cell} 
                formatCellValue={formatCellValue}
                className="flex-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Sezione Ubicazione */}
      {(record.city !== undefined || record.zip_code !== undefined || record.address !== undefined) && (
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
              {record.city !== undefined && (
                <div className="max-w-[200px] min-w-[200px]">
                  <FieldRenderer 
                    field="city" 
                    value={record.city} 
                    formatCellValue={formatCellValue}
                  />
                </div>
              )}
              
              {record.zip_code !== undefined && (
                <div className="max-w-[200px] min-w-[100px]">
                  <FieldRenderer 
                    field="zip_code" 
                    value={record.zip_code} 
                    formatCellValue={formatCellValue}
                  />
                </div>
              )}
              
              {record.address !== undefined && (
                <div className="max-w-[200px] min-w-[200px]">
                  <FieldRenderer 
                    field="address" 
                    value={record.address} 
                    formatCellValue={formatCellValue}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sezione Date e Programmazioni */}
      {(record.last_contact !== undefined || record.next_contact_date !== undefined || record.scheduled_contact !== undefined) && (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <Clock className="h-5 w-5 text-primary mt-5" />
            
            <div className="flex gap-4">
              {record.last_contact !== undefined && (
                <div className="min-w-[150px] max-w-[150px]">
                  <FieldRenderer 
                    field="last_contact" 
                    value={record.last_contact} 
                    formatCellValue={formatCellValue}
                  />
                </div>
              )}
              
              {record.next_contact_date !== undefined && (
                <div className="min-w-[150px] max-w-[150px]">
                  <FieldRenderer 
                    field="next_contact_date" 
                    value={record.next_contact_date} 
                    formatCellValue={formatCellValue}
                  />
                </div>
              )}
              
              {record.scheduled_contact !== undefined && (
                <div className="min-w-[150px] max-w-[150px]">
                  <FieldRenderer 
                    field="scheduled_contact" 
                    value={record.scheduled_contact} 
                    formatCellValue={formatCellValue}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 ml-9">
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
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
            {/* Mostra tutti i campi che non sono già stati visualizzati nelle sezioni precedenti */}
            {Object.keys(record)
              .filter(key => ![
                'id', 'import_log_id', 'company_name', 'company_alias', 'origin', 'country',
                'name', 'title', 'alias', 'position', 'email', 'phone', 'cell',
                'city', 'zip_code', 'address', 'last_contact',
                'next_contact_date', 'scheduled_contact', 'created_at', 'updated_at',
                'original_id', 'commercial_anagrafiche_id', 'stato', 'agent_id', 
                'completed', 'archiviata', 'has_actions', 'row_number', 'is_imported_to_rubrica'
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

      {/* Sezione Meta Flags - organizzata per colonne specifiche e spostata in fondo */}
      {Object.keys(record).some(key => key.startsWith('meta_')) && (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center mt-1">
              <div className="h-2 w-2 bg-white rounded-full"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1">
              {/* Colonna 1: Servizi (Settings icon) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                  <Settings className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600">Servizi</span>
                </div>
                {['meta_wca', 'meta_express', 'meta_sea_freight', 'meta_air_freight']
                  .filter(key => record[key] !== undefined)
                  .map(key => (
                    <div key={key} className="text-left">
                      <div className="text-sm font-medium text-blue-600 mb-1">
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
                    <div key={key} className="text-left">
                      <div className="text-sm font-medium text-blue-600 mb-1">
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
                    <div key={key} className="text-left">
                      <div className="text-sm font-medium text-blue-600 mb-1">
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
                    <div key={key} className="text-left">
                      <div className="text-sm font-medium text-blue-600 mb-1">
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