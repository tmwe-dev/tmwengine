import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TokenKeyIndicator } from '@/components/ui/token-key-indicator';

interface TokenCounterBadgeProps {
  conversationId?: string;
  roomId?: string;
  labConversationId?: string;
  variant: 'chat' | 'intranet' | 'laboratory';
  alertThreshold?: number;
}

export const TokenCounterBadge = ({ 
  conversationId, 
  roomId, 
  labConversationId, 
  variant, 
  alertThreshold = 15000 
}: TokenCounterBadgeProps) => {
  const [tokenCount, setTokenCount] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  
  useEffect(() => {
    const fetchTokens = async () => {
      if (variant === 'chat' && conversationId) {
        const { data } = await supabase
          .from('chat_conversations')
          .select('token_count_current, token_count_total')
          .eq('id', conversationId)
          .single();
        
        if (data) {
          setTokenCount(data.token_count_current || 0);
          setTotalTokens(data.token_count_total || 0);
        }
      } else if (variant === 'intranet' && roomId) {
        const { data } = await supabase
          .from('intranet_rooms')
          .select('token_count_current, token_count_total')
          .eq('id', roomId)
          .single();
        
        if (data) {
          setTokenCount(data.token_count_current || 0);
          setTotalTokens(data.token_count_total || 0);
        }
      } else if (variant === 'laboratory' && labConversationId) {
        const { data } = await supabase
          .from('chat_laboratory_conversations')
          .select('token_count_current, token_count_total')
          .eq('id', labConversationId)
          .single();
        
        if (data) {
          setTokenCount(data.token_count_current || 0);
          setTotalTokens(data.token_count_total || 0);
        }
      }
    };
    
    fetchTokens();
    
    const tableMap = {
      chat: 'chat_conversations',
      intranet: 'intranet_rooms',
      laboratory: 'chat_laboratory_conversations'
    };
    
    const channel = supabase
      .channel('token-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: tableMap[variant],
        filter: `id=eq.${conversationId || roomId || labConversationId}`
      }, (payload) => {
        setTokenCount(payload.new.token_count_current || 0);
        setTotalTokens(payload.new.token_count_total || 0);
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, roomId, labConversationId, variant]);
  
  const isNearLimit = tokenCount >= alertThreshold;
  
  return (
    <div className="flex items-center gap-3">
      {isNearLimit && <AlertTriangle className="h-4 w-4 text-destructive" />}
      <TokenKeyIndicator tokenCount={tokenCount} variant="current" />
      <span className="text-xs text-muted-foreground">/</span>
      <TokenKeyIndicator tokenCount={totalTokens} variant="total" />
    </div>
  );
};