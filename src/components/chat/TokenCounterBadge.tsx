import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
      let tableName = '';
      let id = '';
      
      if (variant === 'chat' && conversationId) {
        tableName = 'chat_conversations';
        id = conversationId;
      } else if (variant === 'intranet' && roomId) {
        tableName = 'intranet_rooms';
        id = roomId;
      } else if (variant === 'laboratory' && labConversationId) {
        tableName = 'chat_laboratory_conversations';
        id = labConversationId;
      }
      
      if (!tableName || !id) return;
      
      const { data } = await supabase
        .from(tableName)
        .select('token_count_current, token_count_total')
        .eq('id', id)
        .single();
      
      if (data) {
        setTokenCount(data.token_count_current || 0);
        setTotalTokens(data.token_count_total || 0);
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
    <div className="flex items-center gap-2">
      <Badge variant={isNearLimit ? 'destructive' : 'secondary'} className="gap-2">
        {isNearLimit ? <AlertTriangle className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
        <span className="font-mono">{tokenCount.toLocaleString()}</span>
      </Badge>
      <span className="text-xs text-muted-foreground">
        / {totalTokens.toLocaleString()} totali
      </span>
    </div>
  );
};