import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TokenUsageChartProps {
  conversationId: string;
}

export function TokenUsageChart({ conversationId }: TokenUsageChartProps) {
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
  }

  if (tokenData.length === 0) return null;

  const totalTokens = tokenData.reduce((sum, d) => sum + d.tokens, 0);

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
