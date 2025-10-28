import { MessageSquareText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RadioWordLimitSliderProps {
  conversationId: string | null;
  value: number;
  onChange: (value: number) => void;
}

export const RadioWordLimitSlider = ({
  conversationId,
  value,
  onChange,
}: RadioWordLimitSliderProps) => {
  const { toast } = useToast();

  const handleValueCommit = async (newValue: number) => {
    if (!conversationId) return;

    console.log(`🎯 Aggiornamento limite parole a ${newValue} per tutti gli agenti`);

    const { data: agents, error: fetchError } = await supabase
      .from('elevenlabs_agents')
      .select('id, name, max_words_per_response');
    
    if (fetchError) {
      console.error('❌ Errore fetch agenti:', fetchError);
      return;
    }

    console.log(`📊 Agenti trovati:`, agents);

    if (agents && agents.length > 0) {
      const results = await Promise.all(
        agents.map(agent =>
          supabase
            .from('elevenlabs_agents')
            .update({ max_words_per_response: newValue })
            .eq('id', agent.id)
            .select()
        )
      );
      
      console.log(`✅ Aggiornati ${results.length} agenti:`, results);
      
      toast({
        title: "Lunghezza aggiornata",
        description: `Limite impostato a ${newValue} parole per ${agents.length} agenti`,
      });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8 relative"
          title="Lunghezza massima risposte AI"
        >
          <MessageSquareText className="h-4 w-4" />
          <Badge 
            variant="secondary" 
            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] font-mono"
          >
            {value}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="bottom" align="end">
        <div className="space-y-3">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Lunghezza Risposte AI</h4>
            <p className="text-xs text-muted-foreground">
              Controlla la lunghezza massima delle risposte degli agenti AI
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Slider
              min={20}
              max={150}
              step={10}
              value={[value]}
              onValueChange={([newValue]) => onChange(newValue)}
              onValueCommit={([newValue]) => handleValueCommit(newValue)}
              className="flex-1"
            />
            <Badge variant="outline" className="font-mono text-sm min-w-12 justify-center">
              {value}
            </Badge>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
