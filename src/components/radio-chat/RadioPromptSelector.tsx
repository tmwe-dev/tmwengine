import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import { useRadioPromptCRUD } from '@/hooks/useRadioPromptCRUD';

interface RadioPromptSelectorProps {
  conversationId?: string | null;
}

export const RadioPromptSelector = ({ conversationId }: RadioPromptSelectorProps) => {
  const {
    globalPrompts, selectedGlobalId, globalContent, setGlobalContent,
    conversationPromptId,
    composedPrompts, selectedComposedId, composedContent,
    conversationComposedId,
    loading, saving,
    saveGlobalPrompt, onGlobalChange, onComposedChange
  } = useRadioPromptCRUD(conversationId);

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
              <SelectTrigger><SelectValue /></SelectTrigger>
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

          <Button onClick={saveGlobalPrompt} disabled={saving || !selectedGlobalId} variant="outline" className="w-full">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvataggio...</> : <><Save className="w-4 h-4 mr-2" />Salva Prompt</>}
          </Button>
        </TabsContent>

        <TabsContent value="ready" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-sm">Prompt Pronto (Preconfezionato)</Label>
            <Select value={selectedComposedId} onValueChange={onComposedChange}>
              <SelectTrigger><SelectValue placeholder="Seleziona un prompt pronto..." /></SelectTrigger>
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

          {selectedComposedId && (
            <>
              <Textarea value={composedContent} readOnly className="min-h-[200px] font-mono text-xs bg-muted" placeholder="Anteprima prompt pronto..." />
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
