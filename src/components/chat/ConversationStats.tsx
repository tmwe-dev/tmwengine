import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Clock, Zap, MessageSquare, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ConversationStatsProps {
  conversationId: string | null;
  currentTokenUsage?: number;
  responseTime?: number;
  modelUsed?: string;
}

interface UsageStats {
  token_totali_input: number;
  token_totali_output: number;
  numero_messaggi: number;
  tempo_totale_ms: number;
}

export const ConversationStats = ({ 
  conversationId, 
  currentTokenUsage = 0,
  responseTime = 0,
  modelUsed 
}: ConversationStatsProps) => {
  const [stats, setStats] = useState<UsageStats>({
    token_totali_input: 0,
    token_totali_output: 0,
    numero_messaggi: 0,
    tempo_totale_ms: 0
  });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    checkStatsVisibility();
  }, []);

  useEffect(() => {
    if (conversationId && isVisible) {
      loadStats();
      
      // Setup realtime per aggiornamenti stats
      const statsChannel = supabase
        .channel('usage-stats-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'chat_usage_stats' },
          (payload) => {
            const record = payload.new as any;
            if (record && record.conversation_id === conversationId) {
              loadStats();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(statsChannel);
      };
    }
  }, [conversationId, isVisible]);

  const checkStatsVisibility = async () => {
    try {
      const { data, error } = await supabase
        .from('config_generale')
        .select('mostra_statistiche')
        .single();

      if (error) throw error;
      setIsVisible(data?.mostra_statistiche ?? true);
    } catch (error) {
      console.error('Errore verifica visibilità stats:', error);
    }
  };

  const loadStats = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('chat_usage_stats')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      if (data) {
        setStats(data);
      }
    } catch (error) {
      console.error('Errore caricamento statistiche:', error);
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getTokenEfficiency = () => {
    const totalTokens = stats.token_totali_input + stats.token_totali_output;
    if (stats.numero_messaggi === 0) return 0;
    return Math.round(totalTokens / stats.numero_messaggi);
  };

  const getAverageResponseTime = () => {
    if (stats.numero_messaggi === 0) return 0;
    return Math.round(stats.tempo_totale_ms / stats.numero_messaggi);
  };

  if (!isVisible) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Statistiche Conversazione
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Token Input */}
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.token_totali_input.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Token Input</div>
          </div>

          {/* Token Output */}
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.token_totali_output.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Token Output</div>
          </div>

          {/* Messaggi */}
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.numero_messaggi}
            </div>
            <div className="text-xs text-muted-foreground">Messaggi</div>
          </div>

          {/* Tempo Medio */}
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatTime(getAverageResponseTime())}
            </div>
            <div className="text-xs text-muted-foreground">Tempo Medio</div>
          </div>
        </div>

        {/* Statistiche Current Request */}
        {conversationId && (currentTokenUsage > 0 || responseTime > 0) && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Ultima Richiesta
            </h4>
            <div className="flex flex-wrap gap-2">
              {currentTokenUsage > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {currentTokenUsage} token
                </Badge>
              )}
              {responseTime > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(responseTime)}
                </Badge>
              )}
              {modelUsed && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {modelUsed}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Efficiency Metrics */}
        {stats.numero_messaggi > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Efficienza Token</div>
              <div className="font-medium">{getTokenEfficiency()} token/msg</div>
            </div>
            <div>
              <div className="text-muted-foreground">Tempo Totale</div>
              <div className="font-medium">{formatTime(stats.tempo_totale_ms)}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};