import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, ArrowRight, Edit2, Save, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MappingConfig {
  target: string;
  confidence: number;
  transform?: string;
}

interface MappingPreviewProps {
  mapping: Record<string, MappingConfig>;
  warnings: string[];
  suggestions: string[];
  headers: string[];
  sampleRows: any[];
  fileName: string;
  onConfirm: (finalMapping: Record<string, MappingConfig>) => void;
  onCancel: () => void;
}

const DB_FIELDS = [
  { value: 'company_name', label: 'Nome Azienda' },
  { value: 'company_alias', label: 'Alias Azienda' },
  { value: 'name', label: 'Nome Contatto' },
  { value: 'alias', label: 'Alias Contatto' },
  { value: 'position', label: 'Posizione' },
  { value: 'title', label: 'Titolo' },
  { value: 'phone', label: 'Telefono' },
  { value: 'cell', label: 'Cellulare' },
  { value: 'email', label: 'Email' },
  { value: 'address', label: 'Indirizzo' },
  { value: 'city', label: 'Città' },
  { value: 'country', label: 'Paese' },
  { value: 'zip_code', label: 'CAP' },
  { value: 'origin', label: 'Origine' },
  { value: 'client_code', label: 'Codice Cliente' },
  { value: 'note', label: 'Note' },
  { value: 'last_contact', label: 'Ultimo Contatto' },
  { value: 'scheduled_contact', label: 'Contatto Programmato' },
  { value: 'next_contact_date', label: 'Prossimo Contatto' },
  { value: '__skip__', label: '[ Non importare ]' }
];

const TRANSFORMS = [
  { value: '', label: 'Nessuna' },
  { value: 'normalize_phone', label: 'Normalizza Telefono' },
  { value: 'normalize_email', label: 'Normalizza Email' },
  { value: 'parse_date', label: 'Converti Data' },
  { value: 'uppercase', label: 'Maiuscolo' },
  { value: 'lowercase', label: 'Minuscolo' },
  { value: 'trim', label: 'Rimuovi Spazi' }
];

export function MappingPreview({
  mapping,
  warnings,
  suggestions,
  headers,
  sampleRows,
  fileName,
  onConfirm,
  onCancel
}: MappingPreviewProps) {
  const [editedMapping, setEditedMapping] = useState<Record<string, MappingConfig>>(mapping);
  const [editingField, setEditingField] = useState<string | null>(null);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500';
    if (confidence >= 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'Alta';
    if (confidence >= 0.7) return 'Media';
    return 'Bassa';
  };

  const updateMapping = (sourceField: string, target: string, transform?: string) => {
    setEditedMapping(prev => ({
      ...prev,
      [sourceField]: {
        ...prev[sourceField],
        target,
        transform: transform || prev[sourceField]?.transform
      }
    }));
  };

  const updateTransform = (sourceField: string, transform: string) => {
    setEditedMapping(prev => ({
      ...prev,
      [sourceField]: {
        ...prev[sourceField],
        transform: transform || undefined
      }
    }));
  };

  const handleConfirm = () => {
    // Rimuovi i campi con target __skip__
    const finalMapping = Object.entries(editedMapping).reduce((acc, [key, value]) => {
      if (value.target !== '__skip__') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, MappingConfig>);

    onConfirm(finalMapping);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Mapping Analizzato: {fileName}
          </CardTitle>
          <CardDescription>
            Controlla e modifica il mapping suggerito dall'AI prima di procedere con l'importazione
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Attenzione:</p>
            <ul className="list-disc list-inside space-y-1">
              {warnings.map((warning, idx) => (
                <li key={idx} className="text-sm">{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Suggerimenti:</p>
            <ul className="list-disc list-inside space-y-1">
              {suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-sm">{suggestion}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Mapping Table */}
      <Card>
        <CardHeader>
          <CardTitle>Mapping Colonne</CardTitle>
          <CardDescription>
            Clicca su una riga per modificare il mapping o la trasformazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colonna File</TableHead>
                <TableHead>Esempio Dati</TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead>Campo Database</TableHead>
                <TableHead>Trasformazione</TableHead>
                <TableHead>Confidenza</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {headers.map((header, idx) => {
                const config = editedMapping[header];
                const isEditing = editingField === header;
                const exampleValue = sampleRows[0]?.[header] || '-';

                return (
                  <TableRow key={idx} className={isEditing ? 'bg-accent' : ''}>
                    <TableCell className="font-medium">{header}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {String(exampleValue)}
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={config?.target || '__skip__'}
                          onValueChange={(value) => updateMapping(header, value)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DB_FIELDS.map(field => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="font-medium">
                          {DB_FIELDS.find(f => f.value === config?.target)?.label || '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={config?.transform || ''}
                          onValueChange={(value) => updateTransform(header, value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRANSFORMS.map(transform => (
                              <SelectItem key={transform.value} value={transform.value}>
                                {transform.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">
                          {TRANSFORMS.find(t => t.value === config?.transform)?.label || '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {config && (
                        <Badge variant="secondary" className="gap-1">
                          <div className={`w-2 h-2 rounded-full ${getConfidenceColor(config.confidence)}`} />
                          {getConfidenceLabel(config.confidence)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingField(null)}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingField(header)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview Trasformazione */}
      <Card>
        <CardHeader>
          <CardTitle>Preview Dati Trasformati</CardTitle>
          <CardDescription>Prime 3 righe dopo le trasformazioni</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sampleRows.slice(0, 3).map((row, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Riga {idx + 1}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(editedMapping).map(([sourceField, config]) => {
                    if (config.target === '__skip__') return null;
                    
                    const originalValue = row[sourceField];
                    // Simulazione trasformazione (semplificata)
                    let transformedValue = originalValue;
                    
                    if (config.transform === 'normalize_phone') {
                      transformedValue = String(originalValue || '').replace(/[\s\.\-\(\)]/g, '');
                    } else if (config.transform === 'normalize_email') {
                      transformedValue = String(originalValue || '').toLowerCase().trim();
                    } else if (config.transform === 'uppercase') {
                      transformedValue = String(originalValue || '').toUpperCase();
                    } else if (config.transform === 'lowercase') {
                      transformedValue = String(originalValue || '').toLowerCase();
                    } else if (config.transform === 'trim') {
                      transformedValue = String(originalValue || '').trim();
                    }

                    const fieldLabel = DB_FIELDS.find(f => f.value === config.target)?.label;

                    return (
                      <div key={sourceField} className="flex justify-between">
                        <span className="text-muted-foreground">{fieldLabel}:</span>
                        <span className="font-medium">{transformedValue || '-'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between gap-4">
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Annulla
        </Button>
        <Button onClick={handleConfirm} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Conferma e Importa ({Object.values(editedMapping).filter(c => c.target !== '__skip__').length} campi)
        </Button>
      </div>
    </div>
  );
}
