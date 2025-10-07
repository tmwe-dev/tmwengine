import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

export const AdminGlobalPrompt = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadGlobalPrompt();
  }, []);

  const loadGlobalPrompt = async () => {
    try {
      const { data, error } = await supabase
        .from('intranet_global_ai_prompt')
        .select('prompt_contenuto')
        .eq('attivo', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPrompt(data.prompt_contenuto);
      }
    } catch (error) {
      console.error('Error loading global prompt:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare il prompt globale',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveGlobalPrompt = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Errore',
        description: 'Il prompt non può essere vuoto',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      // Disattiva tutti i prompt esistenti
      await supabase
        .from('intranet_global_ai_prompt')
        .update({ attivo: false })
        .eq('attivo', true);

      // Inserisci il nuovo prompt
      const { error } = await supabase
        .from('intranet_global_ai_prompt')
        .insert({
          prompt_contenuto: prompt.trim(),
          attivo: true
        });

      if (error) throw error;

      toast({
        title: 'Salvato',
        description: 'Il prompt globale è stato aggiornato con successo'
      });
    } catch (error) {
      console.error('Error saving global prompt:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile salvare il prompt globale',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="global-prompt">Prompt AI Globale</Label>
        <Textarea
          id="global-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Inserisci il prompt AI che verrà utilizzato in tutte le stanze con impostazioni standard..."
          className="min-h-[400px] font-mono text-sm"
        />
        <p className="text-sm text-muted-foreground">
          Questo prompt sarà utilizzato come sistema di istruzioni per l'AI in tutte le stanze che
          utilizzano le impostazioni standard. Le stanze con prompt personalizzati non saranno influenzate.
        </p>
      </div>

      <Button
        onClick={saveGlobalPrompt}
        disabled={isSaving}
        className="gap-2"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvataggio...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Salva Prompt
          </>
        )}
      </Button>
    </div>
  );
};
