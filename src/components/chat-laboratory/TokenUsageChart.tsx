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

  // Custom Label per mostrare valori sotto le colonnine
  const CustomBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    return (
      <text
        x={x + width / 2}
        y={y + height + 15}
        fill="hsl(var(--foreground))"
        className="text-xs font-semibold"
        textAnchor="middle"
      >
        {formatTokens(value)}
      </text>
    );
  };

  // Modalità compatta per header
  if (compact) {
    return (
      <div 
        className="flex items-end gap-4 md:gap-6 px-3 py-2 cursor-pointer"
        onClick={onClick}
        title="Clicca per espandere il grafico"
      >
        {tokenData.map((agent) => {
          const heightPercentIn = (agent.tokensIn / maxTokens) * 100;
          const heightPercentOut = (agent.tokensOut / maxTokens) * 100;

          return (
            <div key={agent.agent} className="flex flex-col items-center gap-1.5">
              {/* Coppia colonnine IN + OUT affiancate */}
              <div className="flex gap-1 items-end h-16 md:h-20">
                {/* Colonnina Token IN */}
                <div 
                  className="w-6 md:w-10 rounded-t"
                  style={{ 
                    height: `${Math.max(heightPercentIn, 30)}%`, 
                    minHeight: '24px',
                    background: `linear-gradient(to top, ${agent.colorIn}CC, ${agent.colorIn})`
                  }}
                  title={`${agent.agent} IN: ${formatTokens(agent.tokensIn)}`}
                />
                
                {/* Colonnina Token OUT */}
                <div 
                  className="w-6 md:w-10 rounded-t"
                  style={{ 
                    height: `${Math.max(heightPercentOut, 30)}%`, 
                    minHeight: '24px',
                    background: `linear-gradient(to top, ${agent.colorOut}DD, ${agent.colorOut})`
                  }}
                  title={`${agent.agent} OUT: ${formatTokens(agent.tokensOut)}`}
                />
              </div>
              
              {/* Labels sotto le colonnine */}
              <div className="flex gap-1 text-[10px] md:text-xs font-semibold">
                <span className="w-6 md:w-10 text-center" style={{ color: agent.colorIn }}>
                  {formatTokens(agent.tokensIn)}
                </span>
                <span className="w-6 md:w-10 text-center" style={{ color: agent.colorOut }}>
                  {formatTokens(agent.tokensOut)}
                </span>
              </div>
              
              {/* Nome agente */}
              <span className="text-[9px] md:text-[10px] text-muted-foreground font-medium">
                {agent.agent}
              </span>
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
    <Card className="mb-4 border border-white/10 bg-background/40 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>📊 Token Usage</span>
          <span className="text-muted-foreground font-normal">
            Totale: {totalTokens.toLocaleString()} token
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <defs>
              <linearGradient id="gradientIn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142, 76%, 70%)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="hsl(142, 76%, 70%)" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="gradientOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(142, 76%, 40%)" stopOpacity={0.9} />
                <stop offset="100%" stopColor="hsl(142, 76%, 40%)" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <XAxis dataKey="agent" />
            <YAxis />
            <Bar 
              dataKey="Token IN" 
              fill="url(#gradientIn)" 
              radius={[8, 8, 0, 0]}
              label={<CustomBarLabel />}
            />
            <Bar 
              dataKey="Token OUT" 
              fill="url(#gradientOut)" 
              radius={[8, 8, 0, 0]}
              label={<CustomBarLabel />}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
