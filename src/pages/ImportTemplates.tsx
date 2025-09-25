import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Plus, Trash2, Eye, Edit, Mail, Users, Database } from 'lucide-react';
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

      // Chiama l'edge function per elaborare il file
      const { data: processResult, error: processError } = await supabase.functions
        .invoke('process-import-file', {
          body: {
            filePath: fileName,
            fileName: importFile.name
          }
        });

      if (processError) throw processError;

      if (processResult.success) {
        const { totalRows, importedRows, errorRows, tableName } = processResult.data;
        
        if (errorRows > 0) {
          toast.success(`File importato con alcuni errori: ${importedRows}/${totalRows} righe elaborate. Tabella creata: ${tableName}`);
        } else {
          toast.success(`File importato con successo: ${importedRows} righe elaborate. Tabella creata: ${tableName}`);
        }
      } else {
        throw new Error(processResult.error);
      }

      setImportFile(null);
      loadImportLogs();
    } catch (error: any) {
      console.error('Errore nel caricamento file:', error);
      toast.error(`Errore nel caricamento del file: ${error.message}`);
    } finally {
      setUploadingFile(false);
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
        return <Badge variant="outline">In corso</Badge>;
      default:
        return <Badge variant="outline">{stato}</Badge>;
    }
  };

  const viewImportRecords = async (importLog: ImportLog) => {
    if (!importLog.nome_tabella_temporanea) {
      toast.error('Tabella temporanea non disponibile');
      return;
    }

    setSelectedImport(importLog);
    setLoadingRecords(true);

    try {
      const { data, error } = await supabase
        .rpc('get_temp_table_data', { 
          table_name: importLog.nome_tabella_temporanea 
        });

      if (error) throw error;
      
      // Parse the JSON response to array of contacts
      const contacts = Array.isArray(data) ? data : (data ? JSON.parse(data as string) : []);
      setViewingRecords(contacts);
    } catch (error) {
      console.error('Errore nel caricamento record:', error);
      toast.error('Errore nel caricamento dei record importati');
    } finally {
      setLoadingRecords(false);
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

              <Button 
                onClick={handleFileUpload}
                disabled={!importFile || uploadingFile}
                className="w-full"
              >
                {uploadingFile ? 'Elaborazione in corso...' : 'Importa File'}
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
                           {log.nome_tabella_temporanea && (
                             <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => viewImportRecords(log)}
                               disabled={loadingRecords}
                             >
                               <Users className="h-4 w-4" />
                               {loadingRecords && selectedImport?.id === log.id ? 'Caricamento...' : 'Gestisci'}
                             </Button>
                           )}
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
      <Dialog open={!!selectedImport} onOpenChange={(open) => !open && setSelectedImport(null)}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Record Importati - {selectedImport?.file_name}
            </DialogTitle>
            <DialogDescription>
              Visualizza e gestisci i {viewingRecords.length} contatti importati da questo file.
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
                      {Object.keys(viewingRecords[0] || {}).map((key) => (
                        <TableHead key={key} className="min-w-[120px]">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingRecords.map((record, index) => (
                      <TableRow key={index}>
                        {Object.entries(record).map(([key, value]) => (
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
                  Totale record: {viewingRecords.length}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedImport(null)}>
                    Chiudi
                  </Button>
                  <Button>
                    Trasferisci Selezionati
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