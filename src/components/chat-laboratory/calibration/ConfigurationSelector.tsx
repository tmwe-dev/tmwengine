import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Star, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SavedConfig {
  id: string;
  config_name: string;
  turn_strategy: string;
  pause_between_turns_ms: number;
  enable_direct_calls: boolean;
  voice_enabled: boolean;
  is_favorite: boolean;
  created_at: string;
}

interface ConfigurationSelectorProps {
  onLoadConfig: (configId: string) => void;
}

export function ConfigurationSelector({ onLoadConfig }: ConfigurationSelectorProps) {
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orchestrator_test_configs')
        .select('*')
        .eq('user_id', user.id)
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setConfigs(data || []);
    } catch (error: any) {
      console.error('Error loading configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (configId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('orchestrator_test_configs')
        .update({ is_favorite: !currentFavorite })
        .eq('id', configId);

      if (error) throw error;

      setConfigs(prev =>
        prev.map(c => (c.id === configId ? { ...c, is_favorite: !currentFavorite } : c))
      );

      toast({
        title: !currentFavorite ? '⭐ Aggiunto ai preferiti' : 'Rimosso dai preferiti',
      });
    } catch (error: any) {
      toast({
        title: '❌ Errore',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteConfig = async (configId: string) => {
    try {
      const { error } = await supabase
        .from('orchestrator_test_configs')
        .delete()
        .eq('id', configId);

      if (error) throw error;

      setConfigs(prev => prev.filter(c => c.id !== configId));

      toast({
        title: '🗑️ Configurazione eliminata',
      });
    } catch (error: any) {
      toast({
        title: '❌ Errore',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">📋 Configurazioni Salvate</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : configs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nessuna configurazione salvata</p>
            <p className="text-sm mt-1">Salva una configurazione per riutilizzarla</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {configs.map((config) => (
              <div
                key={config.id}
                className="p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{config.config_name}</h4>
                      {config.is_favorite && <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(config.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {config.voice_enabled && (
                    <Badge variant="outline">🎤 Voice</Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onLoadConfig(config.id)}
                    className="flex-1"
                  >
                    Carica
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleFavorite(config.id, config.is_favorite)}
                  >
                    <Star className={config.is_favorite ? 'fill-yellow-500 text-yellow-500' : ''} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteConfig(config.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
