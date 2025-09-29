import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const contactSchema = z.object({
  responsabile: z.string()
    .trim()
    .min(1, { message: "Il nome del responsabile è obbligatorio" })
    .max(255, { message: "Il nome deve essere inferiore a 255 caratteri" }),
  azienda: z.string()
    .trim()
    .max(255, { message: "Il nome dell'azienda deve essere inferiore a 255 caratteri" })
    .optional(),
  email: z.string()
    .trim()
    .email({ message: "Inserisci un indirizzo email valido" })
    .max(255, { message: "L'email deve essere inferiore a 255 caratteri" })
    .optional()
    .or(z.literal("")),
  telefono: z.string()
    .trim()
    .max(50, { message: "Il telefono deve essere inferiore a 50 caratteri" })
    .optional(),
  indirizzo: z.string()
    .trim()
    .max(500, { message: "L'indirizzo deve essere inferiore a 500 caratteri" })
    .optional(),
  cap: z.string()
    .trim()
    .max(10, { message: "Il CAP deve essere inferiore a 10 caratteri" })
    .optional(),
  citta: z.string()
    .trim()
    .max(100, { message: "La città deve essere inferiore a 100 caratteri" })
    .optional(),
  provincia_stato: z.string()
    .trim()
    .max(100, { message: "La provincia/stato deve essere inferiore a 100 caratteri" })
    .optional(),
  nazione: z.string()
    .trim()
    .max(100, { message: "La nazione deve essere inferiore a 100 caratteri" })
    .optional(),
  note: z.string()
    .trim()
    .max(1000, { message: "Le note devono essere inferiori a 1000 caratteri" })
    .optional(),
  tag: z.array(z.string()).optional()
});

type ContactFormData = z.infer<typeof contactSchema>;

interface Contact {
  id: string;
  responsabile: string;
  azienda?: string;
  email?: string;
  telefono?: string;
  indirizzo?: string;
  cap?: string;
  citta?: string;
  provincia_stato?: string;
  nazione?: string;
  note?: string;
  tag?: string[];
  data_creazione: string;
}

interface ContactFormProps {
  contact?: Contact | null;
  onSubmit: (data: ContactFormData) => void;
  onCancel: () => void;
}

export function ContactForm({ contact, onSubmit, onCancel }: ContactFormProps) {
  const [newTag, setNewTag] = React.useState('');

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      responsabile: contact?.responsabile || '',
      azienda: contact?.azienda || '',
      email: contact?.email || '',
      telefono: contact?.telefono || '',
      indirizzo: contact?.indirizzo || '',
      cap: contact?.cap || '',
      citta: contact?.citta || '',
      provincia_stato: contact?.provincia_stato || '',
      nazione: contact?.nazione || '',
      note: contact?.note || '',
      tag: contact?.tag || []
    }
  });

  const watchedTags = form.watch('tag') || [];

  const addTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !watchedTags.includes(trimmedTag)) {
      form.setValue('tag', [...watchedTags, trimmedTag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    form.setValue('tag', watchedTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Informazioni di base */}
        <div className="space-y-4">
          <h3 className="text-heading-4 font-semibold text-text-primary">
            Informazioni di Base
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="responsabile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Responsabile *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Mario Rossi" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="azienda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Azienda</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Acme Corp" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="mario.rossi@esempio.it" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+39 123 456 7890" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Indirizzo */}
        <div className="space-y-4">
          <h3 className="text-heading-4 font-semibold text-text-primary">
            Indirizzo
          </h3>
          
          <FormField
            control={form.control}
            name="indirizzo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Indirizzo</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Via Roma, 123" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="cap"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CAP</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="00100" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="citta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Città</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Roma" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provincia_stato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provincia/Stato</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="RM" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nazione"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazione</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Italia" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Tag */}
        <div className="space-y-4">
          <h3 className="text-heading-4 font-semibold text-text-primary">
            Tag
          </h3>
          
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Aggiungi tag..."
              className="flex-1"
            />
            <Button type="button" onClick={addTag} variant="outline">
              Aggiungi
            </Button>
          </div>

          {watchedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {watchedTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:bg-red-100 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Note */}
        <div className="space-y-4">
          <h3 className="text-heading-4 font-semibold text-text-primary">
            Note
          </h3>
          
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note aggiuntive</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Note, commenti o informazioni aggiuntive..."
                    className="min-h-[100px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button type="submit" className="shadow-soft">
            {contact ? 'Salva Modifiche' : 'Aggiungi Contatto'}
          </Button>
        </div>
      </form>
    </Form>
  );
}