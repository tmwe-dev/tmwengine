import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Mail, Phone, Calendar, Clock, User, FileText, CalendarIcon, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const advancedActivitySchema = z.object({
  tipo: z.enum(['email', 'chiamata']),
  priorita: z.enum(['alta', 'media', 'bassa']),
  
  // Per Email
  oggetto_email: z.string().optional(),
  testo_email: z.string().optional(),
  
  // Per Email futura (opzionale)
  programma_email: z.boolean(),
  data_email_futura: z.string().optional(),
  ora_email_futura: z.string().optional(),
  template_email_futura: z.string().optional(),
  
  // Per Chiamata e Note generali
  note_generali: z.string().optional(),
  
  // Per chiamata futura (opzionale)
  programma_chiamata: z.boolean(),
  data_chiamata_futura: z.string().optional(),
  ora_chiamata_futura: z.string().optional(),
  
  // Per entrambi
  assegnato_nome: z.string().optional(),
  salva_in_rubrica: z.boolean(),
  
  // Allegati
  allegati_esistenti: z.array(z.string()), // IDs degli allegati selezionati dalla memoria
  nuovi_allegati: z.array(z.any()), // Nuovi file caricati
}).refine((data) => {
  if (data.tipo === 'email') {
    return data.oggetto_email && data.testo_email;
  }
  if (data.tipo === 'chiamata') {
    return data.note_generali && data.note_generali.trim().length > 0;
  }
  return true;
}, {
  message: "Compila tutti i campi obbligatori per il tipo di attività selezionato",
  path: ["tipo"]
});

type AdvancedActivityFormData = z.infer<typeof advancedActivitySchema>;

interface ContactRecord {
  id: string;
  company_name?: string;
  company_alias?: string;
  name?: string;
  alias?: string;
  email?: string;
  phone?: string;
  cell?: string;
  [key: string]: any;
}

interface EmailTemplate {
  id: string;
  nome: string;
  oggetto: string;
  contenuto: string;
}

interface EmailAttachment {
  id: string;
  nome: string;
  file_path: string;
  file_size: number;
  mime_type: string;
}

