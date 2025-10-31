import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import albertGif from '@/assets/albert-mining.gif';
import albertStatic from '@/assets/albert-static.png';
import pitagoraGif from '@/assets/pitagora-gym.gif';
import pitagoraStatic from '@/assets/pitagora-static.png';
import archimedeGif from '@/assets/archimede-stones.gif';
import archimedeStatic from '@/assets/archimede-static.png';

interface AIConfig {
  id: string;
  provider: string;
  modello: string;
  attivo: boolean;
}

interface SmartAIParticipantSelectorProps {
  selectedConfigId: string | null;
  onConfigChange: (configId: string) => void;
}

export function SmartAIParticipantSelector({ 
  selectedConfigId, 
  onConfigChange 
}: SmartAIParticipantSelectorProps) {
  const [configs, setConfigs] = useState<AIConfig[]>([]);

  // Mappa provider → avatar
  const avatarConfig = {
    openai: { gif: albertGif, static: albertStatic, name: 'Albert' },
    chatgpt: { gif: albertGif, static: albertStatic, name: 'Albert' },
    gemini: { gif: pitagoraGif, static: pitagoraStatic, name: 'Pitagora' },
    google: { gif: pitagoraGif, static: pitagoraStatic, name: 'Pitagora' },
    claude: { gif: archimedeGif, static: archimedeStatic, name: 'Archimede' },
    anthropic: { gif: archimedeGif, static: archimedeStatic, name: 'Archimede' }
  };

  // Fetch configs da DB
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const { data } = await supabase
      .from('config_ai')
      .select('*')
      .eq('attivo', true)
      .order('provider', { ascending: true });

    setConfigs(data || []);

    // Auto-select primo config
    if (!selectedConfigId && data && data.length > 0) {
      onConfigChange(data[0].id);
    }
  };

  // Raggruppa configs per provider
  const groupedConfigs = configs.reduce((acc, config) => {
    const key = config.provider.toLowerCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(config);
    return acc;
  }, {} as Record<string, AIConfig[]>);

  // Ordine preferenziale dei provider da mostrare
  const providerOrder = ['openai', 'chatgpt', 'google', 'gemini', 'anthropic', 'claude'];
  
  return (
    <div className="flex gap-3 justify-center items-center">
      {providerOrder.map((providerKey) => {
        const providerConfigs = groupedConfigs[providerKey] || [];
        const isActive = providerConfigs.some(c => c.id === selectedConfigId);
        const firstConfig = providerConfigs[0];

        if (!firstConfig) return null; // Skip se provider non configurato

        const config = avatarConfig[providerKey as keyof typeof avatarConfig];
        if (!config) return null;

        return (
          <button
            key={providerKey}
            onClick={() => onConfigChange(firstConfig.id)}
            className={cn(
              "relative w-16 h-16 flex items-center justify-center",
              "transition-all duration-300 hover:scale-110",
              "cursor-pointer"
            )}
            title={`${config.name} (${firstConfig.modello})`}
          >
            <img 
              src={isActive ? config.gif : config.static}
              alt={config.name}
              className={cn(
                "w-full h-full object-contain transition-all duration-300",
                !isActive && "grayscale opacity-50"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
