import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LearningMetrics {
  classification_accuracy?: number;
  action_accuracy?: number;
  auto_execute_success_rate?: number;
  problematic_senders: number;
  total_feedback_count: number;
}

export const useLearningMetrics = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['learning-metrics-summary'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get overall metrics
      const { data: performanceMetrics } = await supabase
        .from('email_ai_performance_metrics')
        .select('*')
        .eq('user_id', user.id);

      // Get feedback count
      const { count: feedbackCount } = await supabase
        .from('email_ai_learning_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const classification = performanceMetrics?.find(
        (m) => m.metric_type === 'classification_accuracy' && m.context_key === 'overall'
      );

      const action = performanceMetrics?.find(
        (m) => m.metric_type === 'action_accuracy' && m.context_key === 'overall'
      );

      const senderMetrics = performanceMetrics?.filter((m) => m.metric_type === 'sender_accuracy') || [];
      const problematicSenders = senderMetrics.filter(
        (m) => m.accuracy_rate < 70 && m.total_actions >= 3
      );

      return {
        classification_accuracy: classification?.accuracy_rate,
        action_accuracy: action?.accuracy_rate,
        auto_execute_success_rate: action?.accuracy_rate, // Approximate
        problematic_senders: problematicSenders.length,
        total_feedback_count: feedbackCount || 0,
      } as LearningMetrics;
    },
  });

  return {
    metrics,
    isLoading,
  };
};
