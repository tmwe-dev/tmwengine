import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Plus, Zap, Archive, Trash2, FolderInput, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AIPromptDialog } from './AIPromptDialog';
import { supabase } from '@/integrations/supabase/client';
import { EmailSenderAIPrompt } from '@/types/email-automation';
import { toast } from 'sonner';

interface AIActionsSidebarProps {
  selectedSender: string | null;
  onActionSelect: (action: 'archive' | 'delete' | 'move' | 'ai-prompt', promptId?: string) => void;
}

export const AIActionsSidebar = ({ selectedSender, onActionSelect }: AIActionsSidebarProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<EmailSenderAIPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSavedPrompts();
  }, []);

  const loadSavedPrompts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_sender_ai_prompts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSavedPrompts(data as EmailSenderAIPrompt[] || []);
    } catch (error) {
      console.error('Error loading AI prompts:', error);
      toast.error('Errore nel caricamento dei prompt AI');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptCreated = () => {
    loadSavedPrompts();
    toast.success('✅ Prompt AI salvato con successo!');
  };

  return (
    <div className="w-64 space-y-4 p-4 border-r bg-background/50 backdrop-blur-sm">
      {/* Azioni Standard */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Azioni Rapide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 hover:bg-blue-50 dark:hover:bg-blue-950"
            onClick={() => onActionSelect('archive')}
            disabled={!selectedSender}
          >
            <Archive className="h-4 w-4" />
            Archivia
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={() => onActionSelect('delete')}
            disabled={!selectedSender}
          >
            <Trash2 className="h-4 w-4" />
            Elimina
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 hover:bg-purple-50 dark:hover:bg-purple-950"
            onClick={() => onActionSelect('move')}
            disabled={!selectedSender}
          >
            <FolderInput className="h-4 w-4" />
            Sposta in...
          </Button>
        </CardContent>
      </Card>

      {/* Azioni AI */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            Automazione AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 border-primary/30 hover:bg-primary/10"
            onClick={() => setDialogOpen(true)}
            disabled={!selectedSender}
          >
            <Plus className="h-4 w-4" />
            Crea Prompt AI
          </Button>

          {/* Lista prompt AI salvati */}
          <div className="space-y-1 mt-3">
            <p className="text-xs text-muted-foreground mb-2">Prompt Salvati:</p>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : savedPrompts.length > 0 ? (
              savedPrompts.map((prompt) => (
                <Button
                  key={prompt.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-auto py-2 px-2"
                  onClick={() => onActionSelect('ai-prompt', prompt.id)}
                  disabled={!selectedSender}
                >
                  <Bot className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{prompt.prompt_name || 'Prompt senza nome'}</span>
                </Button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                Nessun prompt salvato
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <AIPromptDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        senderEmail={selectedSender}
        onPromptCreated={handlePromptCreated}
      />
    </div>
  );
};
