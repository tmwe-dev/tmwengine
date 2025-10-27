import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, CheckCircle } from 'lucide-react';

interface GlobalPrompt {
  id: string;
  nome: string;
  contenuto: string;
}

interface ComposedPrompt {
  id: string;
  name: string;
  content: string;
  target_agent: string;
}

interface PromptSection {
  id: string;
  section_name: string;
  content: string;
  section_type: string;
}

interface RadioPromptSelectorProps {
  conversationId?: string | null;
}

export const RadioPromptSelector = ({ conversationId }: RadioPromptSelectorProps) => {
  const [globalPrompts, setGlobalPrompts] = useState<GlobalPrompt[]>([]);
  const [selectedGlobalId, setSelectedGlobalId] = useState<string>('');
  const [globalContent, setGlobalContent] = useState('');
  const [conversationPromptId, setConversationPromptId] = useState<string | null>(null);
  
  const [composedPrompts, setComposedPrompts] = useState<ComposedPrompt[]>([]);
  const [selectedComposedId, setSelectedComposedId] = useState<string>('');
  const [composedContent, setComposedContent] = useState('');
  const [conversationComposedId, setConversationComposedId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Load global prompts
    const { data: globals, error: globalError } = await supabase
      .from('chat_laboratory_system_prompts')
      .select('id, nome, contenuto')
      .order('nome');

    if (!globalError && globals && globals.length > 0) {
      setGlobalPrompts(globals);
      
      // Load conversation's assigned prompt
      let initialPromptId = globals[0].id;
      
      if (conversationId) {
        const { data: conv } = await supabase
          .from('chat_laboratory_conversations')
          .select('system_prompt_id, composed_prompt_id')
          .eq('id', conversationId)
          .single();
        
        if (conv?.system_prompt_id) {
          initialPromptId = conv.system_prompt_id;
          setConversationPromptId(conv.system_prompt_id);
        }

        if (conv?.composed_prompt_id) {
          setConversationComposedId(conv.composed_prompt_id);
        }
      }
      
      setSelectedGlobalId(initialPromptId);
      const selectedPrompt = globals.find(p => p.id === initialPromptId);
      if (selectedPrompt) {
        setGlobalContent(selectedPrompt.contenuto);
      }
    }

    // Load composed prompts (ready prompts)
    const { data: composed, error: composedError } = await supabase
      .from('chat_laboratory_composed_prompts')
      .select('id, name, content, target_agent')
      .order('created_at', { ascending: false });

    if (!composedError && composed && composed.length > 0) {
      setComposedPrompts(composed);
      
      if (conversationId) {
        const { data: conv } = await supabase
          .from('chat_laboratory_conversations')
          .select('composed_prompt_id')
          .eq('id', conversationId)
          .single();
        
        if (conv?.composed_prompt_id) {
          setSelectedComposedId(conv.composed_prompt_id);
          const selectedComposed = composed.find(p => p.id === conv.composed_prompt_id);
          if (selectedComposed) {
            setComposedContent(selectedComposed.content);
          }
        }
      }
    }

    setLoading(false);
  };

  const saveGlobalPrompt = async () => {
    if (!selectedGlobalId) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('chat_laboratory_system_prompts')
      .update({ contenuto: globalContent })
      .eq('id', selectedGlobalId);

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile salvare il prompt globale',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Salvato',
        description: 'Prompt globale aggiornato con successo',
      });
    }
    setSaving(false);
  };


  const assignPromptToConversation = async () => {
    if (!conversationId || !selectedGlobalId) {
      toast({
        title: 'Errore',
        description: 'Nessuna conversazione attiva',
        variant: 'destructive'
      });
      return;
    }
    
    setSaving(true);
    const { error } = await supabase
      .from('chat_laboratory_conversations')
      .update({ 
        system_prompt_id: selectedGlobalId,
        composed_prompt_id: null // Reset composed when assigning global
      })
      .eq('id', conversationId);

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile assegnare il prompt',
        variant: 'destructive'
      });
    } else {
      setConversationPromptId(selectedGlobalId);
      setConversationComposedId(null);
      toast({
        title: 'Prompt assegnato',
        description: 'Prompt globale assegnato alla conversazione',
      });
    }
    setSaving(false);
  };

  const assignComposedPromptToConversation = async () => {
    if (!conversationId || !selectedComposedId) {
      toast({
        title: 'Errore',
        description: 'Nessuna conversazione attiva',
        variant: 'destructive'
      });
      return;
    }
    
    setSaving(true);
    const { error } = await supabase
      .from('chat_laboratory_conversations')
      .update({ 
        composed_prompt_id: selectedComposedId,
        system_prompt_id: null // Reset global when assigning composed
      })
      .eq('id', conversationId);

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile assegnare il prompt pronto',
        variant: 'destructive'
      });
    } else {
      setConversationComposedId(selectedComposedId);
      setConversationPromptId(null);
      toast({
        title: 'Prompt pronto assegnato',
        description: 'Questo prompt preconfezionato sarà usato per la conversazione',
      });
    }
    setSaving(false);
  };


  const onGlobalChange = (id: string) => {
    setSelectedGlobalId(id);
    const prompt = globalPrompts.find(p => p.id === id);
    if (prompt) setGlobalContent(prompt.contenuto);
  };

  const onComposedChange = (id: string) => {
    setSelectedComposedId(id);
    const prompt = composedPrompts.find(p => p.id === id);
    if (prompt) setComposedContent(prompt.content);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="ready">Pronti</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-sm">Prompt Sistema (Globale)</Label>
            <Select value={selectedGlobalId} onValueChange={onGlobalChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {globalPrompts.map(prompt => (
                  <SelectItem key={prompt.id} value={prompt.id}>
                    {prompt.nome}
                    {conversationPromptId === prompt.id && ' ✓'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={globalContent}
            onChange={(e) => setGlobalContent(e.target.value)}
            className="min-h-[200px] font-mono text-xs"
            placeholder="Contenuto del prompt..."
          />

          <div className="flex gap-2">
            <Button
              onClick={saveGlobalPrompt}
              disabled={saving || !selectedGlobalId}
              variant="outline"
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salva Prompt
                </>
              )}
            </Button>

            {conversationId && (
              <Button
                onClick={assignPromptToConversation}
                disabled={saving || !selectedGlobalId || conversationPromptId === selectedGlobalId}
                className="flex-1"
              >
                {conversationPromptId === selectedGlobalId ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Assegnato
                  </>
                ) : (
                  'Usa in questa chat'
                )}
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ready" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-sm">Prompt Pronto (Preconfezionato)</Label>
            <Select value={selectedComposedId} onValueChange={onComposedChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un prompt pronto..." />
              </SelectTrigger>
              <SelectContent>
                {composedPrompts.map(prompt => (
                  <SelectItem key={prompt.id} value={prompt.id}>
                    {prompt.name}
                    {conversationComposedId === prompt.id && ' ✓'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {conversationId && (
            <Button
              onClick={assignComposedPromptToConversation}
              disabled={saving || !selectedComposedId || conversationComposedId === selectedComposedId}
              className="w-full"
            >
              {conversationComposedId === selectedComposedId ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Assegnato
                </>
              ) : (
                'Usa in questa conversazione'
              )}
            </Button>
          )}

          {selectedComposedId && (
            <>
              <Textarea
                value={composedContent}
                readOnly
                className="min-h-[200px] font-mono text-xs bg-muted"
                placeholder="Anteprima prompt pronto..."
              />

              <div className="bg-muted p-3 rounded text-sm">
                <p className="text-muted-foreground">
                  💡 <strong>Nota:</strong> I prompt pronti sono preconfezionati e non modificabili. 
                  Se assegni un prompt pronto, sostituirà il prompt globale per questa conversazione.
                </p>
              </div>
            </>
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
};
