import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TokenUsageChartProps {
  conversationId: string;
  compact?: boolean;
  onClick?: () => void;
  onTotalTokensChange?: (total: number) => void;
}

export function TokenUsageChart({ conversationId, compact = false, onClick, onTotalTokensChange }: TokenUsageChartProps) {
  const [tokenData, setTokenData] = useState<Array<{
    agent: string;
    tokens: number;
    color: string;
  }>>([]);

  useEffect(() => {
    loadTokenStats();
    
    const channel = supabase
      .channel(`token-stats-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_laboratory_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => loadTokenStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  async function loadTokenStats() {
    const { data } = await supabase
      .from('chat_laboratory_messages')
      .select('sender_name, token_output')
      .eq('conversation_id', conversationId)
      .not('token_output', 'is', null);

    if (!data) return;

    // Aggrega token per agente
    const aggregated = data.reduce((acc, msg) => {
      const existing = acc.find(x => x.agent === msg.sender_name);
      if (existing) {
        existing.tokens += msg.token_output || 0;
      } else {
        acc.push({
          agent: msg.sender_name,
          tokens: msg.token_output || 0,
          color: msg.sender_name === 'ChatGPT' ? 'hsl(var(--chart-1))' : 
                 msg.sender_name === 'Claude' ? 'hsl(var(--chart-2))' : 'hsl(var(--chart-3))'
        });
      }
      return acc;
    }, [] as Array<{ agent: string; tokens: number; color: string }>);

    setTokenData(aggregated);
    
    // Notifica parent del totale
    const total = aggregated.reduce((sum, d) => sum + d.tokens, 0);
    onTotalTokensChange?.(total);
  }

  if (tokenData.length === 0) return null;

  const totalTokens = tokenData.reduce((sum, d) => sum + d.tokens, 0);
  const maxTokens = Math.max(...tokenData.map(d => d.tokens));

  // Formato numeri: sempre in migliaia con 1 decimale
  const formatTokens = (tokens: number): string => {
    return `${(tokens / 1000).toFixed(1)}K`;
  };

  // Modalità compatta per header
  if (compact) {
    return (
      <div 
        className="flex items-end gap-2 px-2 py-1 cursor-pointer hover:scale-105 transition-transform"
        onClick={onClick}
        title="Clicca per espandere il grafico"
      >
        {tokenData.map((agent) => {
          const heightPercent = (agent.tokens / maxTokens) * 100;
          const bgGradient = 
            agent.agent === 'ChatGPT' ? 'bg-gradient-to-t from-green-500/30 to-green-400/50' :
            agent.agent === 'Claude' ? 'bg-gradient-to-t from-purple-500/30 to-purple-400/50' :
            'bg-gradient-to-t from-blue-500/30 to-blue-400/50';

          return (
            <div key={agent.agent} className="flex flex-col items-center">
              {/* Colonnina con numero dentro */}
              <div className="flex flex-col justify-end h-12 md:h-16">
                <div 
                  className={`w-8 md:w-16 rounded-t ${bgGradient} flex items-center justify-center ${totalTokens > 50000 ? 'border border-red-500' : ''}`}
                  style={{ height: `${Math.max(heightPercent, 30)}%`, minHeight: '24px' }}
                >
                  <span className={`text-xs md:text-sm font-bold ${totalTokens > 50000 ? 'text-red-500' : 'text-white'} drop-shadow-lg`}>
                    {formatTokens(agent.tokens)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Modalità espansa (normale)
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>📊 Token Usage</span>
          <span className="text-muted-foreground font-normal">
            Totale: {totalTokens.toLocaleString()} token
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={tokenData}>
            <XAxis dataKey="agent" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="tokens" radius={[8, 8, 0, 0]}>
              {tokenData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
