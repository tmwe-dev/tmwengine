import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Plus, Trash2, Eye, Edit, Mail, Users, Database, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EmailTemplate {
  id: string;
  nome: string;
  oggetto: string;
  contenuto: string;
  placeholder_disponibili: any;
  attivo: boolean;
  created_at: string;
}

interface ImportLog {
  id: string;
  file_name: string;
  file_path: string;
  nome_tabella_temporanea: string | null;
  righe_totali: number;
  righe_importate: number;
  righe_errori: number;
  contatti_selezionati: number;
  stato: string;
  trasferiti_rubrica: boolean;
  created_at: string;
}

interface ImportedContact {
  [key: string]: any;
}

export default function ImportTemplates() {
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [viewingRecords, setViewingRecords] = useState<ImportedContact[]>([]);
  const [selectedImport, setSelectedImport] = useState<ImportLog | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [showRecordsDialog, setShowRecordsDialog] = useState(false);
  const [currentRecordIndex, setCurrentRecordIndex] = useState(0);
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [importingSelected, setImportingSelected] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreRecords, setHasMoreRecords] = useState(false);
  const [loadingMoreRecords, setLoadingMoreRecords] = useState(false);
  
  // Stato per progress dell'importazione
  const [importProgress, setImportProgress] = useState<{
    currentImportId: string | null;
    totalRows: number;
    processedRows: number;
    isProcessing: boolean;
    startTime: number;
  }>({
    currentImportId: null,
    totalRows: 0,
    processedRows: 0,
    isProcessing: false,
    startTime: 0
  });
  
  // Form per nuovo template email
  const [newTemplate, setNewTemplate] = useState({
    nome: '',
    oggetto: '',
    contenuto: 'Gentile {{responsabile}},\n\nScrivo a nome di {{nome_azienda}} per...\n\nCordiali saluti',
  });

  // Form per modifica template
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    loadEmailTemplates();
    loadImportLogs();
  }, []);

  const loadEmailTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmailTemplates(data || []);
    } catch (error) {
      console.error('Errore nel caricamento templates email:', error);
      toast.error('Errore nel caricamento dei templates email');
    }
  };

  const loadImportLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setImportLogs(data || []);
    } catch (error) {
      console.error('Errore nel caricamento log importazioni:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEmailTemplate = async () => {
    try {
      if (!newTemplate.nome || !newTemplate.oggetto || !newTemplate.contenuto) {
        toast.error('Compila tutti i campi obbligatori');
        return;
      }

      const { error } = await supabase
        .from('email_templates')
        .insert({
          nome: newTemplate.nome,
          oggetto: newTemplate.oggetto,
          contenuto: newTemplate.contenuto
        });

      if (error) throw error;

      toast.success('Template email creato con successo');
      setNewTemplate({
        nome: '',
        oggetto: '',
        contenuto: 'Gentile {{responsabile}},\n\nScrivo a nome di {{nome_azienda}} per...\n\nCordiali saluti',
      });
      loadEmailTemplates();
    } catch (error) {
      console.error('Errore nella creazione template email:', error);
      toast.error('Errore nella creazione del template email');
    }
  };

  const updateEmailTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          nome: editingTemplate.nome,
          oggetto: editingTemplate.oggetto,
          contenuto: editingTemplate.contenuto,
          attivo: editingTemplate.attivo
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      toast.success('Template aggiornato con successo');
      setEditingTemplate(null);
      loadEmailTemplates();
    } catch (error) {
      console.error('Errore nell\'aggiornamento template:', error);
      toast.error('Errore nell\'aggiornamento del template');
    }
  };

  const deleteEmailTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Template eliminato');
      loadEmailTemplates();
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error);
      toast.error('Errore nell\'eliminazione del template');
    }
  };

  const handleFileUpload = async () => {
    if (!importFile) {
      toast.error('Seleziona un file da importare');
      return;
    }

    setUploadingFile(true);

    try {
      // Upload file to storage
      const fileName = `${Date.now()}_${importFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('import-files')
        .upload(fileName, importFile);

      if (uploadError) throw uploadError;

      // Phase 1: Save file to database
      const { data: saveResult, error: saveError } = await supabase.functions
        .invoke('process-import-file', {
          body: {
            filePath: fileName,
            fileName: importFile.name
          }
        });

      if (saveError) throw saveError;

      if (saveResult.success) {
        const { importLogId, totalRows, separator } = saveResult.data;
        
        toast.success(`File salvato: ${totalRows} righe rilevate. Avvio elaborazione...`);
        
        // Phase 2: Process the saved file
        setImportProgress({
          currentImportId: importLogId,
          totalRows,
          processedRows: 0,
          isProcessing: true,
          startTime: Date.now()
        });

        // Start processing the saved file
        const { data: processResult, error: processError } = await supabase.functions
          .invoke('process-saved-file', {
            body: {
              importLogId
            }
          });

        if (processError) {
          console.error('Processing error:', processError);
          // Don't throw here, let the polling handle the status
        }

        if (processResult?.success) {
          const { importedRows, errorRows } = processResult.data;
          
          setImportProgress({
            currentImportId: importLogId,
            totalRows,
            processedRows: importedRows,
            isProcessing: false,
            startTime: 0
          });
          
          if (errorRows > 0) {
            toast.success(`Elaborazione completata con alcuni errori: ${importedRows}/${totalRows} righe elaborate.`);
          } else {
            toast.success(`Elaborazione completata: ${importedRows} righe elaborate.`);
          }
        }
      } else {
        throw new Error(saveResult.error);
      }

      setImportFile(null);
      loadImportLogs();
    } catch (error: any) {
      console.error('Errore nel caricamento file:', error);
      toast.error(`Errore nel caricamento del file: ${error.message}`);
      setImportProgress({
        currentImportId: null,
        totalRows: 0,
        processedRows: 0,
        isProcessing: false,
        startTime: 0
      });
    } finally {
      setUploadingFile(false);
    }
  };

  // Polling per il progresso dell'importazione
  useEffect(() => {
    if (!importProgress.currentImportId || !importProgress.isProcessing) return;

    const checkProgress = async () => {
      try {
        const { data, error } = await supabase
          .from('import_logs')
          .select('righe_totali, righe_importate, stato')
          .eq('id', importProgress.currentImportId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setImportProgress(prev => ({
            ...prev,
            totalRows: data.righe_totali || 0,
            processedRows: data.righe_importate || 0,
            isProcessing: data.stato === 'elaborazione'
          }));

          // Se completato, ferma il polling e ricarica i log
          if (data.stato !== 'elaborazione') {
            setImportProgress(prev => ({ ...prev, isProcessing: false }));
            loadImportLogs();
          }
        }
      } catch (error) {
        console.error('Errore nel controllo progresso:', error);
      }
    };

    const interval = setInterval(checkProgress, 1000);
    return () => clearInterval(interval);
  }, [importProgress.currentImportId, importProgress.isProcessing]);

  // Function to manually process a saved file
  const processFile = async (importLogId: string) => {
    try {
      setImportProgress({
        currentImportId: importLogId,
        totalRows: 0,
        processedRows: 0,
        isProcessing: true,
        startTime: Date.now()
      });

      const { data: processResult, error: processError } = await supabase.functions
        .invoke('process-saved-file', {
          body: {
            importLogId
          }
        });

      if (processError) throw processError;

      if (processResult.success) {
        const { totalRows, importedRows, errorRows } = processResult.data;
        
        setImportProgress({
          currentImportId: importLogId,
          totalRows,
          processedRows: importedRows,
          isProcessing: false,
          startTime: 0
        });
        
        if (errorRows > 0) {
          toast.success(`Elaborazione completata con alcuni errori: ${importedRows}/${totalRows} righe elaborate.`);
        } else {
          toast.success(`Elaborazione completata: ${importedRows} righe elaborate.`);
        }
        
        loadImportLogs();
      } else {
        throw new Error(processResult.error);
      }
    } catch (error: any) {
      console.error('Errore nell\'elaborazione:', error);
      toast.error(`Errore nell'elaborazione: ${error.message}`);
      setImportProgress({
        currentImportId: null,
        totalRows: 0,
        processedRows: 0,
        isProcessing: false,
        startTime: 0
      });
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById('contenuto-template') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + `{{${placeholder}}}` + text.substring(end);
      
      if (editingTemplate) {
        setEditingTemplate({...editingTemplate, contenuto: newText});
      } else {
        setNewTemplate({...newTemplate, contenuto: newText});
      }
    }
  };

  const getStatusBadge = (stato: string) => {
    switch (stato) {
      case 'completato':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completato</Badge>;
      case 'errore':
        return <Badge variant="destructive">Errore</Badge>;
      case 'in_corso':
      case 'elaborazione':
        return <Badge variant="outline">In elaborazione</Badge>;
      case 'file_salvato':
      case 'pronto_per_elaborazione':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Pronto per elaborazione</Badge>;
      case 'completato_con_errori':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Completato con errori</Badge>;
      default:
        return <Badge variant="outline">{stato}</Badge>;
    }
  };

  const loadRecordsPage = async (importLog: ImportLog, page: number = 0, append: boolean = false) => {
    console.log('loadRecordsPage chiamato:', { importLog: importLog.id, page, append });
    const pageSize = 500;
    const offset = page * pageSize;
    
    if (!append) {
      setLoadingRecords(true);
    } else {
      setLoadingMoreRecords(true);
    }

    try {
      console.log('Caricamento record da imported_contacts per import_log_id:', importLog.id);
      
      // Use the permanent imported_contacts table instead of temp tables
      const { data, error, count } = await supabase
        .from('imported_contacts')
        .select('*', { count: 'exact' })
        .eq('import_log_id', importLog.id)
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('Errore query imported_contacts:', error);
        throw error;
      }
      
      console.log('Record caricati:', data?.length, 'di', count);
      const contacts = data || [];
      
      if (append) {
        setViewingRecords(prev => [...prev, ...contacts]);
      } else {
        setViewingRecords(contacts);
        setTotalRecords(count || 0);
        setShowRecordsDialog(true);
        setCurrentRecordIndex(0);
        setSelectedRecords(new Set());
        console.log('Dialog aperto con', contacts.length, 'record');
      }
      
      setCurrentPage(page);
      setHasMoreRecords((count || 0) > offset + pageSize);
      
    } catch (error) {
      console.error('Errore nel caricamento record:', error);
      toast.error('Errore nel caricamento dei record importati');
    } finally {
      setLoadingRecords(false);
      setLoadingMoreRecords(false);
    }
  };

  const viewImportRecords = async (importLog: ImportLog) => {
    console.log('viewImportRecords chiamato con:', importLog);
    setSelectedImport(importLog);
    await loadRecordsPage(importLog, 0, false);
  };

  const loadMoreRecords = async () => {
    if (selectedImport && hasMoreRecords && !loadingMoreRecords) {
      await loadRecordsPage(selectedImport, currentPage + 1, true);
    }
  };

  const deleteImportFile = async (importLog: ImportLog) => {
    const confirmDelete = confirm(`Sei sicuro di voler eliminare il file "${importLog.file_name}" e tutti i suoi dati importati? Questa azione non può essere annullata.`);
    
    if (!confirmDelete) return;

    try {
      // First delete all imported contacts for this import
      const { error: contactsError } = await supabase
        .from('imported_contacts')
        .delete()
        .eq('import_log_id', importLog.id);

      if (contactsError) {
        throw new Error(`Errore nell'eliminazione dei contatti: ${contactsError.message}`);
      }

      // Delete the file from storage if it exists
      if (importLog.file_path) {
        await supabase.storage
          .from('import-files')
          .remove([importLog.file_path]);
      }

      // Finally delete the import log
      const { error: logError } = await supabase
        .from('import_logs')
        .delete()
        .eq('id', importLog.id);

      if (logError) {
        throw new Error(`Errore nell'eliminazione del log: ${logError.message}`);
      }

      toast.success('File e dati eliminati con successo');
      
      // Refresh the import logs
      await loadImportLogs();
      
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error);
      toast.error('Errore durante l\'eliminazione del file');
    }
  };


  const importSelectedRecords = async () => {
    if (!selectedRecords.size || importingSelected) return;

    setImportingSelected(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const selectedData = viewingRecords.filter((_, index) => selectedRecords.has(index));
      
      for (const record of selectedData) {
        try {
          // Map record fields to rubrica structure
          const rubricaData = {
            nome: record.name || '',
            alias: record.alias || '',
            azienda: record.company_alias || record.company_name || '',
            position: record.position || '',
            title: record.title || '',
            telefono: record.phone || '',
            cellulare: record.cell || '',
            email: record.email || '',
            paese: record.country || '',
            indirizzo: record.address || '',
            citta: record.city || '',
            zip_code: record.zip_code || '',
            note: record.note || '',
            origine: record.origin || '',
            client_code: record.client_code || '',
            responsabile: record.created_by || '',
            stato: record.stato || 'A',
            // Meta flags
            meta_client: record.meta_client || false,
            meta_express: record.meta_express || false,
            meta_sea_freight: record.meta_sea_freight || false,
            meta_air_freight: record.meta_air_freight || false,
            meta_interested: record.meta_interested || false,
            meta_reception_required_email: record.meta_reception_required_email || false,
            meta_contact_required_email: record.meta_contact_required_email || false,
            meta_presentation: record.meta_presentation || false,
            meta_exworks: record.meta_exworks || false,
            meta_hight_value_customer: record.meta_hight_value_customer || false,
            meta_tutorial: record.meta_tutorial || false,
            meta_rejected: record.meta_rejected || false,
            meta_wca: record.meta_wca || false,
            meta_exclient: record.meta_exclient || false,
            completed: record.completed || false,
            archiviata: record.archiviata || false,
            has_actions: record.has_actions || false,
            // Date fields
            last_contact: record.last_contact || null,
            scheduled_contact: record.scheduled_contact || null,
            next_contact_date: record.next_contact_date || null
          };

          const { error } = await supabase
            .from('rubrica')
            .insert(rubricaData);

          if (error) {
            console.error('Errore inserimento record:', error);
            errorCount++;
          } else {
            successCount++;
            // Mark as imported in the imported_contacts table
            await supabase
              .from('imported_contacts')
              .update({ is_imported_to_rubrica: true })
              .eq('id', record.id);
          }
        } catch (error) {
          console.error('Errore elaborazione record:', error);
          errorCount++;
        }
      }

      // Update import log
      if (selectedImport) {
        await supabase
          .from('import_logs')
          .update({
            trasferiti_rubrica: true,
            contatti_selezionati: selectedRecords.size
          })
          .eq('id', selectedImport.id);
      }

      toast.success(`Importati ${successCount} contatti${errorCount > 0 ? `. ${errorCount} errori.` : ''}`);
      
      // Refresh import logs
      await loadImportLogs();
      
      // Close dialog
      setShowRecordsDialog(false);
      setSelectedImport(null);
      setViewingRecords([]);
      setSelectedRecords(new Set());
      
    } catch (error) {
      console.error('Errore importazione:', error);
      toast.error('Errore durante l\'importazione');
    } finally {
      setImportingSelected(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestione Email e Import</h1>
          <p className="text-muted-foreground">
            Gestisci templates email e importa contatti da file Excel/CSV
          </p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Templates Email
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importa Contatti
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Gestisci Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {editingTemplate ? 'Modifica Template' : 'Nuovo Template Email'}
                </CardTitle>
                <CardDescription>
                  Crea modelli di email con placeholder dinamici
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome-template">Nome Template</Label>
                  <Input
                    id="nome-template"
                    value={editingTemplate ? editingTemplate.nome : newTemplate.nome}
                    onChange={(e) => {
                      if (editingTemplate) {
                        setEditingTemplate({...editingTemplate, nome: e.target.value});
                      } else {
                        setNewTemplate({...newTemplate, nome: e.target.value});
                      }
                    }}
                    placeholder="Es: Template Presentazione Servizi"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oggetto-template">Oggetto Email</Label>
                  <Input
                    id="oggetto-template"
                    value={editingTemplate ? editingTemplate.oggetto : newTemplate.oggetto}
                    onChange={(e) => {
                      if (editingTemplate) {
                        setEditingTemplate({...editingTemplate, oggetto: e.target.value});
                      } else {
                        setNewTemplate({...newTemplate, oggetto: e.target.value});
                      }
                    }}
                    placeholder="Es: Proposta di collaborazione per {{nome_azienda}}"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contenuto-template">Contenuto Email</Label>
                  <Textarea
                    id="contenuto-template"
                    value={editingTemplate ? editingTemplate.contenuto : newTemplate.contenuto}
                    onChange={(e) => {
                      if (editingTemplate) {
                        setEditingTemplate({...editingTemplate, contenuto: e.target.value});
                      } else {
                        setNewTemplate({...newTemplate, contenuto: e.target.value});
                      }
                    }}
                    rows={8}
                    placeholder="Scrivi il contenuto del template usando {{placeholder}} per i campi dinamici"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Placeholder Disponibili</Label>
                  <div className="flex flex-wrap gap-2">
                    {['responsabile', 'nome_azienda', 'email', 'telefono', 'indirizzo'].map((placeholder) => (
                      <Button
                        key={placeholder}
                        variant="outline"
                        size="sm"
                        onClick={() => insertPlaceholder(placeholder)}
                      >
                        {`{{${placeholder}}}`}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={editingTemplate ? updateEmailTemplate : createEmailTemplate} 
                    className="flex-1"
                  >
                    {editingTemplate ? 'Aggiorna Template' : 'Crea Template'}
                  </Button>
                  {editingTemplate && (
                    <Button 
                      variant="outline" 
                      onClick={() => setEditingTemplate(null)}
                    >
                      Annulla
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Templates Email Esistenti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {emailTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-600" />
                          <h4 className="font-medium">{template.nome}</h4>
                          {!template.attivo && (
                            <Badge variant="outline">Inattivo</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.oggetto}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>{template.nome}</DialogTitle>
                              <DialogDescription>
                                Anteprima del template email
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3">
                              <div>
                                <strong>Oggetto:</strong> {template.oggetto}
                              </div>
                              <div>
                                <strong>Contenuto:</strong>
                                <pre className="mt-1 p-3 bg-muted rounded text-sm whitespace-pre-wrap">
                                  {template.contenuto}
                                </pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTemplate(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEmailTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Importa File Contatti
              </CardTitle>
              <CardDescription>
                Carica un file Excel o CSV con i tuoi contatti. Il file verrà elaborato e salvato in una tabella temporanea per la revisione.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">File da Importare (.xlsx, .xls, .csv)</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </div>

              {/* Progress Indicator */}
              {importProgress.isProcessing && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Clock className="h-4 w-4 animate-spin" />
                        <span className="font-medium">Importazione in corso...</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progresso</span>
                          <span>{importProgress.processedRows} / {importProgress.totalRows}</span>
                        </div>
                        <Progress 
                          value={importProgress.totalRows > 0 ? (importProgress.processedRows / importProgress.totalRows) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                      
                      {importProgress.startTime > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Tempo trascorso: {Math.floor((Date.now() - importProgress.startTime) / 1000)}s
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handleFileUpload}
                disabled={!importFile || uploadingFile || importProgress.isProcessing}
                className="w-full"
              >
                {uploadingFile || importProgress.isProcessing ? 'Elaborazione in corso...' : 'Importa File'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Gestisci Import
              </CardTitle>
              <CardDescription>
                Visualizza e gestisci i file importati. Seleziona i contatti da trasferire nella rubrica principale.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Righe</TableHead>
                    <TableHead>Errori</TableHead>
                    <TableHead>Selezionati</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{log.file_name}</TableCell>
                      <TableCell>{getStatusBadge(log.stato)}</TableCell>
                      <TableCell>{log.righe_totali}</TableCell>
                      <TableCell className="text-red-600">{log.righe_errori}</TableCell>
                      <TableCell className="text-blue-600">{log.contatti_selezionati}</TableCell>
                      <TableCell>
                         <div className="flex gap-1">
                            {/* Pulsante per processare file salvati */}
                            {(log.stato === 'pronto_per_elaborazione' || log.stato === 'file_salvato') && (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => processFile(log.id)}
                                disabled={importProgress.isProcessing}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                Elabora
                              </Button>
                            )}
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => viewImportRecords(log)}
                              disabled={loadingRecords || log.stato === 'pronto_per_elaborazione' || log.stato === 'file_salvato'}
                            >
                              <Users className="h-4 w-4" />
                              {loadingRecords && selectedImport?.id === log.id ? 'Caricamento...' : 'Gestisci'}
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => deleteImportFile(log)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            
                            {log.trasferiti_rubrica && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Trasferiti
                              </Badge>
                            )}
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {importLogs.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  Nessun file importato
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog per visualizzare i record importati */}
      <Dialog open={showRecordsDialog} onOpenChange={(open) => {
        if (!open) {
          setShowRecordsDialog(false);
          setSelectedImport(null);
          setViewingRecords([]);
          setCurrentPage(0);
          setSelectedRecords(new Set());
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Record Importati - {selectedImport?.file_name}
            </DialogTitle>
            <DialogDescription>
              Visualizza e gestisci {viewingRecords.length} di {totalRecords} contatti importati da questo file.
            </DialogDescription>
          </DialogHeader>
          
          {loadingRecords ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p>Caricamento record...</p>
              </div>
            </div>
          ) : viewingRecords.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       {Object.keys(viewingRecords[0] || {})
                         .filter(key => key !== 'id' && key !== 'import_log_id')
                         .map((key) => (
                         <TableHead key={key} className="min-w-[120px]">
                           {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                         </TableHead>
                       ))}
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {viewingRecords.map((record, index) => (
                       <TableRow key={index}>
                         {Object.entries(record)
                           .filter(([key]) => key !== 'id' && key !== 'import_log_id')
                           .map(([key, value]) => (
                           <TableCell key={key} className="max-w-[200px] truncate">
                             {value?.toString() || '-'}
                           </TableCell>
                         ))}
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Caricati: {viewingRecords.length} di {totalRecords} record totali
                </div>
                <div className="flex gap-2">
                  {hasMoreRecords && (
                    <Button 
                      variant="outline" 
                      onClick={loadMoreRecords} 
                      disabled={loadingMoreRecords}
                    >
                      {loadingMoreRecords ? 'Caricamento...' : 'Carica Altri 500'}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => {
                    setShowRecordsDialog(false);
                    setSelectedImport(null);
                    setViewingRecords([]);
                    setCurrentPage(0);
                    setSelectedRecords(new Set());
                  }}>
                    Chiudi
                  </Button>
                  <Button 
                    disabled={selectedRecords.size === 0 || importingSelected}
                    onClick={importSelectedRecords}
                  >
                    {importingSelected ? 'Trasferimento...' : `Trasferisci Selezionati (${selectedRecords.size})`}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nessun record trovato in questa importazione.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}