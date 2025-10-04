import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PagePromptManagerProps {
  pageRoute: string;
}

export function PagePromptManager({ pageRoute }: PagePromptManagerProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [pageName, setPageName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadPrompt();
    }
  }, [open, pageRoute]);

  const loadPrompt = async () => {
    try {
      const { data, error } = await supabase
        .from('page_system_prompts')
        .select('*')
        .eq('page_route', pageRoute)
        .eq('attivo', true)
        .single();

      if (error) throw error;

      if (data) {
        setPrompt(data.system_prompt);
        setPageName(data.page_name);
      }
    } catch (error) {
      console.error('Errore caricamento prompt:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare il prompt della pagina.",
        variant: "destructive",
      });
    }
  };

  const savePrompt = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('page_system_prompts')
        .update({ 
          system_prompt: prompt,
          updated_at: new Date().toISOString()
        })
        .eq('page_route', pageRoute);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Prompt della pagina aggiornato con successo.",
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
    <>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 hover:bg-primary/10"
        onClick={() => setOpen(true)}
        title="Gestisci Prompt AI"
      >
        <Settings className="h-4 w-4 text-primary" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[728px] backdrop-blur-md bg-background/95 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Gestione Prompt AI - {pageName}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 pr-4">
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Modifica il prompt di sistema che l'AI utilizzerà per questa pagina. 
                  Questo prompt guida il comportamento e le risposte dell'assistente AI.
                </p>
                
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Inserisci il prompt di sistema..."
                  className="min-h-[250px] max-w-[650px] backdrop-blur-md bg-background/50 border-white/10"
                  disabled={isLoading}
                />
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
                  disabled={isLoading || !prompt.trim()}
                >
                  {isLoading ? 'Salvataggio...' : 'Salva Prompt'}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
