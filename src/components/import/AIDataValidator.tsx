import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle, AlertCircle, Trash2, Edit2, Save, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface AIDataValidatorProps {
  importLogId: string;
  onProcessComplete: () => void;
  initialPrompt: string;
}

// Schema delle colonne target di imported_contacts
const TARGET_SCHEMA = [
  'name', 'alias', 'position', 'title', 'phone', 'cell', 'email',
  'company_name', 'company_alias', 'address', 'city', 'zip_code', 'country',
  'note', 'stato', 'origin', 'client_code', 'created_by', 'agent_id',
  'last_contact', 'next_contact_date', 'scheduled_contact',
  'meta_tutorial', 'meta_hight_value_customer', 'meta_exworks', 'meta_presentation',
  'meta_contact_required_email', 'meta_reception_required_email', 'meta_interested',
  'meta_air_freight', 'meta_sea_freight', 'meta_express', 'meta_client',
  'meta_wca', 'meta_rejected', 'meta_exclient'
];

export function AIDataValidator({ importLogId, onProcessComplete, initialPrompt }: AIDataValidatorProps) {
  const [tempData, setTempData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState(initialPrompt);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<any>({});
  const [mappingStatus, setMappingStatus] = useState<{
    mapped: string[];
    unmapped: string[];
  }>({ mapped: [], unmapped: [] });

  useEffect(() => {
    loadTempData();
  }, [importLogId]);

  const loadTempData = async () => {
    try {
      setLoading(true);
      
      // Carica i dati dalla temp_ai_import
      const { data, error } = await supabase
        .from('temp_ai_import')
        .select('*')
        .eq('import_log_id', importLogId)
        .order('row_number', { ascending: true });

      if (error) throw error;

      setTempData(data || []);
      
      // Analizza i campi disponibili per determinare lo stato del mapping
      if (data && data.length > 0) {
        const rawFields = Object.keys(data[0].raw_data || {});
        analyzeMappingStatus(rawFields);
      }
    } catch (error: any) {
      toast.error(`Errore caricamento dati: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const analyzeMappingStatus = (rawFields: string[]) => {
    // Determina quali campi del file corrispondono a campi target
    const mapped: string[] = [];
    const unmapped: string[] = [];

    TARGET_SCHEMA.forEach(targetField => {
      // Cerca corrispondenze esatte o simili
      const normalizedTarget = targetField.toLowerCase().replace(/_/g, '');
      const hasMatch = rawFields.some(rawField => {
        const normalizedRaw = rawField.toLowerCase().replace(/[_\s]/g, '');
        return normalizedRaw === normalizedTarget || 
               normalizedRaw.includes(normalizedTarget) ||
               normalizedTarget.includes(normalizedRaw);
      });

      if (hasMatch) {
        mapped.push(targetField);
      } else {
        unmapped.push(targetField);
      }
    });

    setMappingStatus({ mapped, unmapped });
  };

  const handleUpdatePrompt = async () => {
    if (!additionalPrompt.trim()) {
      toast.error('Inserisci un prompt per aggiornare il mapping');
      return;
    }

    setProcessing(true);
    try {
      // Accoda il nuovo prompt a quello esistente
      const updatedPrompt = `${currentPrompt}\n\nIstruzioni aggiuntive: ${additionalPrompt}`;
      
      // Chiama la funzione di elaborazione AI con il prompt aggiornato
      const { data, error } = await supabase.functions.invoke('process-ai-import', {
        body: {
          importLogId,
          aiPrompt: updatedPrompt
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Elaborazione completata: ${data.data.processedRecords} record processati`);
        setCurrentPrompt(updatedPrompt);
        setAdditionalPrompt('');
        
        // Ricarica i dati per vedere i risultati aggiornati
        await loadTempData();
        
        // Notifica il componente padre
        onProcessComplete();
      }
    } catch (error: any) {
      toast.error(`Errore elaborazione: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const getRawFieldHeaders = () => {
    if (tempData.length === 0) return [];
    return Object.keys(tempData[0].raw_data || {});
  };

  const handleDeleteRow = async (rowId: string) => {
    try {
      const { error } = await supabase
        .from('temp_ai_import')
        .delete()
        .eq('id', rowId);

      if (error) throw error;

      setTempData(prev => prev.filter(row => row.id !== rowId));
      toast.success('Record eliminato con successo');
    } catch (error: any) {
      toast.error(`Errore eliminazione: ${error.message}`);
    }
  };

  const handleStartEdit = (row: any) => {
    setEditingRowId(row.id);
    setEditedData({ ...row.raw_data });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditedData({});
  };

  const handleSaveEdit = async (rowId: string) => {
    try {
      const { error } = await supabase
        .from('temp_ai_import')
        .update({ raw_data: editedData })
        .eq('id', rowId);

      if (error) throw error;

      setTempData(prev => prev.map(row => 
        row.id === rowId ? { ...row, raw_data: editedData } : row
      ));
      
      setEditingRowId(null);
      setEditedData({});
      toast.success('Modifiche salvate');
    } catch (error: any) {
      toast.error(`Errore salvataggio: ${error.message}`);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const validateField = (fieldName: string, value: string): boolean => {
    if (!value) return true; // Campo vuoto è valido
    
    const normalizedField = fieldName.toLowerCase();
    
    // Validazione email
    if (normalizedField.includes('email')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    }
    
    // Validazione telefono
    if (normalizedField.includes('phone') || normalizedField.includes('cell')) {
      const phoneRegex = /^[\d\s\+\-\(\)]+$/;
      return phoneRegex.test(value);
    }
    
    return true;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Caricamento dati...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mapping Status */}
      <Card>
        <CardHeader>
          <CardTitle>Stato Mappatura Campi</CardTitle>
          <CardDescription>
            Verifica quali campi del file sono stati mappati correttamente alle colonne del database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TARGET_SCHEMA.map((field) => {
              const isMapped = mappingStatus.mapped.includes(field);
              return (
                <Badge
                  key={field}
                  variant={isMapped ? "default" : "destructive"}
                  className={isMapped ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                >
                  {isMapped ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {field.replace(/_/g, ' ')}
                </Badge>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Mappati: {mappingStatus.mapped.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="bg-red-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                Non mappati: {mappingStatus.unmapped.length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Anteprima Dati Importati ({tempData.length} record)</CardTitle>
          <CardDescription>
            Dati originali dal file. Clicca su Modifica per editare i valori, o Elimina per rimuovere record non validi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Riga</TableHead>
                  {getRawFieldHeaders().map((header) => (
                    <TableHead key={header} className="whitespace-nowrap">
                      {header}
                    </TableHead>
                  ))}
                  <TableHead className="w-32">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tempData.map((row) => {
                  const isEditing = editingRowId === row.id;
                  
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.row_number}</TableCell>
                      {getRawFieldHeaders().map((header) => {
                        const value = isEditing ? editedData[header] : row.raw_data[header];
                        const isValid = isEditing ? validateField(header, editedData[header] || '') : true;
                        
                        return (
                          <TableCell key={header} className="whitespace-nowrap">
                            {isEditing ? (
                              <Input
                                value={editedData[header] || ''}
                                onChange={(e) => handleFieldChange(header, e.target.value)}
                                className={`min-w-[150px] ${!isValid ? 'border-red-500' : ''}`}
                              />
                            ) : (
                              <span className={!validateField(header, String(value || '')) ? 'text-red-500' : ''}>
                                {String(value || '')}
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSaveEdit(row.id)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStartEdit(row)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Sei sicuro di voler eliminare questo record? L'azione non può essere annullata.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteRow(row.id)}>
                                      Elimina
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Prompt Adjustment */}
      <Card>
        <CardHeader>
          <CardTitle>Istruzioni AI per Mappatura</CardTitle>
          <CardDescription>
            Aggiungi istruzioni per guidare l'AI nella corretta mappatura dei campi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt Attuale:</label>
            <div className="p-3 bg-muted rounded-md text-sm">
              {currentPrompt}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt da Aggiungere e Accodare:</label>
            <Textarea
              value={additionalPrompt}
              onChange={(e) => setAdditionalPrompt(e.target.value)}
              placeholder="Es: Il campo 'Ragione Sociale' deve essere mappato a 'company_name'. Il campo 'Tel' deve essere mappato a 'phone'..."
              rows={4}
              className="resize-none"
            />
          </div>

          <Button
            onClick={handleUpdatePrompt}
            disabled={processing || !additionalPrompt.trim()}
            className="w-full"
          >
            {processing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Elaborazione in corso...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Aggiorna e Riprocessa
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
