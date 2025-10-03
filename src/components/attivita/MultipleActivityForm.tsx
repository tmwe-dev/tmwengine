import React from 'react';
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
import { Building } from 'lucide-react';

const multipleActivitySchema = z.object({
  tipo: z.enum(['chiamata', 'meeting', 'email', 'task']),
  descrizione: z.string()
    .trim()
    .min(1, { message: "La descrizione è obbligatoria" })
    .max(500, { message: "La descrizione deve essere inferiore a 500 caratteri" }),
  stato: z.enum(['aperta', 'in_corso', 'completata', 'annullata']),
  scadenza: z.string().optional(),
  priorita: z.enum(['alta', 'media', 'bassa']),
  assegnato_nome: z.string().optional(),
  salva_in_rubrica: z.boolean(),
});

type MultipleActivityFormData = z.infer<typeof multipleActivitySchema>;

interface Company {
  id: string;
  name: string;
  source?: string;
}

interface MultipleActivityFormProps {
  companies: Company[];
  onSubmit: (data: MultipleActivityFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  showSaveToRubrica?: boolean; // Nuova prop per mostrare l'opzione
}

export function MultipleActivityForm({ companies, onSubmit, onCancel, isSubmitting, showSaveToRubrica = false }: MultipleActivityFormProps) {
  const form = useForm<MultipleActivityFormData>({
    resolver: zodResolver(multipleActivitySchema),
    defaultValues: {
      tipo: 'task',
      descrizione: '',
      stato: 'aperta',
      scadenza: '',
      priorita: 'media',
      assegnato_nome: '',
      salva_in_rubrica: false
    }
  });

  const handleSubmit = (data: MultipleActivityFormData) => {
    const submitData = {
      ...data,
      scadenza: data.scadenza ? new Date(data.scadenza).toISOString() : undefined
    };
    onSubmit(submitData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Aziende selezionate */}
        <div className="space-y-4">
          <h3 className="text-heading-4 font-semibold text-text-primary">
            Aziende Selezionate ({companies.length})
          </h3>
          
          <div className="max-h-32 overflow-y-auto border border-border rounded-md p-3 bg-background-subtle">
            <div className="flex flex-wrap gap-2">
              {companies.map((company) => (
                <Badge key={company.id} variant="secondary" className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {company.name}
                  {company.source && (
                    <span className="text-xs opacity-60">({company.source})</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        </div>

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
                    placeholder="Descrivi l'attività da svolgere per tutte le aziende selezionate..."
                    className="min-h-[100px]"
                  />
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

        {/* Opzione salva in rubrica - solo per record import */}
        {showSaveToRubrica && (
          <div className="space-y-4">
            <h3 className="text-heading-4 font-semibold text-text-primary">
              Opzioni Aggiuntive
            </h3>
            
            <FormField
              control={form.control}
              name="salva_in_rubrica"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Salva anche in Rubrica Clienti
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Trasferisci automaticamente tutte le aziende selezionate nella rubrica clienti
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
            {isSubmitting ? 'Creazione in corso...' : `Crea ${companies.length} Attività`}
          </Button>
        </div>
      </form>
    </Form>
  );
}