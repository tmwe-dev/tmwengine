import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Image as ImageIcon, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageGeneratorProps {
  onImageGenerated: (imageUrl: string) => void;
  configId?: string;
}

export const ImageGenerator = ({ onImageGenerated, configId }: ImageGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Inserisci una descrizione per generare l\'immagine');
      return;
    }

    if (!configId) {
      toast.error('Seleziona un provider AI prima di generare l\'immagine');
      return;
    }

    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { 
          prompt: prompt.trim(),
          configId 
        }
      });

      if (error) throw error;

      if (!data?.success || !data?.imageUrl) {
        throw new Error(data?.error || 'Nessuna immagine generata');
      }

      onImageGenerated(data.imageUrl);
      setOpen(false);
      setPrompt('');
      toast.success(`Immagine generata con ${data.provider}!`);
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante la generazione dell\'immagine');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" title="Genera Immagine">
          <ImageIcon className="h-5 w-5" strokeWidth={1.5} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Genera Immagine con AI</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Descrivi l'immagine che vuoi generare..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
          />
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Genera Immagine
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};