interface AdvancedMultipleActivityFormProps {
  contacts: ContactRecord[];
  onSubmit: (data: AdvancedActivityFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  showSaveToRubrica?: boolean;
  defaultActivityType?: 'email' | 'chiamata';
}

export function AdvancedMultipleActivityForm({ 
  contacts, 
  onSubmit, 
  onCancel, 
  isSubmitting, 
  showSaveToRubrica = false,
  defaultActivityType = 'chiamata'
}: AdvancedMultipleActivityFormProps) {
  const [activeTab, setActiveTab] = useState<'email' | 'chiamata'>(defaultActivityType);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [userProfile, setUserProfile] = useState<{nomeCompleto: string} | null>(null);
  
  const form = useForm<AdvancedActivityFormData>({
    resolver: zodResolver(advancedActivitySchema),
    defaultValues: {
      tipo: defaultActivityType,
      priorita: 'media',
      oggetto_email: '',
      testo_email: '',
      programma_email: false,
      data_email_futura: '',
      ora_email_futura: '',
      template_email_futura: '',
      note_generali: '',
      programma_chiamata: false,
      data_chiamata_futura: '',
      ora_chiamata_futura: '',
      assegnato_nome: '',
      salva_in_rubrica: false,
      allegati_esistenti: [],
      nuovi_allegati: [],
    }
  });

  const watchTipo = form.watch('tipo');

  useEffect(() => {
    loadEmailTemplates();
    loadEmailAttachments();
    loadUserProfile();
  }, []);

  const loadEmailTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('attivo', true)
        .order('nome');

      if (error) throw error;
      setEmailTemplates(data || []);
    } catch (error) {
      console.error('Errore caricamento template:', error);
    }
  };

  const loadEmailAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('email_attachments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmailAttachments(data || []);
    } catch (error) {
      console.error('Errore caricamento allegati:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('config_generale')
        .select('nome_utente, cognome_utente')
        .maybeSingle();

      if (error) throw error;
      
      if (data && data.nome_utente && data.cognome_utente) {
        const nomeCompleto = `${data.nome_utente} ${data.cognome_utente}`;
        setUserProfile({ nomeCompleto });
        // Auto-imposta il campo assegnato_nome
        form.setValue('assegnato_nome', nomeCompleto);
      }
    } catch (error) {
      console.error('Errore caricamento profilo utente:', error);
    }
  };

  // Gestione drag & drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
    
    // Aggiorna il form
    const currentFiles = form.getValues('nuovi_allegati') || [];
    form.setValue('nuovi_allegati', [...currentFiles, ...files]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    
    // Aggiorna il form
    const currentFiles = form.getValues('nuovi_allegati') || [];
    form.setValue('nuovi_allegati', [...currentFiles, ...files]);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    form.setValue('nuovi_allegati', newFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleTabChange = (value: string) => {
    const newType = value as 'email' | 'chiamata';
    setActiveTab(newType);
    form.setValue('tipo', newType);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      form.setValue('oggetto_email', template.oggetto);
      form.setValue('testo_email', template.contenuto);
    }
  };

  const handleSubmit = (data: AdvancedActivityFormData) => {
    console.log('📋 Form submit con dati:', data);
    
    // Validazione esplicita prima dell'invio
    if (data.tipo === 'email') {
      if (!data.oggetto_email || !data.testo_email) {
        console.error('❌ Validazione fallita: email senza oggetto o testo');
        return;
      }
    } else if (data.tipo === 'chiamata') {
      if (!data.note_generali || data.note_generali.trim().length === 0) {
        console.error('❌ Validazione fallita: chiamata senza note');
        return;
      }
    }
    
    // I dati vengono passati così come sono - la logica di creazione attività è gestita dal parent
    onSubmit(data);
  };

  const getContactDisplayName = (contact: ContactRecord) => {
    const company = contact.company_name || contact.company_alias || 'Azienda non specificata';
    const person = contact.name || contact.alias || '';
    return person ? `${company} - ${person}` : company;
  };

  const getContactInfo = (contact: ContactRecord) => {
    const info = [];
    if (contact.email) info.push(contact.email);
    if (contact.phone) info.push(contact.phone);
    if (contact.cell) info.push(contact.cell);
    return info.join(' • ');
  };

  return (
    <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-2">
          {/* Aziende selezionate - Nascondi se array vuoto (attività singola) */}
          {contacts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Building className="h-5 w-5" />
                {contacts.length === 1 ? 'Azienda Selezionata' : `Aziende Selezionate (${contacts.length})`}
              </h3>
              
              <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-3 bg-background-subtle">
                <div className="space-y-3">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="p-3 bg-background rounded-lg border border-border shadow-sm">
                      {/* Nome azienda prominente in alto */}
                      <div className="flex items-start gap-2 mb-2">
                        <Building className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <h4 className="font-semibold text-base text-text-primary leading-tight">
                          {contact.company_name || contact.company_alias || contact.name || 'Azienda non specificata'}
                        </h4>
                      </div>
                      
                      {/* Informazioni di contatto sotto */}
                      <div className="space-y-1 ml-6">
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                        {(contact.phone || contact.cell) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{contact.phone || contact.cell}</span>
                          </div>
                        )}
                        {contact.alias && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{contact.alias}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tipo di attività */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">
              Tipo di Attività
            </h3>
            
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chiamata" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Chiamata Programmata
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Invio Email
                </TabsTrigger>
              </TabsList>

                {/* Email Form */}
                <TabsContent value="email" className="space-y-2 mt-2">
                  <div className="space-y-2 p-2 border border-border rounded-lg bg-background">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-3 w-3 text-blue-500" />
                      <h4 className="font-medium text-xs">Configurazione Email</h4>
                    </div>

                  {/* Selezione Template */}
                  {emailTemplates.length > 0 && (
                    <div className="mb-3">
                      <label className="text-xs font-medium mb-1 block">Template Email (opzionale)</label>
                      <Select onValueChange={handleTemplateSelect}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleziona un template..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {emailTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex items-center gap-2">
                                <FileText className="h-3 w-3" />
                                <span className="text-xs">{template.nome}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                {/* Gestione Allegati Email */}
                <div className="space-y-2 border border-border rounded p-2 bg-background-subtle">
                  <h5 className="font-medium text-xs">Allegati Email</h5>
                  
                  {/* Allegati esistenti dalla memoria */}
                  {emailAttachments.length > 0 && (
                    <div>
                      <label className="text-xs font-medium mb-1 block">Seleziona dalla memoria</label>
                      <div className="max-h-20 overflow-y-auto space-y-1">
                        {emailAttachments.map((attachment) => (
                          <FormField
                            key={attachment.id}
                            control={form.control}
                            name="allegati_esistenti"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(attachment.id)}
                                    onCheckedChange={(checked) => {
                                      const currentValues = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValues, attachment.id]);
                                      } else {
                                        field.onChange(currentValues.filter(id => id !== attachment.id));
                                      }
                                    }}
                                    className="h-3 w-3"
                                  />
                                </FormControl>
                                <div className="flex-1 min-w-0">
                                  <FormLabel className="text-xs font-normal cursor-pointer truncate block">
                                    {attachment.nome}
                                  </FormLabel>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(attachment.file_size)}
                                  </p>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload nuovi allegati */}
                  <div>
                    <label className="text-xs font-medium mb-1 block">Carica nuovi allegati</label>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded p-3 text-center transition-colors",
                        dragActive 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      )}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mb-1">
                        Trascina file o clicca
                      </p>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        Seleziona
                      </Button>
                    </div>

                    {/* Lista file selezionati */}
                    {selectedFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <label className="text-xs font-medium">File selezionati:</label>
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-1 bg-background border border-border rounded text-xs">
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{file.name}</span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                ({formatFileSize(file.size)})
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                  <FormField
                    control={form.control}
                    name="oggetto_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Oggetto Email *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="es. Proposta commerciale - Seguimento"
                            className="h-9 text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="testo_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Testo Email *</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Gentile [Nome], scrivo per..."
                            className="min-h-[80px] text-sm resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground mt-1">
                          Suggerimento: Usa [Nome], [Azienda], [Email] come placeholder che verranno sostituiti automaticamente
                        </p>
                      </FormItem>
                    )}
                  />
                
                {/* Programma email futura */}
                <div className="mt-4 p-4 border border-border rounded-lg bg-background-subtle">
                  <FormField
                    control={form.control}
                    name="programma_email"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-medium">
                            Programma anche una email futura
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Crea un'attività separata per un'email da inviare in futuro
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                    {form.watch('programma_email') && (
                      <div className="space-y-3 mt-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="data_email_futura"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Data Email Futura</FormLabel>
                                <FormControl>
                                  <div className="flex gap-2">
                                    <div className="relative flex-1">
                                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                      <Input {...field} type="date" className="pl-9 h-9 text-sm" />
                                    </div>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" type="button" className="h-9 w-9 p-0">
                                          <CalendarIcon className="h-3.5 w-3.5" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarComponent
                                          mode="single"
                                          selected={field.value ? new Date(field.value) : undefined}
                                          onSelect={(date) => {
                                            if (date) {
                                              field.onChange(format(date, 'yyyy-MM-dd'));
                                            }
                                          }}
                                          disabled={(date) => date < new Date()}
                                          initialFocus
                                          className={cn("p-3 pointer-events-auto")}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="ora_email_futura"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Ora Email (opzionale)</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                      {...field}
                                      type="time"
                                      className="pl-9 h-9 text-sm"
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      
                        {/* Template per email futura */}
                        {emailTemplates.length > 0 && (
                          <FormField
                            control={form.control}
                            name="template_email_futura"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Template per Email Futura (opzionale)</FormLabel>
                                <FormControl>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="h-9 text-sm">
                                      <SelectValue placeholder="Seleziona un template per l'email futura..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                      {emailTemplates.map((template) => (
                                        <SelectItem key={template.id} value={template.id}>
                                          <div className="flex items-center gap-2">
                                            <FileText className="h-3.5 w-3.5" />
                                            <span className="text-sm">{template.nome}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Chiamata Form */}
            <TabsContent value="chiamata" className="space-y-4 mt-6">
              <div className="space-y-4 p-4 border border-border rounded-lg bg-background">
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="h-5 w-5 text-green-500" />
                  <h4 className="font-semibold">Note Chiamata</h4>
                </div>
                
                <FormField
                  control={form.control}
                  name="note_generali"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note Generali *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Scrivi cosa hai fatto: chiamata effettuata, email inviata, nota aggiunta..."
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-1">
                        Descrivi l'attività che hai appena completato o quello che stai facendo ora
                      </p>
                    </FormItem>
                  )}
                />
                
                {/* Programma chiamata futura */}
                <div className="mt-4 p-4 border border-border rounded-lg bg-background-subtle">
                  <FormField
                    control={form.control}
                    name="programma_chiamata"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-medium">
                            Programma anche una chiamata futura
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Crea un'attività separata per una chiamata da fare in futuro
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('programma_chiamata') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="data_chiamata_futura"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data Chiamata Futura</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input {...field} type="date" className="pl-10" />
                                </div>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" size="icon" type="button">
                                      <CalendarIcon className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarComponent
                                      mode="single"
                                      selected={field.value ? new Date(field.value) : undefined}
                                      onSelect={(date) => {
                                        if (date) {
                                          field.onChange(format(date, 'yyyy-MM-dd'));
                                        }
                                      }}
                                      disabled={(date) => date < new Date()}
                                      initialFocus
                                      className={cn("p-3 pointer-events-auto")}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="ora_chiamata_futura"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ora Chiamata (opzionale)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  {...field}
                                  type="time"
                                  className="pl-10"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Impostazioni comuni */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">
            Impostazioni Comuni
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="priorita"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorità</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona priorità" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="bassa">Bassa</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assegnato_nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assegnato a</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        {...field} 
                        placeholder={userProfile ? userProfile.nomeCompleto : "Nome della persona assegnata"}
                        className={userProfile ? "bg-muted" : ""}
                      />
                      {userProfile && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  {userProfile && (
                    <p className="text-xs text-muted-foreground">
                      Auto-assegnato dal profilo utente nelle impostazioni
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>


        {/* Opzione salva in rubrica */}
        {showSaveToRubrica && (
          <div className="space-y-4">
            <h3 className="text-heading-4 font-semibold text-text-primary">
              Opzioni Aggiuntive
            </h3>
            
            <FormField
              control={form.control}
              name="salva_in_rubrica"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-border rounded-lg">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Salva anche in Rubrica Clienti
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Trasferisci automaticamente tutti i contatti selezionati nella rubrica clienti prima di creare le attività
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Annulla
          </Button>
          <Button type="submit" className="shadow-soft" disabled={isSubmitting}>
            {isSubmitting ? 'Creazione in corso...' : 
             `Registra ${contacts.length} Attività ${watchTipo === 'email' ? 'Email' : 'Chiamata'}`}
          </Button>
        </div>
      </form>
    </Form>
    </div>
  );
}