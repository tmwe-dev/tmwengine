import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

interface GlobalPrompt {
  id: string;
  nome: string;
  contenuto: string;
}

interface PromptSection {
  id: string;
  section_name: string;
  content: string;
  section_type: string;
}

export const RadioPromptSelector = () => {
  const [globalPrompts, setGlobalPrompts] = useState<GlobalPrompt[]>([]);
  const [selectedGlobalId, setSelectedGlobalId] = useState<string>('');
  const [globalContent, setGlobalContent] = useState('');
  
  const [personalitySections, setPersonalitySections] = useState<PromptSection[]>([]);
  const [selectedPersonalityId, setSelectedPersonalityId] = useState<string>('');
  const [personalityContent, setPersonalityContent] = useState('');
  
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
      setSelectedGlobalId(globals[0].id);
      setGlobalContent(globals[0].contenuto);
    }

    // Load personality sections
    const { data: personalities, error: personalityError } = await supabase
      .from('chat_laboratory_prompt_sections')
      .select('id, section_name, content, section_type')
      .eq('section_type', 'personality')
      .eq('is_active', true)
      .order('section_name');

    if (!personalityError && personalities && personalities.length > 0) {
      setPersonalitySections(personalities);
      setSelectedPersonalityId(personalities[0].id);
      setPersonalityContent(personalities[0].content);
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

  const savePersonalityPrompt = async () => {
    if (!selectedPersonalityId) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('chat_laboratory_prompt_sections')
      .update({ content: personalityContent })
      .eq('id', selectedPersonalityId);

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile salvare la personality',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Salvato',
        description: 'Personality aggiornata con successo',
      });
    }
    setSaving(false);
  };

  const onGlobalChange = (id: string) => {
    setSelectedGlobalId(id);
    const prompt = globalPrompts.find(p => p.id === id);
    if (prompt) setGlobalContent(prompt.contenuto);
  };

  const onPersonalityChange = (id: string) => {
    setSelectedPersonalityId(id);
    const section = personalitySections.find(s => s.id === id);
    if (section) setPersonalityContent(section.content);
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
          <TabsTrigger value="personality">Personality</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-sm">Prompt Globale</Label>
            <Select value={selectedGlobalId} onValueChange={onGlobalChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {globalPrompts.map(prompt => (
                  <SelectItem key={prompt.id} value={prompt.id}>
                    {prompt.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={globalContent}
            onChange={(e) => setGlobalContent(e.target.value)}
            className="min-h-[200px] font-mono text-xs"
            placeholder="Contenuto del prompt globale..."
          />

          <Button
            onClick={saveGlobalPrompt}
            disabled={saving || !selectedGlobalId}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salva Prompt Globale
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="personality" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-sm">Personality</Label>
            <Select value={selectedPersonalityId} onValueChange={onPersonalityChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {personalitySections.map(section => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.section_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={personalityContent}
            onChange={(e) => setPersonalityContent(e.target.value)}
            className="min-h-[200px] font-mono text-xs"
            placeholder="Contenuto della personality..."
          />

          <Button
            onClick={savePersonalityPrompt}
            disabled={saving || !selectedPersonalityId}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salva Personality
              </>
            )}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};
