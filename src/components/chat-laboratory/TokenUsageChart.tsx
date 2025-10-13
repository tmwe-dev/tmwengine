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
    tokensIn: number;
    tokensOut: number;
    colorIn: string;
    colorOut: string;
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
      .select('sender_name, token_input, token_output')
      .eq('conversation_id', conversationId)
      .or('token_input.not.is.null,token_output.not.is.null');

    if (!data) return;

    // Aggrega token per agente
    const aggregated = data.reduce((acc, msg) => {
      const existing = acc.find(x => x.agent === msg.sender_name);
      if (existing) {
        existing.tokensIn += msg.token_input || 0;
        existing.tokensOut += msg.token_output || 0;
      } else {
        const baseColor = msg.sender_name === 'ChatGPT' ? '142, 76%' : 
                         msg.sender_name === 'Claude' ? '262, 83%' : '221, 83%';
        acc.push({
          agent: msg.sender_name,
          tokensIn: msg.token_input || 0,
          tokensOut: msg.token_output || 0,
          colorIn: `hsl(${baseColor}, 70%)`,
          colorOut: `hsl(${baseColor}, 40%)`
        });
      }
      return acc;
    }, [] as Array<{ agent: string; tokensIn: number; tokensOut: number; colorIn: string; colorOut: string }>);

    setTokenData(aggregated);
    
    // Notifica parent del totale
    const total = aggregated.reduce((sum, d) => sum + d.tokensIn + d.tokensOut, 0);
    onTotalTokensChange?.(total);
  }

  if (tokenData.length === 0) return null;

  const totalTokens = tokenData.reduce((sum, d) => sum + d.tokensIn + d.tokensOut, 0);
  const maxTokens = Math.max(...tokenData.map(d => d.tokensIn + d.tokensOut));

  // Formato numeri: sempre in migliaia con 1 decimale
  const formatTokens = (tokens: number): string => {
    return `${(tokens / 1000).toFixed(1)}K`;
  };

  // Modalità compatta per header
  if (compact) {
    return (
      <div 
        className="flex items-end gap-3 px-2 py-1 cursor-pointer"
        onClick={onClick}
        title="Clicca per espandere il grafico"
      >
        {tokenData.map((agent) => {
          const heightPercentIn = (agent.tokensIn / maxTokens) * 100;
          const heightPercentOut = (agent.tokensOut / maxTokens) * 100;

          return (
            <div key={agent.agent} className="flex gap-0.5 items-end">
              {/* Colonnina Token IN */}
              <div className="flex flex-col justify-end h-12 md:h-16">
                <div 
                  className="w-4 md:w-8 rounded-t flex items-center justify-center"
                  style={{ 
                    height: `${Math.max(heightPercentIn, 20)}%`, 
                    minHeight: '20px',
                    background: `linear-gradient(to top, ${agent.colorIn}CC, ${agent.colorIn})`
                  }}
                  title={`${agent.agent} IN: ${formatTokens(agent.tokensIn)}`}
                >
                  <span className="text-[9px] md:text-xs font-bold text-white drop-shadow">
                    {formatTokens(agent.tokensIn)}
                  </span>
                </div>
              </div>
              
              {/* Colonnina Token OUT */}
              <div className="flex flex-col justify-end h-12 md:h-16">
                <div 
                  className="w-4 md:w-8 rounded-t flex items-center justify-center"
                  style={{ 
                    height: `${Math.max(heightPercentOut, 20)}%`, 
                    minHeight: '20px',
                    background: `linear-gradient(to top, ${agent.colorOut}DD, ${agent.colorOut})`
                  }}
                  title={`${agent.agent} OUT: ${formatTokens(agent.tokensOut)}`}
                >
                  <span className="text-[9px] md:text-xs font-bold text-white drop-shadow">
                    {formatTokens(agent.tokensOut)}
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
  const chartData = tokenData.map(d => ({
    agent: d.agent,
    'Token IN': d.tokensIn,
    'Token OUT': d.tokensOut
  }));

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
          <BarChart data={chartData}>
            <XAxis dataKey="agent" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="Token IN" fill="hsl(142, 76%, 70%)" radius={[8, 8, 0, 0]} />
            <Bar dataKey="Token OUT" fill="hsl(142, 76%, 40%)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
