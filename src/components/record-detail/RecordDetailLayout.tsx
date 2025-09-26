import React from 'react';
import { FieldRenderer } from './FieldRenderer';
import { Label } from '@/components/ui/label';
import { Building, Users, Mail, Phone, MapPin, Database, Clock } from 'lucide-react';

interface RecordDetailLayoutProps {
  record: any;
  formatCellValue: (value: any, fieldKey?: string) => string;
}

export function RecordDetailLayout({ record, formatCellValue }: RecordDetailLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Sezione Informazioni Azienda */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <Building className="h-5 w-5" />
          </h3>
          
          {/* Company fields allineati a destra */}
          <div className="flex gap-4 items-end">
            {record.company_name !== undefined && (
              <div className="min-w-[300px]">
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
          </div>
        </div>
      </div>

      {/* Sezione Informazioni Contatto */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <Users className="h-5 w-5" />
            Informazioni Contatto
          </h3>
          
          {/* Name, Title, Alias allineati a destra */}
          <div className="flex gap-4 items-end">
            {record.name !== undefined && (
              <div className="min-w-[180px]">
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

      {/* Sezione Contatti */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contatti
          </h3>
          
          {/* Icone e campi contatti allineati a destra */}
          <div className="flex gap-4 items-end">
            {record.email !== undefined && (
              <div className="min-w-[250px] flex items-end gap-2">
                <Mail className="h-5 w-5 text-blue-500 mb-3" />
                <FieldRenderer 
                  field="email" 
                  value={record.email} 
                  formatCellValue={formatCellValue}
                  className="flex-1"
                />
              </div>
            )}
            
            {record.phone !== undefined && (
              <div className="min-w-[150px] flex items-end gap-2">
                <Phone className="h-5 w-5 text-green-500 mb-3" />
                <FieldRenderer 
                  field="phone" 
                  value={record.phone} 
                  formatCellValue={formatCellValue}
                  className="flex-1"
                />
              </div>
            )}
            
            {record.cell !== undefined && (
              <div className="min-w-[150px] flex items-end gap-2">
                <Phone className="h-5 w-5 text-orange-500 mb-3" />
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
      </div>

      {/* Sezione Ubicazione */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Ubicazione
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {record.country !== undefined && (
            <FieldRenderer 
              field="country" 
              value={record.country} 
              formatCellValue={formatCellValue}
            />
          )}
          
          {record.city !== undefined && (
            <FieldRenderer 
              field="city" 
              value={record.city} 
              formatCellValue={formatCellValue}
            />
          )}
          
          {record.origin !== undefined && (
            <FieldRenderer 
              field="origin" 
              value={record.origin} 
              formatCellValue={formatCellValue}
            />
          )}
        </div>
        
        {/* Address - riga separata */}
        {record.address !== undefined && (
          <div className="w-full">
            <FieldRenderer 
              field="address" 
              value={record.address} 
              formatCellValue={formatCellValue}
            />
          </div>
        )}
        
        {record.zip_code !== undefined && (
          <div className="w-40">
            <FieldRenderer 
              field="zip_code" 
              value={record.zip_code} 
              formatCellValue={formatCellValue}
            />
          </div>
        )}
      </div>

      {/* Sezione Informazioni Aggiuntive */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <Database className="h-5 w-5" />
          Informazioni Aggiuntive
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {record.stato !== undefined && (
            <FieldRenderer 
              field="stato" 
              value={record.stato} 
              formatCellValue={formatCellValue}
            />
          )}
          
          {record.agent_id !== undefined && (
            <FieldRenderer 
              field="agent_id" 
              value={record.agent_id} 
              formatCellValue={formatCellValue}
            />
          )}
          
          {record.client_code !== undefined && (
            <FieldRenderer 
              field="client_code" 
              value={record.client_code} 
              formatCellValue={formatCellValue}
            />
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

      {/* Sezione Date e Programmazioni */}
      {(record.last_contact !== undefined || record.next_contact_date !== undefined || record.scheduled_contact !== undefined) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Date e Programmazioni
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {record.last_contact !== undefined && (
              <FieldRenderer 
                field="last_contact" 
                value={record.last_contact} 
                formatCellValue={formatCellValue}
              />
            )}
            
            {record.next_contact_date !== undefined && (
              <FieldRenderer 
                field="next_contact_date" 
                value={record.next_contact_date} 
                formatCellValue={formatCellValue}
              />
            )}
            
            {record.scheduled_contact !== undefined && (
              <FieldRenderer 
                field="scheduled_contact" 
                value={record.scheduled_contact} 
                formatCellValue={formatCellValue}
              />
            )}
          </div>
        </div>
      )}

      {/* Sezione Meta Flags */}
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