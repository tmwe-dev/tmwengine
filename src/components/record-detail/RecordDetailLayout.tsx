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
        <div className="flex items-end gap-4">
          <Building className="h-5 w-5 text-primary mb-3" />
          
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
          
          {/* Origin spostato qui, allineato a destra */}
          <div className="flex-1"></div>
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
        <div className="flex items-end gap-4">
          <Users className="h-5 w-5 text-primary mb-3" />
          
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
        
        {/* Position insieme ai campi contatti */}
        <div className="flex items-end gap-4">
          {record.position !== undefined && (
            <div className="max-w-[200px]">
              <FieldRenderer 
                field="position" 
                value={record.position} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
          
          {/* Campi contatti con icone */}
          {record.email !== undefined && (
            <div className="flex-1 min-w-[250px] flex items-end gap-2">
              <Mail className="h-4 w-4 text-blue-500 mb-3" />
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
              <Phone className="h-4 w-4 text-green-500 mb-3" />
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
              <Phone className="h-4 w-4 text-orange-500 mb-3" />
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
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex gap-4">
          {record.country !== undefined && (
            <div className="max-w-[200px] min-w-[200px]">
              <FieldRenderer 
                field="country" 
                value={record.country} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
          
          {record.city !== undefined && (
            <div className="max-w-[200px] min-w-[200px]">
              <FieldRenderer 
                field="city" 
                value={record.city} 
                formatCellValue={formatCellValue}
              />
            </div>
          )}
        </div>
        
        {/* Address - larghezza limitata */}
        {record.address !== undefined && (
          <div className="max-w-[200px]">
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
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
        </div>
        
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
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          
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
          <div className="flex items-center gap-2 mb-4">
            <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center">
              <div className="h-2 w-2 bg-white rounded-full"></div>
            </div>
          </div>
          
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