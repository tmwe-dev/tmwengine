import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SystemPrompt {
  id: string;
  nome: string;
  contenuto: string;
  attivo: boolean;
}

interface SystemPromptSelectorProps {
  conversationId: string | null;
  selectedPromptId: string | null;
  onPromptChange: (promptId: string | null) => void;
}

export const SystemPromptSelector = ({
  conversationId,
  selectedPromptId,
  onPromptChange
}: SystemPromptSelectorProps) => {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_system_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  };

  const handlePromptChange = async (promptId: string) => {
    if (!conversationId) return;

    const actualPromptId = promptId === "none" ? null : promptId;

    try {
      const { error } = await supabase
        .from('chat_laboratory_conversations')
        .update({ system_prompt_id: actualPromptId })
        .eq('id', conversationId);

      if (error) throw error;

      onPromptChange(actualPromptId);

      toast({
        title: "Prompt aggiornato",
        description: actualPromptId 
          ? "Il prompt di sistema è stato modificato" 
          : "Utilizzato prompt globale predefinito"
      });
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il prompt",
        variant: "destructive"
      });
    }
  };

  const handleCreatePrompt = async () => {
    if (!newPromptName.trim() || !newPromptContent.trim()) {
      toast({
        title: "Errore",
        description: "Nome e contenuto sono obbligatori",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_system_prompts')
        .insert({
          nome: newPromptName.trim(),
          contenuto: newPromptContent.trim(),
          attivo: false
        })
        .select()
        .single();

      if (error) throw error;

      setPrompts([data, ...prompts]);
      setNewPromptName("");
      setNewPromptContent("");
      setIsDialogOpen(false);

      toast({
        title: "Prompt creato",
        description: "Il nuovo prompt è stato salvato con successo"
      });
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare il prompt",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 flex-1">
        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <Select
          value={selectedPromptId || "none"}
          onValueChange={handlePromptChange}
          disabled={!conversationId}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleziona prompt di sistema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              Prompt globale predefinito
            </SelectItem>
            {prompts.map((prompt) => (
              <SelectItem key={prompt.id} value={prompt.id}>
                {prompt.nome}
                {prompt.attivo && <span className="ml-2 text-xs text-primary">(Globale)</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button size="icon" variant="outline">
            <Plus className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crea Nuovo Prompt di Sistema</DialogTitle>
            <DialogDescription>
              Definisci un prompt personalizzato per questa conversazione multi-agente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt-name">Nome Prompt</Label>
              <Input
                id="prompt-name"
                value={newPromptName}
                onChange={(e) => setNewPromptName(e.target.value)}
                placeholder="es. Discussione Tecnica, Brainstorming Creativo..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt-content">Contenuto Prompt</Label>
              <Textarea
                id="prompt-content"
                value={newPromptContent}
                onChange={(e) => setNewPromptContent(e.target.value)}
                placeholder="Definisci come gli AI devono comportarsi, il loro tono, obiettivi della discussione..."
                rows={10}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Annulla
              </Button>
              <Button
                onClick={handleCreatePrompt}
                disabled={isCreating}
              >
                {isCreating ? "Creazione..." : "Crea Prompt"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};