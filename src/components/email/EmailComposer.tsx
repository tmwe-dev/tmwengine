import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Send, Paperclip, X, Users, Calendar, Brain } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const emailSchema = z.object({
  to: z.string().email("Inserisci un indirizzo email valido"),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(1, "L'oggetto è obbligatorio"),
  body: z.string().min(1, "Il corpo dell'email è obbligatorio"),
  priority: z.enum(['low', 'medium', 'high']),
  category: z.string().min(1, "Seleziona una categoria"),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface EmailComposerProps {
  onClose: () => void;
  replyTo?: string;
  replySubject?: string;
  replyBody?: string;
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  onClose,
  replyTo = '',
  replySubject = '',
  replyBody = ''
}) => {
  const { toast } = useToast();
  const [isAIAssisted, setIsAIAssisted] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [contacts, setContacts] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      to: replyTo,
      subject: replySubject ? `Re: ${replySubject}` : '',
      body: replyBody ? `\n\n--- Messaggio originale ---\n${replyBody}` : '',
      priority: 'medium',
      category: ''
    }
  });

  const watchedBody = watch('body');
  const watchedSubject = watch('subject');

  const handleAIAssist = async () => {
    try {
      setIsAIAssisted(true);
      
      // Simulazione suggerimenti AI basati sul contenuto
      const suggestions = [
        "Considera di aggiungere un chiamata all'azione chiara",
        "Il tono potrebbe essere più professionale",
        "Aggiungi informazioni di contatto nel footer",
        "Considera di personalizzare il saluto",
        "Il messaggio potrebbe essere più conciso"
      ];
      
      setAiSuggestions(suggestions);
      
      toast({
        title: "Assistenza AI attivata",
        description: "Suggerimenti generati automaticamente",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile generare suggerimenti AI",
        variant: "destructive",
      });
    }
  };

  const handleContactSearch = (term: string) => {
    // Simulazione ricerca contatti
    const mockContacts = [
      'cliente1@esempio.com',
      'partner@azienda.com',
      'fornitore@servizi.com',
      'team@interno.com'
    ];
    
    setContacts(mockContacts.filter(contact => 
      contact.toLowerCase().includes(term.toLowerCase())
    ));
  };

  const onSubmit = async (data: EmailFormData) => {
    try {
      console.log('Invio email tramite TMWE...', {
        to: data.to,
        subject: data.subject,
        body_text: data.body
      });

      const { data: result, error } = await supabase.functions.invoke('tmwe-email-send', {
        body: {
          to: data.to,
          subject: data.subject,
          body: data.body
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email inviata",
        description: "L'email è stata inviata correttamente tramite TMWE",
      });
      
      onClose();
    } catch (error) {
      console.error('Errore invio email:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare l'email tramite TMWE",
        variant: "destructive",
      });
    }
  };

  const emailCategories = [
    { value: 'vendite', label: 'Vendite' },
    { value: 'supporto', label: 'Supporto' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'amministrativo', label: 'Amministrativo' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'interno', label: 'Comunicazione Interna' }
  ];

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Recipients */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="to">A *</Label>
            <div className="relative">
              <Input
                id="to"
                {...register('to')}
                placeholder="destinatario@esempio.com"
                onChange={(e) => {
                  register('to').onChange(e);
                  if (e.target.value.length > 2) {
                    handleContactSearch(e.target.value);
                  }
                }}
              />
              {contacts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
                  {contacts.map((contact, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 cursor-pointer hover:bg-muted"
                      onClick={() => {
                        setValue('to', contact);
                        setContacts([]);
                      }}
                    >
                      {contact}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.to && (
              <p className="text-sm text-destructive mt-1">{errors.to.message}</p>
            )}
          </div>

          <div className="flex space-x-2">
            {!showCc && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCc(true)}
              >
                Cc
              </Button>
            )}
            {!showBcc && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBcc(true)}
              >
                Ccn
              </Button>
            )}
          </div>

          {showCc && (
            <div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="cc" className="w-8">Cc</Label>
                <Input
                  id="cc"
                  {...register('cc')}
                  placeholder="copia@esempio.com"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCc(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {showBcc && (
            <div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="bcc" className="w-8">Ccn</Label>
                <Input
                  id="bcc"
                  {...register('bcc')}
                  placeholder="copia.nascosta@esempio.com"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBcc(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Subject and Priority */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="subject">Oggetto *</Label>
            <Input
              id="subject"
              {...register('subject')}
              placeholder="Oggetto dell'email"
            />
            {errors.subject && (
              <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="priority">Priorità</Label>
            <Select onValueChange={(value) => setValue('priority', value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona priorità" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Bassa</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Category */}
        <div>
          <Label htmlFor="category">Categoria *</Label>
          <Select onValueChange={(value) => setValue('category', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona categoria" />
            </SelectTrigger>
            <SelectContent>
              {emailCategories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-destructive mt-1">{errors.category.message}</p>
          )}
        </div>

        {/* Body */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="body">Messaggio *</Label>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAIAssist}
                disabled={!watchedBody || isAIAssisted}
              >
                <Brain className="mr-1 h-4 w-4" />
                Assistenza AI
              </Button>
              <Button type="button" variant="outline" size="sm">
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Textarea
            id="body"
            {...register('body')}
            placeholder="Scrivi il tuo messaggio qui..."
            className="min-h-48"
          />
          
          {errors.body && (
            <p className="text-sm text-destructive mt-1">{errors.body.message}</p>
          )}
          
          <div className="text-xs text-muted-foreground mt-1">
            Caratteri: {watchedBody?.length || 0}
          </div>
        </div>

        {/* AI Suggestions */}
        {isAIAssisted && aiSuggestions.length > 0 && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2 flex items-center">
              <Brain className="mr-2 h-4 w-4" />
              Suggerimenti AI
            </h4>
            <ul className="space-y-1 text-sm">
              {aiSuggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-muted-foreground mr-2">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Button type="button" variant="outline">
              <Calendar className="mr-1 h-4 w-4" />
              Programma
            </Button>
            <Button type="button" variant="outline">
              Salva Bozza
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Send className="mr-1 h-4 w-4" />
              {isSubmitting ? 'Invio...' : 'Invia'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};