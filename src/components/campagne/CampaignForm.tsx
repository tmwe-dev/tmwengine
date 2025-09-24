import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const campaignSchema = z.object({
  nome: z.string()
    .trim()
    .nonempty({ message: "Il nome della campagna è obbligatorio" })
    .max(255, { message: "Il nome deve essere inferiore a 255 caratteri" }),
  obiettivo: z.string()
    .trim()
    .max(1000, { message: "L'obiettivo deve essere inferiore a 1000 caratteri" })
    .optional(),
  inizio: z.string().optional(),
  fine: z.string().optional(),
  budget: z.number()
    .min(0, { message: "Il budget deve essere maggiore di 0" })
    .optional()
    .transform(val => val || undefined),
  stato: z.enum(['attiva', 'pausa', 'completata']).default('attiva'),
  max_email_giorno: z.number()
    .min(1, { message: "Il limite deve essere almeno 1" })
    .max(10000, { message: "Il limite non può superare 10.000" })
    .default(100)
}).refine((data) => {
  if (data.inizio && data.fine) {
    return new Date(data.inizio) <= new Date(data.fine);
  }
  return true;
}, {
  message: "La data di fine deve essere successiva alla data di inizio",
  path: ["fine"]
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface Campaign {
  id: string;
  nome: string;
  obiettivo?: string;
  inizio?: string;
  fine?: string;
  budget?: number;
  stato: 'attiva' | 'pausa' | 'completata';
  max_email_giorno: number;
  created_at: string;
}

interface CampaignFormProps {
  campaign?: Campaign | null;
  onSubmit: (data: CampaignFormData) => void;
  onCancel: () => void;
}

export function CampaignForm({ campaign, onSubmit, onCancel }: CampaignFormProps) {
  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      nome: campaign?.nome || '',
      obiettivo: campaign?.obiettivo || '',
      inizio: campaign?.inizio ? new Date(campaign.inizio).toISOString().slice(0, 10) : '',
      fine: campaign?.fine ? new Date(campaign.fine).toISOString().slice(0, 10) : '',
      budget: campaign?.budget || undefined,
      stato: campaign?.stato || 'attiva',
      max_email_giorno: campaign?.max_email_giorno || 100
    }
  });

  const handleSubmit = (data: CampaignFormData) => {
    const submitData = {
      ...data,
      inizio: data.inizio ? new Date(data.inizio).toISOString() : undefined,
      fine: data.fine ? new Date(data.fine).toISOString() : undefined
    };
    onSubmit(submitData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Informazioni di base */}
        <div className="space-y-4">
          <h3 className="text-heading-4 font-semibold text-text-primary">
            Informazioni Generali
          </h3>
          
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Campagna *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nome della campagna marketing" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="obiettivo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Obiettivo</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Descrivi l'obiettivo della campagna..."
                    className="min-h-[100px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Date e budget */}
        <div className="space-y-4">
          <h3 className="text-heading-4 font-semibold text-text-primary">
            Pianificazione e Budget
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="inizio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Inizio</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      placeholder="Seleziona data inizio"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fine"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Fine</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      placeholder="Seleziona data fine"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget (€)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Configurazioni */}
        <div className="space-y-4">
          <h3 className="text-heading-4 font-semibold text-text-primary">
            Configurazioni
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="max_email_giorno"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite Email al Giorno</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="1"
                      max="10000"
                      placeholder="100"
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 100)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {campaign && (
              <FormField
                control={form.control}
                name="stato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato Campagna</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona stato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="attiva">Attiva</SelectItem>
                          <SelectItem value="pausa">In Pausa</SelectItem>
                          <SelectItem value="completata">Completata</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button type="submit" className="shadow-soft">
            {campaign ? 'Salva Modifiche' : 'Crea Campagna'}
          </Button>
        </div>
      </form>
    </Form>
  );
}