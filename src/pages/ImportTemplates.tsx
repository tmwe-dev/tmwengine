import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CRMLayout } from '@/components/layout/CRMLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Download, FileSpreadsheet, FileText, Plus, Trash2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Template {
  id: string;
  nome: string;
  descrizione: string;
  tipo: string;
  mapping_colonne: any;
  file_path: string | null;
  attivo: boolean;
  created_at: string;
}

interface ImportLog {
  id: string;
  template_id: string;
  file_name: string;
  righe_totali: number;
  righe_importate: number;
  righe_errori: number;
  stato: string;
  created_at: string;
  templates: { nome: string };
}

export default function ImportTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [importFile, setImportFile] = useState<File | null>(null);
  
  // Form per nuovo template
  const [newTemplate, setNewTemplate] = useState({
    nome: '',
    descrizione: '',
    tipo: 'excel',
    mapping_colonne: '{"A": "responsabile", "B": "azienda", "C": "email", "D": "telefono"}'
  });

  useEffect(() => {
    loadTemplates();
    loadImportLogs();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Errore nel caricamento templates:', error);
      toast.error('Errore nel caricamento dei templates');
    }
  };

  const loadImportLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('import_logs')
        .select(`
          *,
          templates (nome)
        `)
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

  const createTemplate = async () => {
    try {
      let mappingColonne;
      try {
        mappingColonne = JSON.parse(newTemplate.mapping_colonne);
      } catch (e) {
        toast.error('Il mapping delle colonne deve essere un JSON valido');
        return;
      }

      const { error } = await supabase
        .from('templates')
        .insert({
          nome: newTemplate.nome,
          descrizione: newTemplate.descrizione,
          tipo: newTemplate.tipo,
          mapping_colonne: mappingColonne
        });

      if (error) throw error;

      toast.success('Template creato con successo');
      setNewTemplate({
        nome: '',
        descrizione: '',
        tipo: 'excel',
        mapping_colonne: '{"A": "responsabile", "B": "azienda", "C": "email", "D": "telefono"}'
      });
      loadTemplates();
    } catch (error) {
      console.error('Errore nella creazione template:', error);
      toast.error('Errore nella creazione del template');
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Template eliminato');
      loadTemplates();
    } catch (error) {
      console.error('Errore nell\'eliminazione:', error);
      toast.error('Errore nell\'eliminazione del template');
    }
  };

  const handleFileUpload = async () => {
    if (!importFile || !selectedTemplate) {
      toast.error('Seleziona un template e un file da importare');
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
            templateId: selectedTemplate,
            filePath: fileName,
            fileName: importFile.name
          }
        });

      if (processError) throw processError;

      if (processResult.success) {
        const { totalRows, importedRows, errorRows } = processResult.data;
        
        if (errorRows > 0) {
          toast.success(`Importazione completata con alcuni errori: ${importedRows}/${totalRows} righe importate`);
        } else {
          toast.success(`Importazione completata: ${importedRows} righe importate`);
        }
      } else {
        throw new Error(processResult.error);
      }

      setImportFile(null);
      setSelectedTemplate('');
      loadImportLogs();
    } catch (error) {
      console.error('Errore nel caricamento file:', error);
      toast.error(`Errore nel caricamento del file: ${error.message}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const downloadTemplate = (template: Template) => {
    // Crea un CSV di esempio basato sul mapping
    const headers = Object.values(template.mapping_colonne).join(',');
    const exampleRow = Object.keys(template.mapping_colonne).map(() => 'Esempio').join(',');
    const csvContent = `${headers}\n${exampleRow}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${template.nome.replace(/\s+/g, '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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

  return (
    <CRMLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestione Import Templates</h1>
            <p className="text-muted-foreground">
              Gestisci i template per l'importazione di contatti da file Excel e CSV
            </p>
          </div>
        </div>

        <Tabs defaultValue="import" className="space-y-4">
          <TabsList>
            <TabsTrigger value="import">Importa Dati</TabsTrigger>
            <TabsTrigger value="templates">Gestione Templates</TabsTrigger>
            <TabsTrigger value="logs">Cronologia Importazioni</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Importa File
                </CardTitle>
                <CardDescription>
                  Carica un file Excel o CSV utilizzando un template predefinito
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-select">Seleziona Template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Scegli un template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.filter(t => t.attivo).map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.nome} ({template.tipo.toUpperCase()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file-upload">File da Importare</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleFileUpload}
                    disabled={!importFile || !selectedTemplate || uploadingFile}
                  >
                    {uploadingFile ? 'Caricamento...' : 'Importa File'}
                  </Button>
                  
                  {selectedTemplate && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const template = templates.find(t => t.id === selectedTemplate);
                        if (template) downloadTemplate(template);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Scarica Template
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Nuovo Template
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Template</Label>
                    <Input
                      id="nome"
                      value={newTemplate.nome}
                      onChange={(e) => setNewTemplate({...newTemplate, nome: e.target.value})}
                      placeholder="Es: Template Clienti Standard"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descrizione">Descrizione</Label>
                    <Textarea
                      id="descrizione"
                      value={newTemplate.descrizione}
                      onChange={(e) => setNewTemplate({...newTemplate, descrizione: e.target.value})}
                      placeholder="Descrizione del template"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo File</Label>
                    <Select 
                      value={newTemplate.tipo} 
                      onValueChange={(value) => setNewTemplate({...newTemplate, tipo: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel (.xlsx, .xls)</SelectItem>
                        <SelectItem value="csv">CSV (.csv)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mapping">Mapping Colonne (JSON)</Label>
                    <Textarea
                      id="mapping"
                      value={newTemplate.mapping_colonne}
                      onChange={(e) => setNewTemplate({...newTemplate, mapping_colonne: e.target.value})}
                      placeholder='{"A": "responsabile", "B": "azienda", "C": "email"}'
                      rows={4}
                    />
                  </div>

                  <Button onClick={createTemplate} className="w-full">
                    Crea Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Templates Esistenti</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {template.tipo === 'excel' ? (
                              <FileSpreadsheet className="h-4 w-4 text-green-600" />
                            ) : (
                              <FileText className="h-4 w-4 text-blue-600" />
                            )}
                            <h4 className="font-medium">{template.nome}</h4>
                            {!template.attivo && (
                              <Badge variant="outline">Inattivo</Badge>
                            )}
                          </div>
                          {template.descrizione && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {template.descrizione}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{template.nome}</DialogTitle>
                                <DialogDescription>
                                  Dettagli del template
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-3">
                                <div>
                                  <strong>Tipo:</strong> {template.tipo.toUpperCase()}
                                </div>
                                <div>
                                  <strong>Mapping Colonne:</strong>
                                  <pre className="mt-1 p-2 bg-muted rounded text-sm">
                                    {JSON.stringify(template.mapping_colonne, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadTemplate(template)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTemplate(template.id)}
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

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cronologia Importazioni</CardTitle>
                <CardDescription>
                  Storico delle importazioni effettuate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Righe</TableHead>
                      <TableHead>Successo</TableHead>
                      <TableHead>Errori</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {new Date(log.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{log.templates?.nome}</TableCell>
                        <TableCell>{log.file_name}</TableCell>
                        <TableCell>{getStatusBadge(log.stato)}</TableCell>
                        <TableCell>{log.righe_totali}</TableCell>
                        <TableCell className="text-green-600">{log.righe_importate}</TableCell>
                        <TableCell className="text-red-600">{log.righe_errori}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {importLogs.length === 0 && !loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nessuna importazione effettuata
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CRMLayout>
  );
}