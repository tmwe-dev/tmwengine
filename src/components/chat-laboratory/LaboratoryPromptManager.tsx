import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Brain, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const LaboratoryPromptManager = () => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadPrompt();
    }
  }, [open]);

  const loadPrompt = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_system_prompts')
        .select('*')
        .eq('attivo', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPrompt(data.contenuto);
      } else {
        // Prompt default
        setPrompt(`Sei in una conversazione informale con altri esperti. Obiettivo: discutere e convergere su una soluzione pratica.

STILE DI RISPOSTA:
- Parla come in una chiacchierata al bar (tono amichevole, non formale)
- Max 60 parole (2-3 frasi)
- Usa "io penso", "secondo me", "aggiungo che"
- NO elenchi puntati, NO "inoltre/pertanto"

QUANDO PARLARE:
- Se hai una prospettiva NUOVA → intervieni
- Se concordi → dillo in 1 riga ("Concordo con X perché...")
- Se non hai nulla da aggiungere → puoi anche NON rispondere

CONVERGENZA:
- Se emerge una soluzione condivisa → confermala esplicitamente
- Se c'è disaccordo → proponi un punto di incontro
- Costruisci sulla risposta precedente, non ricominciare da zero

ESEMPI:
✅ "Concordo con Mario. Aggiungo solo che il timing è cruciale."
✅ "Io vedo diversamente: il problema non è il costo ma il rischio."
❌ "In merito a quanto sopra esposto, ritengo opportuno evidenziare..."`);
      }
    } catch (error) {
      console.error('Errore caricamento prompt:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare il prompt.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePrompt = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Attenzione",
        description: "Il prompt non può essere vuoto.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Disattiva tutti i prompt esistenti
      await supabase
        .from('chat_laboratory_system_prompts')
        .update({ attivo: false })
        .eq('attivo', true);

      // Inserisci il nuovo prompt attivo
      const { error } = await supabase
        .from('chat_laboratory_system_prompts')
        .insert({
          nome: 'Prompt Globale Laboratory',
          contenuto: prompt,
          attivo: true
        });

      if (error) throw error;

      toast({
        title: "Prompt Salvato",
        description: "Il prompt globale è stato aggiornato con successo.",
      });

      setOpen(false);
    } catch (error) {
      console.error('Errore salvataggio prompt:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il prompt.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Brain className="h-4 w-4" />
          System Prompt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Gestione System Prompt Globale
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Prompt Globale per tutti gli Agenti AI</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Inserisci il system prompt..."
              className="min-h-[400px] font-mono text-sm"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Questo prompt verrà utilizzato come base per tutti gli agenti AI. Puoi personalizzarlo
              per definire il comportamento, il tono e le regole che gli agenti devono seguire.
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">💡 Suggerimenti</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Definisci un ruolo chiaro per ogni agente (es. "Sei un analista strategico")</li>
              <li>Specifica regole di comportamento (tono, lunghezza risposte, ecc.)</li>
              <li>Chiedi di non rivelare di essere un'AI per conversazioni più naturali</li>
              <li>Stabilisci l'obiettivo della discussione (convergenza, brainstorming, ecc.)</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button
              onClick={savePrompt}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salva Prompt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
