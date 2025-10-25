import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Info } from 'lucide-react';

interface RadioStrategySelectorProps {
  conversationId: string | null;
}

const strategies = [
  { 
    value: 'SMART_PRIORITY', 
    label: 'Smart Priority',
    description: 'AI decide chi risponde basandosi sul contesto'
  },
  { 
    value: 'ROUND_ROBIN', 
    label: 'Round Robin',
    description: 'Turni circolari tra gli agenti'
  },
  { 
    value: 'RANDOM_30', 
    label: 'Random 30%',
    description: '30% di probabilità per ogni agente'
  },
  { 
    value: 'INTERRUPT_BASED', 
    label: 'Interrupt Based',
    description: 'Gli agenti possono interrompersi a vicenda'
  }
];

export const RadioStrategySelector = ({ conversationId }: RadioStrategySelectorProps) => {
  const [currentStrategy, setCurrentStrategy] = useState<string>('SMART_PRIORITY');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    const loadStrategy = async () => {
      const { data, error } = await supabase
        .from('chat_laboratory_bar_mode')
        .select('turn_strategy')
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error loading strategy:', error);
      } else if (data) {
        setCurrentStrategy(data.turn_strategy || 'SMART_PRIORITY');
      }
      setLoading(false);
    };

    loadStrategy();
  }, [conversationId]);

  const updateStrategy = async (newStrategy: string) => {
    if (!conversationId) {
      toast({
        title: 'Info',
        description: 'Strategia sarà applicata alla prossima conversazione',
      });
      setCurrentStrategy(newStrategy);
      return;
    }

    const { error } = await supabase
      .from('chat_laboratory_bar_mode')
      .update({ turn_strategy: newStrategy })
      .eq('conversation_id', conversationId);

    if (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare la strategia',
        variant: 'destructive'
      });
    } else {
      setCurrentStrategy(newStrategy);
      toast({
        title: 'Strategia aggiornata',
        description: `Ora usando: ${strategies.find(s => s.value === newStrategy)?.label}`,
      });
    }
  };

  const selectedStrategy = strategies.find(s => s.value === currentStrategy);

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Turn Strategy</Label>
        
        <Select
          value={currentStrategy}
          onValueChange={updateStrategy}
          disabled={loading}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {strategies.map(strategy => (
              <SelectItem key={strategy.value} value={strategy.value}>
                {strategy.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedStrategy && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <Info className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="space-y-1">
            <div className="text-xs font-medium">{selectedStrategy.label}</div>
            <div className="text-xs text-muted-foreground">
              {selectedStrategy.description}
            </div>
          </div>
        </div>
      )}

      {!conversationId && (
        <Badge variant="outline" className="w-full justify-center">
          Verrà applicata alla prossima conversazione
        </Badge>
      )}
    </div>
  );
};
