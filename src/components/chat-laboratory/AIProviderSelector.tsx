import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Cpu } from "lucide-react";

interface AIConfig {
  id: string;
  provider: string;
  modello: string;
  attivo: boolean;
}

interface AIProviderSelectorProps {
  selectedConfigId: string | null;
  onConfigChange: (configId: string) => void;
}

export const AIProviderSelector = ({
  selectedConfigId,
  onConfigChange
}: AIProviderSelectorProps) => {
  const [configs, setConfigs] = useState<AIConfig[]>([]);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('config_ai')
        .select('*')
        .eq('attivo', true)
        .order('provider', { ascending: true });

      if (error) throw error;
      setConfigs(data || []);

      // Auto-select first config if none selected
      if (!selectedConfigId && data && data.length > 0) {
        onConfigChange(data[0].id);
      }
    } catch (error) {
      console.error('Error loading AI configs:', error);
    }
  };

  const getProviderLabel = (config: AIConfig) => {
    const providerNames: Record<string, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'google': 'Google',
      'lovable': 'Lovable AI'
    };
    const providerName = providerNames[config.provider] || config.provider;
    return `${providerName} - ${config.modello}`;
  };

  if (configs.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Cpu className="w-4 h-4" />
        <span>Nessuna configurazione AI attiva</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Cpu className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Select
        value={selectedConfigId || undefined}
        onValueChange={onConfigChange}
      >
        <SelectTrigger className="w-full max-w-xs">
          <SelectValue placeholder="Seleziona provider AI" />
        </SelectTrigger>
        <SelectContent>
          {configs.map((config) => (
            <SelectItem key={config.id} value={config.id}>
              {getProviderLabel(config)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};