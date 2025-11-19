import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PendingAction {
  id: string;
  email_id: string;
  sender_email: string;
  action_type: 'reply' | 'forward' | 'archive' | 'delete' | 'create_task' | 'nothing';
  action_payload: any;
  suggested_response?: string;
  reasoning: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  user_modifications?: any;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export const usePendingActions = () => {
  const queryClient = useQueryClient();

  // Fetch pending actions
  const { data: pendingActions, isLoading } = useQuery({
    queryKey: ['pending-actions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('email_pending_actions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PendingAction[];
    },
  });

  // Approve action
  const approveMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await supabase
        .from('email_pending_actions')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', actionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-actions'] });
      toast.success('✅ Azione approvata');
    },
    onError: (error: any) => {
      toast.error('Errore nell\'approvazione: ' + error.message);
    },
  });

  // Reject action
  const rejectMutation = useMutation({
    mutationFn: async ({ actionId, reason }: { actionId: string; reason?: string }) => {
      const { error } = await supabase
        .from('email_pending_actions')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', actionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-actions'] });
      toast.success('❌ Azione rifiutata');
    },
    onError: (error: any) => {
      toast.error('Errore nel rifiuto: ' + error.message);
    },
  });

  // Update suggested response
  const updateResponseMutation = useMutation({
    mutationFn: async ({ actionId, newResponse }: { actionId: string; newResponse: string }) => {
      const action = pendingActions?.find(a => a.id === actionId);
      const modifications = {
        original: action?.suggested_response,
        modified: newResponse,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('email_pending_actions')
        .update({ 
          suggested_response: newResponse,
          user_modifications: modifications,
          updated_at: new Date().toISOString()
        })
        .eq('id', actionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-actions'] });
      toast.success('✏️ Risposta modificata');
    },
    onError: (error: any) => {
      toast.error('Errore nella modifica: ' + error.message);
    },
  });

  return {
    pendingActions: pendingActions || [],
    isLoading,
    approveAction: approveMutation.mutate,
    rejectAction: rejectMutation.mutate,
    updateResponse: updateResponseMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isUpdating: updateResponseMutation.isPending,
  };
};
