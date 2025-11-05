/**
 * AI Prompt Library Selector - Dropdown per selezionare prompt salvati
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIPromptLibrary {
  id: string;
  prompt_name: string;
  system_prompt: string;
  category?: string;
  is_public: boolean;
  usage_count: number;
  created_at: string;
}

interface AIPromptLibrarySelectorProps {
  onSelect: (prompt: { system_prompt: string }) => void;
}

export function AIPromptLibrarySelector({ onSelect }: AIPromptLibrarySelectorProps) {
  const [prompts, setPrompts] = useState<AIPromptLibrary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      // Fetch diretto con type bypass
      const response = await (supabase as any)
        .from('ai_prompt_library')
        .select('*');
      
      if (response.error) throw response.error;

      // Filtra lato client per user o pubblici e ordina
      const filteredData = (response.data || [])
        .filter((p: any) => p.created_by === user.id || p.is_public === true)
        .sort((a: any, b: any) => (b.usage_count || 0) - (a.usage_count || 0));

      setPrompts(filteredData);
    } catch (error: any) {
      console.error('❌ Errore caricamento prompt library:', error);
      toast({
        title: '❌ Errore',
        description: 'Impossibile caricare i prompt salvati',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (prompt: AIPromptLibrary) => {
    onSelect({ system_prompt: prompt.system_prompt });

    // Incrementa contatore utilizzo
    try {
      await supabase.rpc('increment_prompt_library_usage', {
        prompt_id: prompt.id,
      });
    } catch (error) {
      console.error('⚠️ Errore incremento contatore:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nessun prompt salvato</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Prompt Salvati</h3>
        <Badge variant="secondary">{prompts.length}</Badge>
      </div>
      <ScrollArea className="h-[200px]">
        <div className="space-y-2 pr-4">
          {prompts.map((prompt) => (
            <Button
              key={prompt.id}
              variant="outline"
              className="w-full justify-start text-left h-auto py-3"
              onClick={() => handleSelect(prompt)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">
                    {prompt.prompt_name}
                  </span>
                  {prompt.is_public && (
                    <Star className="h-3 w-3 text-yellow-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {prompt.system_prompt}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {prompt.category && (
                    <Badge variant="secondary" className="text-xs">
                      {prompt.category}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Usato {prompt.usage_count} volte
                  </span>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
