import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, Edit2, Copy, Trash2, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ComposedPrompt {
  id: string;
  name: string;
  content: string;
  target_agent: string;
  created_at: string;
  section_ids: string[];
}

interface ReadyPromptsListProps {
  onLoadInCanvas?: (prompt: ComposedPrompt) => void;
}

export const ReadyPromptsList = ({ onLoadInCanvas }: ReadyPromptsListProps) => {
  const [prompts, setPrompts] = useState<ComposedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<ComposedPrompt | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chat_laboratory_composed_prompts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i prompt pronti',
        variant: 'destructive'
      });
    } else {
      setPrompts(data || []);
    }
    setLoading(false);
  };

  const handlePreview = (prompt: ComposedPrompt) => {
    setSelectedPrompt(prompt);
    setShowPreview(true);
  };

  const handleRename = (prompt: ComposedPrompt) => {
    setSelectedPrompt(prompt);
    setNewName(prompt.name);
    setShowRename(true);
  };

  const saveRename = async () => {
    if (!selectedPrompt || !newName.trim()) return;

    const { error } = await supabase
      .from('chat_laboratory_composed_prompts')
      .update({ name: newName.trim() })
      .eq('id', selectedPrompt.id);

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile rinominare il prompt',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Rinominato',
        description: 'Nome aggiornato con successo'
      });
      loadPrompts();
      setShowRename(false);
    }
  };

  const handleDuplicate = async (prompt: ComposedPrompt) => {
    const { error } = await supabase
      .from('chat_laboratory_composed_prompts')
      .insert({
        name: `${prompt.name} (Copia)`,
        content: prompt.content,
        target_agent: prompt.target_agent,
        section_ids: prompt.section_ids
      });

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile duplicare il prompt',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Duplicato',
        description: 'Prompt copiato con successo'
      });
      loadPrompts();
    }
  };

  const handleDelete = async (prompt: ComposedPrompt) => {
    if (!confirm(`Eliminare il prompt "${prompt.name}"?`)) return;

    const { error } = await supabase
      .from('chat_laboratory_composed_prompts')
      .delete()
      .eq('id', prompt.id);

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare il prompt',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Eliminato',
        description: 'Prompt rimosso con successo'
      });
      loadPrompts();
    }
  };

  const handleExport = (prompt: ComposedPrompt) => {
    const content = `═══════════════════════════════════════════════════════════
PROMPT PRONTO: ${prompt.name}
═══════════════════════════════════════════════════════════
Target Agent: ${prompt.target_agent}
Creato: ${new Date(prompt.created_at).toLocaleString('it-IT')}

--- CONTENUTO ---
${prompt.content}

═══════════════════════════════════════════════════════════
                    FINE PROMPT
═══════════════════════════════════════════════════════════`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prompt-${prompt.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Esportato',
      description: 'Prompt scaricato con successo'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p>Nessun prompt pronto salvato.</p>
        <p className="text-sm mt-2">Crea prompt dal Compositore per vederli qui.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            📦 Prompt Pronti ({prompts.length})
          </h3>
        </div>

        <div className="grid gap-4">
          {prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{prompt.name}</CardTitle>
                    <CardDescription>
                      Target: {prompt.target_agent} • {new Date(prompt.created_at).toLocaleDateString('it-IT')}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {Math.ceil(prompt.content.length / 4)} tokens
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreview(prompt)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Anteprima
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRename(prompt)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Rinomina
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicate(prompt)}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Duplica
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport(prompt)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Esporta
                  </Button>
                  {onLoadInCanvas && (
                    <Button
                      size="sm"
                      onClick={() => onLoadInCanvas(prompt)}
                    >
                      Carica in Canvas
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(prompt)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Elimina
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedPrompt?.name}</DialogTitle>
            <DialogDescription>
              Target: {selectedPrompt?.target_agent}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full">
            <pre className="text-xs whitespace-pre-wrap font-mono p-4 bg-muted rounded">
              {selectedPrompt?.content}
            </pre>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setShowPreview(false)}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rinomina Prompt</DialogTitle>
            <DialogDescription>
              Modifica il nome del prompt pronto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nuovo Nome</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome del prompt..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRename(false)}>
              Annulla
            </Button>
            <Button onClick={saveRename} disabled={!newName.trim()}>
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
