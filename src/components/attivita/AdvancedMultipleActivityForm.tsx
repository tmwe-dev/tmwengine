import React, { useState } from 'react';
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
import { Building, Mail, Phone, Calendar, Clock, User, FileText } from 'lucide-react';

const advancedActivitySchema = z.object({
  tipo: z.enum(['email', 'chiamata'], {
    errorMap: () => ({ message: "Seleziona tipo attività: Email o Chiamata" })
  }),
  priorita: z.enum(['alta', 'media', 'bassa']).default('media'),
  stato: z.enum(['aperta', 'in_corso', 'completata', 'annullata']).default('aperta'),
  
  // Per Email
  oggetto_email: z.string().optional(),
  testo_email: z.string().optional(),
  
  // Per Chiamata
  data_chiamata: z.string().optional(),
  ora_chiamata: z.string().optional(),
  nota_chiamata: z.string().optional(),
  
  // Per entrambi
  assegnato_nome: z.string().optional(),
  scadenza: z.string().optional(),
  salva_in_rubrica: z.boolean().default(false),
}).refine((data) => {
  if (data.tipo === 'email') {
    return data.oggetto_email && data.testo_email;
  }
  if (data.tipo === 'chiamata') {
    return data.data_chiamata && data.ora_chiamata && data.nota_chiamata;
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

interface AdvancedMultipleActivityFormProps {
  contacts: ContactRecord[];
  onSubmit: (data: AdvancedActivityFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  showSaveToRubrica?: boolean;
}

export function AdvancedMultipleActivityForm({ 
  contacts, 
  onSubmit, 
  onCancel, 
  isSubmitting, 
  showSaveToRubrica = false 
}: AdvancedMultipleActivityFormProps) {
  const [activeTab, setActiveTab] = useState<'email' | 'chiamata'>('email');
  
  const form = useForm<AdvancedActivityFormData>({
    resolver: zodResolver(advancedActivitySchema),
    defaultValues: {
      tipo: 'email',
      priorita: 'media',
      stato: 'aperta',
      oggetto_email: '',
      testo_email: '',
      data_chiamata: '',
      ora_chiamata: '',
      nota_chiamata: '',
      assegnato_nome: '',
      scadenza: '',
      salva_in_rubrica: false
    }
  });

  const watchTipo = form.watch('tipo');

  const handleTabChange = (value: string) => {
    const newType = value as 'email' | 'chiamata';
    setActiveTab(newType);
    form.setValue('tipo', newType);
  };

  const handleSubmit = (data: AdvancedActivityFormData) => {
    const submitData = {
      ...data,
      scadenza: data.scadenza ? new Date(data.scadenza).toISOString() : undefined
    };
    onSubmit(submitData);
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Contatti selezionati */}
        <div className="space-y-4">
          <h3 className="text-heading-4 font-semibold text-text-primary flex items-center gap-2">
            <User className="h-5 w-5" />
            Contatti Selezionati ({contacts.length})
          </h3>
          
          <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-4 bg-background-subtle">
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-start justify-between p-3 bg-background rounded border border-border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{getContactDisplayName(contact)}</span>
                    </div>
                    {getContactInfo(contact) && (
                      <div className="text-xs text-muted-foreground">
                        {getContactInfo(contact)}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    ID: {contact.id.slice(0, 8)}...
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tipo di attività */}
        <div className="space-y-4">
          <h3 className="text-heading-4 font-semibold text-text-primary">
            Tipo di Attività
          </h3>
          
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Invio Email
              </TabsTrigger>
              <TabsTrigger value="chiamata" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Chiamata Programmata
              </TabsTrigger>
            </TabsList>

            {/* Email Form */}
            <TabsContent value="email" className="space-y-4 mt-6">
              <div className="space-y-4 p-4 border border-border rounded-lg bg-background">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <h4 className="font-semibold">Configurazione Email</h4>
                </div>
                
                <FormField
                  control={form.control}
                  name="oggetto_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Oggetto Email *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="es. Proposta commerciale - Seguimento"
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
                      <FormLabel>Testo Email *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Gentile [Nome], scrivo per..."
                          className="min-h-[150px]"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-1">
                        Suggerimento: Usa [Nome], [Azienda], [Email] come placeholder che verranno sostituiti automaticamente
                      </p>
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>

            {/* Chiamata Form */}
            <TabsContent value="chiamata" className="space-y-4 mt-6">
              <div className="space-y-4 p-4 border border-border rounded-lg bg-background">
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="h-5 w-5 text-green-500" />
                  <h4 className="font-semibold">Programmazione Chiamata</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="data_chiamata"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Chiamata *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              type="date"
                              className="pl-10"
                            />
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
                        <FormLabel>Ora Chiamata *</FormLabel>
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

                <FormField
                  control={form.control}
                  name="nota_chiamata"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nota Chiamata *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="es. Chiamare per discutere la proposta inviata via email..."
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-1">
                        Questa nota sarà visibile nell'attività e ti aiuterà a ricordare l'obiettivo della chiamata
                      </p>
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Impostazioni comuni */}
        <div className="space-y-4">
          <h3 className="text-heading-4 font-semibold text-text-primary">
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
                    <Input {...field} placeholder="Nome della persona assegnata" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="scadenza"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scadenza Generale (opzionale)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="datetime-local"
                    placeholder="Seleziona data e ora di scadenza"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground mt-1">
                  Per le chiamate, verrà utilizzata la data/ora specifica impostata sopra
                </p>
              </FormItem>
            )}
          />
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
                      Salva anche in Rubrica
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Trasferisci automaticamente tutti i contatti selezionati nella rubrica principale prima di creare le attività
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Annulla
          </Button>
          <Button type="submit" className="shadow-soft" disabled={isSubmitting}>
            {isSubmitting ? 'Creazione in corso...' : 
             `Crea ${contacts.length} Attività ${watchTipo === 'email' ? 'Email' : 'Chiamata'}`}
          </Button>
        </div>
      </form>
    </Form>
  );
}