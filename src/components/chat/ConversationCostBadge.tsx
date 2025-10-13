import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Euro } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ConversationCostBadgeProps {
  conversationId?: string;
  roomId?: string;
  labConversationId?: string;
}

export const ConversationCostBadge = ({ 
  conversationId, 
  roomId, 
  labConversationId 
}: ConversationCostBadgeProps) => {
  const [totalCost, setTotalCost] = useState(0);
  
  useEffect(() => {
    const fetchCost = async () => {
      let filter = '';
      if (conversationId) filter = `conversation_id.eq.${conversationId}`;
      else if (roomId) filter = `room_id.eq.${roomId}`;
      else if (labConversationId) filter = `lab_conversation_id.eq.${labConversationId}`;
      
      if (!filter) return;
      
      const { data } = await supabase
        .from('ai_cost_tracking')
        .select('cost_total_eur')
        .or(filter);
      
      if (data) {
        const sum = data.reduce((acc, row) => acc + (Number(row.cost_total_eur) || 0), 0);
        setTotalCost(sum);
      }
    };
    
    fetchCost();
    
    const channel = supabase
      .channel('cost-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_cost_tracking'
      }, () => {
        fetchCost();
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, roomId, labConversationId]);
  
  if (totalCost === 0) return null;
  
  return (
    <Badge variant="outline" className="gap-2">
      <Euro className="h-3 w-3" />
      €{totalCost.toFixed(4)}
    </Badge>
  );
};