import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Clock, MessageSquare, Zap } from "lucide-react";

interface ConversationStatsProps {
  conversationId: string | null;
  currentTokenUsage?: { input: number; output: number };
  responseTime?: number;
  modelUsed?: string;
}

interface UsageStats {
  token_totali_input: number;
  token_totali_output: number;
  numero_messaggi: number;
  tempo_totale_ms: number;
}

export const LabConversationStats = ({ 
  conversationId, 
  currentTokenUsage, 
  responseTime,
  modelUsed 
}: ConversationStatsProps) => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    checkStatsVisibility();
  }, []);

  useEffect(() => {
    if (conversationId && isVisible) {
      loadStats();
      
      const channel = supabase
        .channel('lab-stats-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_laboratory_usage_stats',
            filter: `conversation_id=eq.${conversationId}`
          },
          () => {
            loadStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, isVisible]);

  const checkStatsVisibility = async () => {
    try {
      const { data } = await supabase
        .from('config_generale')
        .select('mostra_statistiche')
        .limit(1)
        .maybeSingle();
      
      setIsVisible(data?.mostra_statistiche ?? true);
    } catch (error) {
      console.error('Error checking stats visibility:', error);
    }
  };

  const loadStats = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('chat_laboratory_usage_stats')
        .select('token_totali_input, token_totali_output, numero_messaggi, tempo_totale_ms')
        .eq('conversation_id', conversationId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getTokenEfficiency = () => {
    if (!stats || stats.numero_messaggi === 0) return 0;
    const totalTokens = stats.token_totali_input + stats.token_totali_output;
    return Math.round(totalTokens / stats.numero_messaggi);
  };

  const getAverageResponseTime = () => {
    if (!stats || stats.numero_messaggi === 0) return 0;
    return Math.round(stats.tempo_totale_ms / stats.numero_messaggi);
  };

  if (!isVisible) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5" />
          Statistiche Conversazione
        </CardTitle>
        <CardDescription>
          Metriche di utilizzo e performance della conversazione multi-agente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistiche Cumulative */}
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Zap className="w-4 h-4" />
                Token Input
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.token_totali_input.toLocaleString()}
              </div>
            </div>

            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Zap className="w-4 h-4" />
                Token Output
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.token_totali_output.toLocaleString()}
              </div>
            </div>

            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MessageSquare className="w-4 h-4" />
                Messaggi
              </div>
              <div className="text-2xl font-bold text-green-600">
                {stats.numero_messaggi}
              </div>
            </div>

            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                Tempo Medio
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {formatTime(getAverageResponseTime())}
              </div>
            </div>
          </div>
        )}

        {/* Ultima Richiesta */}
        {currentTokenUsage && (
          <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
            <h4 className="text-sm font-semibold">Ultima Richiesta</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Token Input:</span>
                <span className="ml-2 font-medium">{currentTokenUsage.input}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Token Output:</span>
                <span className="ml-2 font-medium">{currentTokenUsage.output}</span>
              </div>
              {responseTime && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Tempo Risposta:</span>
                  <span className="ml-2 font-medium">{formatTime(responseTime)}</span>
                </div>
              )}
              {modelUsed && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Modello:</span>
                  <span className="ml-2 font-medium">{modelUsed}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metriche di Efficienza */}
        {stats && stats.numero_messaggi > 0 && (
          <div className="space-y-2 p-4 border rounded-lg">
            <h4 className="text-sm font-semibold">Metriche di Efficienza</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token per messaggio:</span>
                <span className="font-medium">{getTokenEfficiency()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tempo totale:</span>
                <span className="font-medium">{formatTime(stats.tempo_totale_ms)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};