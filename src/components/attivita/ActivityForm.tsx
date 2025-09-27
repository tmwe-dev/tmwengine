import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Phone, Calendar, Clock, FileText, CalendarIcon } from 'lucide-react';
import { CompanySelector } from './CompanySelector';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const activitySchema = z.object({
  rubrica_id: z.string().optional(),
  rubrica_nome: z.string().optional(),
  company_alias: z.string().optional(),
  contact_name: z.string().optional(),
  contact_alias: z.string().optional(),
  tipo: z.enum(['chiamata', 'meeting', 'email', 'task'], {
    errorMap: () => ({ message: "Seleziona un tipo di attività" })
  }),
  descrizione: z.string().optional(),
  
  // Campi specifici per email
  oggetto_email: z.string().optional(),
  testo_email: z.string().optional(),
  
  // Campi specifici per chiamata
  data_chiamata: z.string().optional(),
  ora_chiamata: z.string().optional(),
  note_generali: z.string().optional(),
  
  stato: z.enum(['aperta', 'in_corso', 'completata', 'annullata']).default('aperta'),
  scadenza: z.string().optional(),
  priorita: z.enum(['alta', 'media', 'bassa']).default('media'),
  assegnato_a: z.string().optional(),
  assegnato_nome: z.string().optional(),
  creato_da: z.string().optional()
}).refine((data) => {
  // Validazione condizionale basata sul tipo
  if (data.tipo === 'email') {
    return data.oggetto_email && data.testo_email;
  }
  if (data.tipo === 'chiamata') {
    return data.note_generali && data.note_generali.trim().length > 0;
  }
  if (data.tipo === 'task' || data.tipo === 'meeting') {
    return data.descrizione && data.descrizione.trim().length > 0;
  }
  return true;
}, {
  message: "Compila tutti i campi obbligatori per il tipo di attività selezionato",
  path: ["descrizione"]
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface Activity {
  id: string;
  rubrica_id?: string;
  rubrica_nome?: string;
  tipo: 'chiamata' | 'meeting' | 'email' | 'task';
  descrizione: string;
  stato: 'aperta' | 'in_corso' | 'completata' | 'annullata';
  scadenza?: string;
  priorita: 'alta' | 'media' | 'bassa';
  assegnato_a?: string;
  assegnato_nome?: string;
  creato_da?: string;
  data_creazione: string;
}

interface EmailTemplate {
  id: string;
  nome: string;
  oggetto: string;
  contenuto: string;
}

interface ActivityFormProps {
  activity?: Activity | null;
  onSubmit: (data: ActivityFormData) => void;
  onCancel: () => void;
  preselectedCompany?: {
    id: string;
    name: string;
    alias?: string;
    contact_name?: string;
    contact_alias?: string;
  };
}

export function ActivityForm({ activity, onSubmit, onCancel, preselectedCompany }: ActivityFormProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'email' | 'chiamata'>('basic');
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  
  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      rubrica_id: activity?.rubrica_id || preselectedCompany?.id || '',
      rubrica_nome: activity?.rubrica_nome || preselectedCompany?.name || '',
      company_alias: preselectedCompany?.alias || '',
      contact_name: preselectedCompany?.contact_name || '',
      contact_alias: preselectedCompany?.contact_alias || '',
      tipo: activity?.tipo || 'task',
      descrizione: activity?.descrizione || '',
      oggetto_email: '',
      testo_email: '',
      data_chiamata: '',
      ora_chiamata: '',
      note_generali: '',
      stato: activity?.stato || 'aperta',
      scadenza: activity?.scadenza ? new Date(activity.scadenza).toISOString().slice(0, 16) : '',
      priorita: activity?.priorita || 'media',
      assegnato_a: activity?.assegnato_a || '',
      assegnato_nome: activity?.assegnato_nome || '',
      creato_da: activity?.creato_da || ''
    }
  });

  const watchTipo = form.watch('tipo');

  useEffect(() => {
    loadEmailTemplates();
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

  const handleTemplateSelect = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      form.setValue('oggetto_email', template.oggetto);
      form.setValue('testo_email', template.contenuto);
    }
  };

  const handleSubmit = (data: ActivityFormData) => {
    let finalDescription = data.descrizione || '';
    
    // Se è email, crea descrizione automatica
    if (data.tipo === 'email' && data.oggetto_email && data.testo_email) {
      finalDescription = `Email: ${data.oggetto_email}\n\nTesto:\n${data.testo_email}`;
    }
    
    // Se è chiamata, usa le note generali come descrizione
    if (data.tipo === 'chiamata' && data.note_generali) {
      finalDescription = data.note_generali;
    }
    
    const submitData = {
      ...data,
      descrizione: finalDescription,
      scadenza: data.scadenza ? new Date(data.scadenza).toISOString() : undefined
    };
    onSubmit(submitData);
  };

  const handleTipoChange = (newTipo: string) => {
    form.setValue('tipo', newTipo as any);
    
    // Cambia tab automaticamente
    if (newTipo === 'email') {
      setActiveTab('email');
    } else if (newTipo === 'chiamata') {
      setActiveTab('chiamata');
    } else {
      setActiveTab('basic');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Tipo di attività */}
        <div className="space-y-4">
          <h3 className="text-heading-4 font-semibold text-text-primary">
            Dettagli Attività
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Attività *</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={handleTipoChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chiamata">Chiamata</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
          </div>

          
          {/* Campi specifici per tipo attività */}
          {watchTipo === 'email' && (
            <div className="space-y-4 p-4 border border-border rounded-lg bg-background">
               <div className="flex items-center gap-2 mb-4">
                 <Mail className="h-5 w-5 text-blue-500" />
                 <h4 className="font-semibold">Configurazione Email</h4>
               </div>

               {/* Selezione Template */}
               {emailTemplates.length > 0 && (
                 <div className="mb-4">
                   <label className="text-sm font-medium mb-2 block">Template Email (opzionale)</label>
                   <Select onValueChange={handleTemplateSelect}>
                     <SelectTrigger>
                       <SelectValue placeholder="Seleziona un template..." />
                     </SelectTrigger>
                     <SelectContent>
                       {emailTemplates.map((template) => (
                         <SelectItem key={template.id} value={template.id}>
                           <div className="flex items-center gap-2">
                             <FileText className="h-4 w-4" />
                             {template.nome}
                           </div>
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               )}
               
               <FormField
                control={form.control}
                name="oggetto_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oggetto Email *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="es. Proposta commerciale - Seguimento" />
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
                    <FormLabel>Testo Email *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Gentile [Nome], scrivo per..."
                        className="min-h-[150px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {watchTipo === 'chiamata' && (
            <div className="space-y-4 p-4 border border-border rounded-lg bg-background">
               <div className="flex items-center gap-2 mb-4">
                 <Phone className="h-5 w-5 text-green-500" />
                 <h4 className="font-semibold">Programmazione Chiamata (opzionale)</h4>
               </div>
              
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                   control={form.control}
                   name="data_chiamata"
                   render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Chiamata</FormLabel>
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
                  name="ora_chiamata"
                  render={({ field }) => (
                     <FormItem>
                       <FormLabel>Ora Chiamata</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input {...field} type="time" className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                         placeholder="es. Aggiornamento contatto, invio mail promozionale..."
                         className="min-h-[100px]"
                       />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
            </div>
          )}

          {(watchTipo === 'task' || watchTipo === 'meeting') && (
            <FormField
              control={form.control}
              name="descrizione"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descrivi l'attività da svolgere..."
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Contatto collegato */}
        <div className="space-y-4">
          <h3 className="text-heading-4 font-semibold text-text-primary">
            Azienda e Contatto Collegati
          </h3>
           
           {!preselectedCompany && (
             <FormField
               control={form.control}
               name="rubrica_id"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Seleziona Azienda</FormLabel>
                   <FormControl>
                     <CompanySelector
                       value={field.value}
                       onSelect={(companyId, companyName) => {
                         field.onChange(companyId);
                         form.setValue('rubrica_nome', companyName);
                       }}
                       placeholder="Seleziona un'azienda (opzionale)"
                     />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
               )}
             />
           )}

           {/* Mostra informazioni contatto preselezionato */}
           {preselectedCompany && (
             <div className="p-3 bg-background-subtle rounded border border-border">
               <h4 className="font-medium text-sm mb-2">Dettagli Contatto:</h4>
               <div className="text-sm text-muted-foreground space-y-1">
                 <div><strong>Azienda:</strong> {preselectedCompany.name}</div>
                 {preselectedCompany.alias && <div><strong>Alias Azienda:</strong> {preselectedCompany.alias}</div>}
                 {preselectedCompany.contact_name && <div><strong>Contatto:</strong> {preselectedCompany.contact_name}</div>}
                 {preselectedCompany.contact_alias && <div><strong>Alias Contatto:</strong> {preselectedCompany.contact_alias}</div>}
               </div>
             </div>
           )}
        </div>

         {/* Scadenza e assegnazione */}
         <div className="space-y-4">
            <h3 className="text-heading-4 font-semibold text-text-primary">
              Programmazione
            </h3>
           
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scadenza"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data e Ora Scadenza</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="datetime-local"
                        placeholder="Seleziona data e ora"
                      />
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
                      <Input {...field} placeholder="Nome della persona assegnata" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
         </div>

        {/* Stato (solo per modifica) */}
        {activity && (
          <div className="space-y-4">
            <h3 className="text-heading-4 font-semibold text-text-primary">
              Stato
            </h3>
            
            <FormField
              control={form.control}
              name="stato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stato Attività</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona stato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aperta">Aperta</SelectItem>
                        <SelectItem value="in_corso">In Corso</SelectItem>
                        <SelectItem value="completata">Completata</SelectItem>
                        <SelectItem value="annullata">Annullata</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button type="submit" className="shadow-soft">
            {activity ? 'Salva Modifiche' : 'Crea Attività'}
          </Button>
        </div>
      </form>
    </Form>
  );
}