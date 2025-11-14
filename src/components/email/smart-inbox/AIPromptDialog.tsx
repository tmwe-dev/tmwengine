import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GlobalAIAgentSelector } from '@/components/ai/GlobalAIAgentSelector';
import { Loader2 } from 'lucide-react';

interface AIPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senderEmail: string | null;
  onPromptCreated?: () => void;
}

export const AIPromptDialog = ({ open, onOpenChange, senderEmail, onPromptCreated }: AIPromptDialogProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    prompt_name: '',
    prompt_description: '',
    ai_prompt: '',
    base_action: 'none' as 'archive' | 'move_to_folder' | 'delete' | 'none',
    base_action_params: {} as Record<string, any>,
    requires_confirmation: true,
    use_email_templates: true,
    use_contact_aliases: true,
    use_company_data: true,
  });

  // Reset form quando il dialog si apre
  useEffect(() => {
    if (open) {
      setFormData({
        prompt_name: '',
        prompt_description: '',
        ai_prompt: '',
        base_action: 'none',
        base_action_params: {},
        requires_confirmation: true,
        use_email_templates: true,
        use_contact_aliases: true,
        use_company_data: true,
      });
    }
  }, [open]);

  const handleSave = async () => {
    if (!senderEmail) {
      toast.error('Nessun mittente selezionato');
      return;
    }

    if (!formData.ai_prompt.trim()) {
      toast.error('Il campo Prompt AI è obbligatorio');
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Devi essere autenticato');
        return;
      }

      const { error } = await supabase
        .from('email_sender_ai_prompts')
        .insert({
          sender_email: senderEmail,
          user_id: user.id,
          ...formData,
        });

      if (error) {
        console.error('Supabase error:', error);
        toast.error('Errore salvataggio: ' + error.message);
        return;
      }

      toast.success('✅ Prompt AI salvato con successo!');
      onPromptCreated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Errore imprevisto durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crea Automazione AI per: {senderEmail}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selezione AI Agent Globale */}
          <div className="space-y-2">
            <Label>AI Agent da utilizzare *</Label>
            <GlobalAIAgentSelector />
            <p className="text-xs text-muted-foreground">
              L'AI agent selezionato verrà utilizzato per processare le email da questo mittente
            </p>
          </div>

          <div>
            <Label>Nome Prompt (opzionale)</Label>
            <Input
              placeholder="es. LinkedIn - Offerte Lavoro"
              value={formData.prompt_name}
              onChange={(e) => setFormData({ ...formData, prompt_name: e.target.value })}
            />
          </div>

          <div>
            <Label>Descrizione</Label>
            <Input
              placeholder="Breve descrizione del comportamento..."
              value={formData.prompt_description}
              onChange={(e) => setFormData({ ...formData, prompt_description: e.target.value })}
            />
          </div>

          <div>
            <Label>Azione Base (opzionale)</Label>
            <Select
              value={formData.base_action}
              onValueChange={(value: any) => setFormData({ ...formData, base_action: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessuna azione automatica</SelectItem>
                <SelectItem value="archive">Archivia sempre</SelectItem>
                <SelectItem value="move_to_folder">Sposta in cartella</SelectItem>
                <SelectItem value="delete">Elimina</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Azione eseguita PRIMA dell'analisi AI (se necessario)
            </p>
          </div>

          {formData.base_action === 'move_to_folder' && (
            <div>
              <Label>Nome Cartella</Label>
              <Input
                placeholder="es. LinkedIn"
                value={formData.base_action_params.folder_name || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  base_action_params: { folder_name: e.target.value }
                })}
              />
            </div>
          )}

          <div>
            <Label>Prompt AI * 🤖</Label>
            <Textarea
              placeholder={`Quando ricevi email da questo indirizzo:\n\n1. Analizza il contenuto\n2. Se contiene "job offer" o "posizione":\n   - Inoltra a carlo.rossi@gmail.com\n   - Marca come urgente\n3. Se contiene "preventivo":\n   - Inoltra al team sales\n   - Crea reminder per follow-up\n4. Altrimenti:\n   - Archivia normalmente\n\nDevi SEMPRE spiegare il tuo ragionamento e chiedere conferma prima di agire.`}
              className="min-h-[250px] font-mono text-sm"
              value={formData.ai_prompt}
              onChange={(e) => setFormData({ ...formData, ai_prompt: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Scrivi le istruzioni specifiche per AI su come gestire le email da questo mittente
            </p>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Usa template email aziendali</Label>
                <p className="text-xs text-muted-foreground">
                  Inietta template dal database per risposte
                </p>
              </div>
              <Switch
                checked={formData.use_email_templates}
                onCheckedChange={(checked) => setFormData({ ...formData, use_email_templates: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Usa alias clienti dalla rubrica</Label>
                <p className="text-xs text-muted-foreground">
                  Personalizza risposte con nomi/alias salvati
                </p>
              </div>
              <Switch
                checked={formData.use_contact_aliases}
                onCheckedChange={(checked) => setFormData({ ...formData, use_contact_aliases: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Usa dati aziendali contatto</Label>
                <p className="text-xs text-muted-foreground">
                  Include info azienda dalla rubrica
                </p>
              </div>
              <Switch
                checked={formData.use_company_data}
                onCheckedChange={(checked) => setFormData({ ...formData, use_company_data: checked })}
              />
            </div>

            <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-md">
              <div className="space-y-0.5">
                <Label>⚠️ Richiedi SEMPRE conferma</Label>
                <p className="text-xs text-muted-foreground">
                  AI deve chiedere approvazione prima di eseguire azioni
                </p>
              </div>
              <Switch
                checked={formData.requires_confirmation}
                onCheckedChange={(checked) => setFormData({ ...formData, requires_confirmation: checked })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salva Prompt AI
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
