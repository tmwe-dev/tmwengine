import React from 'react';
import { FieldRenderer } from './FieldRenderer';
import { Label } from '@/components/ui/label';
import { Users, Building, MapPin, Mail, Phone, Database, Clock } from 'lucide-react';

interface RecordDetailLayoutProps {
  record: any;
  formatCellValue: (value: any, fieldKey?: string) => string;
}

export function RecordDetailLayout({ record, formatCellValue }: RecordDetailLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Sezione Company - Layout flessibile */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <Building className="h-5 w-5" />
          Informazioni Azienda
        </h3>
        
        <div className="flex flex-wrap gap-3">
          {/* Company Name - prende tutto lo spazio disponibile */}
          {record.company_name !== undefined && (
            <div className="flex-1 min-w-[300px]">
              <FieldRenderer 
                field="company_name" 
                value={record.company_name} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
          
          {/* Company Alias - larghezza automatica */}
          {record.company_alias !== undefined && (
            <div className="flex-none w-auto min-w-[200px]">
              <FieldRenderer 
                field="company_alias" 
                value={record.company_alias} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sezione Contact - Layout flessibile */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <Users className="h-5 w-5" />
          Informazioni Contatto
        </h3>
        
        <div className="flex flex-wrap gap-3">
          {/* Name - larghezza flessibile */}
          {record.name !== undefined && (
            <div className="flex-auto min-w-[200px] max-w-[300px]">
              <FieldRenderer 
                field="name" 
                value={record.name} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
          
          {/* Title - si adatta al contenuto */}
          {record.title !== undefined && (
            <div className="flex-auto min-w-[150px] max-w-[250px]">
              <FieldRenderer 
                field="title" 
                value={record.title} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
          
          {/* Alias - larghezza compatta */}
          {record.alias !== undefined && (
            <div className="flex-auto min-w-[120px] max-w-[200px]">
              <FieldRenderer 
                field="alias" 
                value={record.alias} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
        </div>
        
        {/* Position - riga separata, larghezza piena */}
        {record.position !== undefined && (
          <div className="w-full">
            <FieldRenderer 
              field="position" 
              value={record.position} 
              formatCellValue={formatCellValue}
            />
          </div>
        )}
      </div>

      {/* Sezione Contatti - Layout flessibile */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Contatti
        </h3>
        
        <div className="flex flex-wrap gap-3">
          {/* Email - prende spazio principale */}
          {record.email !== undefined && (
            <div className="flex-1 min-w-[250px]">
              <FieldRenderer 
                field="email" 
                value={record.email} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
          
          {/* Phone - larghezza contenuto */}
          {record.phone !== undefined && (
            <div className="flex-none min-w-[150px]">
              <FieldRenderer 
                field="phone" 
                value={record.phone} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
          
          {/* Cell - larghezza contenuto */}
          {record.cell !== undefined && (
            <div className="flex-none min-w-[150px]">
              <FieldRenderer 
                field="cell" 
                value={record.cell} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sezione Ubicazione - Layout flessibile */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Ubicazione
        </h3>
        
        <div className="flex flex-wrap gap-3">
          {/* Country - compatto */}
          {record.country !== undefined && (
            <div className="flex-none min-w-[120px] max-w-[180px]">
              <FieldRenderer 
                field="country" 
                value={record.country} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
          
          {/* City - si espande */}
          {record.city !== undefined && (
            <div className="flex-auto min-w-[150px] max-w-[250px]">
              <FieldRenderer 
                field="city" 
                value={record.city} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
          
          {/* Origin - compatto */}
          {record.origin !== undefined && (
            <div className="flex-none min-w-[120px] max-w-[180px]">
              <FieldRenderer 
                field="origin" 
                value={record.origin} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
        </div>
        
        {/* Address - riga separata, larghezza piena */}
        {record.address !== undefined && (
          <div className="w-full">
            <FieldRenderer 
              field="address" 
              value={record.address} 
              formatCellValue={formatCellValue}
            />
          </div>
        )}
        
        <div className="flex flex-wrap gap-3">
          {/* ZIP Code */}
          {record.zip_code !== undefined && (
            <div className="flex-none min-w-[100px] max-w-[150px]">
              <FieldRenderer 
                field="zip_code" 
                value={record.zip_code} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sezione Metadata - Layout dinamico */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <Database className="h-5 w-5" />
          Informazioni Aggiuntive
        </h3>
        
        <div className="flex flex-wrap gap-3">
          {/* Stato e Agent ID */}
          {record.stato !== undefined && (
            <div className="flex-none min-w-[100px] max-w-[150px]">
              <FieldRenderer 
                field="stato" 
                value={record.stato} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
          
          {record.agent_id !== undefined && (
            <div className="flex-none min-w-[120px] max-w-[180px]">
              <FieldRenderer 
                field="agent_id" 
                value={record.agent_id} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
          
          {record.client_code !== undefined && (
            <div className="flex-none min-w-[120px] max-w-[200px]">
              <FieldRenderer 
                field="client_code" 
                value={record.client_code} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
        </div>
        
        {/* Note - larghezza piena */}
        {record.note !== undefined && (
          <div className="w-full">
            <FieldRenderer 
              field="note" 
              value={record.note} 
              formatCellValue={formatCellValue}
            />
          </div>
        )}
      </div>

      {/* Sezione Date - Layout flessibile */}
      {(record.last_contact !== undefined || record.next_contact_date !== undefined || record.scheduled_contact !== undefined) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Date e Programmazioni
          </h3>
          
          <div className="flex flex-wrap gap-3">
            {record.last_contact !== undefined && (
              <div className="flex-auto min-w-[150px] max-w-[250px]">
                <FieldRenderer 
                  field="last_contact" 
                  value={record.last_contact} 
                  formatCellValue={formatCellValue}
                />
              </div>
            )}
            
            {record.next_contact_date !== undefined && (
              <div className="flex-auto min-w-[150px] max-w-[250px]">
                <FieldRenderer 
                  field="next_contact_date" 
                  value={record.next_contact_date} 
                  formatCellValue={formatCellValue}
                />
              </div>
            )}
            
            {record.scheduled_contact !== undefined && (
              <div className="flex-auto min-w-[150px] max-w-[250px]">
                <FieldRenderer 
                  field="scheduled_contact" 
                  value={record.scheduled_contact} 
                  formatCellValue={formatCellValue}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sezione Meta Flags - Layout compatto */}
      {Object.keys(record).some(key => key.startsWith('meta_') && record[key]) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary">Meta Flags</h3>
          
          <div className="flex flex-wrap gap-2">
            {Object.keys(record)
              .filter(key => key.startsWith('meta_') && record[key])
              .map(key => (
                <div key={key} className="flex-none">
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {key.replace('meta_', '').replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}