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

      {/* Sezione Position + Contatti */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <Mail className="h-5 w-5 text-primary mt-5" />
          
          {/* Position allineato con email */}
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
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <MapPin className="h-5 w-5 text-primary mt-5" />
        </div>
        
        <div className="flex items-start gap-4">
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
      </div>

      {/* Sezione Informazioni Aggiuntive - tutti i campi rimanenti */}
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <Database className="h-5 w-5 text-primary mt-5" />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
            {/* Mostra tutti i campi che non sono già stati visualizzati nelle sezioni precedenti */}
            {Object.keys(record)
              .filter(key => ![
                'id', 'import_log_id', 'company_name', 'company_alias', 'origin',
                'name', 'title', 'alias', 'position', 'email', 'phone', 'cell',
                'country', 'city', 'zip_code', 'address', 'last_contact',
                'next_contact_date', 'scheduled_contact'
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

      {/* Sezione Date e Programmazioni */}
      {(record.last_contact !== undefined || record.next_contact_date !== undefined || record.scheduled_contact !== undefined) && (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <Clock className="h-5 w-5 text-primary mt-5" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
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
        </div>
      )}

      {/* Sezione Meta Flags - stile semplice senza sfondo */}
      {Object.keys(record).some(key => key.startsWith('meta_')) && (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center mt-1">
              <div className="h-2 w-2 bg-white rounded-full"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
              {Object.keys(record)
                .filter(key => key.startsWith('meta_'))
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
      )}
    </div>
  );
}