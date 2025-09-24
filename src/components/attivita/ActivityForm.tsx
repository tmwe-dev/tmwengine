import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const activitySchema = z.object({
  rubrica_id: z.string().optional(),
  rubrica_nome: z.string().optional(),
  tipo: z.enum(['chiamata', 'meeting', 'email', 'task'], {
    errorMap: () => ({ message: "Seleziona un tipo di attività" })
  }),
  descrizione: z.string()
    .trim()
    .nonempty({ message: "La descrizione è obbligatoria" })
    .max(500, { message: "La descrizione deve essere inferiore a 500 caratteri" }),
  stato: z.enum(['aperta', 'in_corso', 'completata', 'annullata']).default('aperta'),
  scadenza: z.string().optional(),
  priorita: z.enum(['alta', 'media', 'bassa']).default('media'),
  assegnato_a: z.string().optional(),
  assegnato_nome: z.string().optional(),
  creato_da: z.string().optional()
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

interface ActivityFormProps {
  activity?: Activity | null;
  onSubmit: (data: ActivityFormData) => void;
  onCancel: () => void;
}

export function ActivityForm({ activity, onSubmit, onCancel }: ActivityFormProps) {
  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      rubrica_id: activity?.rubrica_id || '',
      rubrica_nome: activity?.rubrica_nome || '',
      tipo: activity?.tipo || 'task',
      descrizione: activity?.descrizione || '',
      stato: activity?.stato || 'aperta',
      scadenza: activity?.scadenza ? new Date(activity.scadenza).toISOString().slice(0, 16) : '',
      priorita: activity?.priorita || 'media',
      assegnato_a: activity?.assegnato_a || '',
      assegnato_nome: activity?.assegnato_nome || '',
      creato_da: activity?.creato_da || ''
    }
  });

  const handleSubmit = (data: ActivityFormData) => {
    const submitData = {
      ...data,
      scadenza: data.scadenza ? new Date(data.scadenza).toISOString() : undefined
    };
    onSubmit(submitData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Informazioni di base */}
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
                    <Select value={field.value} onValueChange={field.onChange}>
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
        </div>

        {/* Contatto collegato */}
        <div className="space-y-4">
          <h3 className="text-heading-4 font-semibold text-text-primary">
            Contatto Collegato
          </h3>
          
          <FormField
            control={form.control}
            name="rubrica_nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Contatto</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nome del contatto collegato (opzionale)" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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