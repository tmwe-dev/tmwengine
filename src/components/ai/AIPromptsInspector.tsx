import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Settings, ArrowRight, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { usePageAIPrompts, type PageAIPrompt } from '@/hooks/usePageAIPrompts';

export function AIPromptsInspector() {
  const navigate = useNavigate();
  const { prompts, is_loading, savePrompt } = usePageAIPrompts();
  const [dialog_open, setDialogOpen] = useState(false);
  const [selected_prompt, setSelectedPrompt] = useState<PageAIPrompt | null>(null);
  const [edit_mode, setEditMode] = useState(false);
  const [view_mode, setViewMode] = useState(false);
  const [edit_content, setEditContent] = useState('');

  const handlePromptClick = (prompt: PageAIPrompt, is_edit: boolean = false) => {
    if (!prompt.editable) {
      // Se ha link_to, naviga
      if (prompt.metadata.link_to) {
        navigate(prompt.metadata.link_to);
        setDialogOpen(false);
      }
      return;
    }

    setSelectedPrompt(prompt);
    setEditContent(prompt.content);
    
    if (is_edit) {
      setEditMode(true);
    } else {
      setViewMode(true);
    }
  };

  const handleSavePrompt = async () => {
    if (!selected_prompt) return;

    await savePrompt(selected_prompt, edit_content);
    setEditMode(false);
    setSelectedPrompt(null);
  };

  const handleCloseEditDialog = () => {
    setEditMode(false);
    setSelectedPrompt(null);
    setEditContent('');
  };

  const handleCloseViewDialog = () => {
    setViewMode(false);
    setSelectedPrompt(null);
  };

  return (
    <>
      {/* Icona Brain con Badge */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 relative"
        onClick={() => setDialogOpen(true)}
        title="Visualizza e modifica prompt AI di questa pagina"
      >
        <Brain className="h-4 w-4 text-primary" />
        
        {/* Badge Azzurro senza bordi */}
        {prompts.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 text-blue-400 text-[10px] font-bold flex items-center justify-center">
            {prompts.length}
          </span>
        )}
      </Button>

      {/* Dialog Lista Prompts */}
      <Dialog open={dialog_open} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Prompt AI Attivi in questa Pagina
            </DialogTitle>
            <DialogDescription>
              Visualizza e modifica i prompt AI utilizzati in questa sezione
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {is_loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : prompts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                ℹ️ Nessun prompt AI attivo in questa pagina
              </div>
            ) : (
              <div className="space-y-2">
                {prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {!prompt.editable && <Settings className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium">{prompt.label}</span>
                      </div>
                      {prompt.content && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {prompt.content.substring(0, 100)}...
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {prompt.editable ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePromptClick(prompt, false)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Visualizza
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePromptClick(prompt, true)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Modifica
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePromptClick(prompt, false)}
                        >
                          Vai alle Configurazioni
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog Visualizza Prompt (Read-only) */}
      <Dialog open={view_mode} onOpenChange={setViewMode}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              📝 {selected_prompt?.label}
            </DialogTitle>
            <DialogDescription>
              Visualizzazione prompt (modalità lettura)
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh]">
            <Textarea
              value={selected_prompt?.content || ''}
              readOnly
              className="min-h-[300px] font-mono text-sm"
            />
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseViewDialog}>
              Chiudi
            </Button>
            <Button onClick={() => {
              setViewMode(false);
              handlePromptClick(selected_prompt!, true);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Modifica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifica Prompt */}
      <Dialog open={edit_mode} onOpenChange={setEditMode}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              ✏️ Modifica: {selected_prompt?.label}
            </DialogTitle>
            <DialogDescription>
              Modifica il contenuto del prompt AI
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh]">
            <Textarea
              value={edit_content}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Inserisci il prompt AI..."
            />
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog}>
              Annulla
            </Button>
            <Button onClick={handleSavePrompt}>
              Salva Modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
