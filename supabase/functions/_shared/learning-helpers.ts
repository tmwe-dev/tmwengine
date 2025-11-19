// Learning System Helpers - INCREMENTO 10
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

export interface FeedbackData {
  user_id: string;
  email_id: string;
  action_type: 'classification' | 'action_decision' | 'auto_execute';
  ai_suggestion: string;
  user_feedback: 'approved' | 'rejected' | 'modified';
  user_correction?: string;
  confidence_score?: number;
  sender_email?: string;
  email_category?: string;
  feedback_notes?: string;
}

export interface PerformanceMetrics {
  user_id: string;
  metric_type: 'classification_accuracy' | 'action_accuracy' | 'sender_accuracy';
  context_key?: string;
  total_actions: number;
  approved_actions: number;
  rejected_actions: number;
  accuracy_rate: number;
  avg_confidence: number;
}

/**
 * Record user feedback on AI action
 */
export async function recordFeedback(
  supabase: SupabaseClient,
  feedback: FeedbackData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('email_ai_learning_feedback')
      .insert(feedback);

    if (error) throw error;

    // Trigger metrics update asynchronously
    await updatePerformanceMetrics(supabase, feedback.user_id, feedback.sender_email, feedback.email_category);

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error recording feedback:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update performance metrics cache based on recent feedback
 */
export async function updatePerformanceMetrics(
  supabase: SupabaseClient,
  userId: string,
  senderEmail?: string,
  category?: string
): Promise<void> {
  try {
    // Update overall classification accuracy
    const { data: classificationStats } = await supabase
      .from('email_ai_learning_feedback')
      .select('user_feedback, confidence_score')
      .eq('user_id', userId)
      .eq('action_type', 'classification');

    if (classificationStats && classificationStats.length > 0) {
      const totalClassifications = classificationStats.length;
      const approvedClassifications = classificationStats.filter(
        (f: any) => f.user_feedback === 'approved'
      ).length;
      const accuracyRate = (approvedClassifications / totalClassifications) * 100;
      const avgConfidence =
        classificationStats.reduce((sum: number, f: any) => sum + (f.confidence_score || 0), 0) /
        totalClassifications;

      await supabase
        .from('email_ai_performance_metrics')
        .upsert({
          user_id: userId,
          metric_type: 'classification_accuracy',
          context_key: 'overall',
          total_actions: totalClassifications,
          approved_actions: approvedClassifications,
          rejected_actions: totalClassifications - approvedClassifications,
          accuracy_rate: accuracyRate,
          avg_confidence: avgConfidence,
          last_updated: new Date().toISOString(),
        });
    }

    // Update sender-specific accuracy if sender provided
    if (senderEmail) {
      const { data: senderStats } = await supabase
        .from('email_ai_learning_feedback')
        .select('user_feedback, confidence_score')
        .eq('user_id', userId)
        .eq('sender_email', senderEmail);

      if (senderStats && senderStats.length > 0) {
        const totalSenderActions = senderStats.length;
        const approvedSenderActions = senderStats.filter(
          (f: any) => f.user_feedback === 'approved'
        ).length;
        const senderAccuracy = (approvedSenderActions / totalSenderActions) * 100;
        const senderConfidence =
          senderStats.reduce((sum: number, f: any) => sum + (f.confidence_score || 0), 0) /
          totalSenderActions;

        await supabase
          .from('email_ai_performance_metrics')
          .upsert({
            user_id: userId,
            metric_type: 'sender_accuracy',
            context_key: senderEmail,
            total_actions: totalSenderActions,
            approved_actions: approvedSenderActions,
            rejected_actions: totalSenderActions - approvedSenderActions,
            accuracy_rate: senderAccuracy,
            avg_confidence: senderConfidence,
            last_updated: new Date().toISOString(),
          });
      }
    }

    // Update action decision accuracy
    const { data: actionStats } = await supabase
      .from('email_ai_learning_feedback')
      .select('user_feedback, confidence_score')
      .eq('user_id', userId)
      .eq('action_type', 'action_decision');

    if (actionStats && actionStats.length > 0) {
      const totalActions = actionStats.length;
      const approvedActions = actionStats.filter(
        (f: any) => f.user_feedback === 'approved'
      ).length;
      const actionAccuracy = (approvedActions / totalActions) * 100;
      const actionConfidence =
        actionStats.reduce((sum: number, f: any) => sum + (f.confidence_score || 0), 0) /
        totalActions;

      await supabase
        .from('email_ai_performance_metrics')
        .upsert({
          user_id: userId,
          metric_type: 'action_accuracy',
          context_key: 'overall',
          total_actions: totalActions,
          approved_actions: approvedActions,
          rejected_actions: totalActions - approvedActions,
          accuracy_rate: actionAccuracy,
          avg_confidence: actionConfidence,
          last_updated: new Date().toISOString(),
        });
    }

    console.log('✅ Performance metrics updated');
  } catch (error) {
    console.error('❌ Error updating metrics:', error);
  }
}

/**
 * Get adaptive confidence threshold based on sender/category performance
 */
export async function getAdaptiveConfidence(
  supabase: SupabaseClient,
  userId: string,
  senderEmail?: string,
  category?: string
): Promise<number> {
  try {
    // Default threshold
    let threshold = 0.75;

    // Check sender-specific performance
    if (senderEmail) {
      const { data: senderMetrics } = await supabase
        .from('email_ai_performance_metrics')
        .select('accuracy_rate, total_actions')
        .eq('user_id', userId)
        .eq('metric_type', 'sender_accuracy')
        .eq('context_key', senderEmail)
        .single();

      if (senderMetrics && senderMetrics.total_actions >= 5) {
        // Adjust threshold based on sender accuracy
        if (senderMetrics.accuracy_rate < 70) {
          threshold = 0.90; // Require higher confidence for problematic senders
        } else if (senderMetrics.accuracy_rate > 85) {
          threshold = 0.65; // Lower threshold for reliable senders
        }
      }
    }

    // Check overall action accuracy
    const { data: overallMetrics } = await supabase
      .from('email_ai_performance_metrics')
      .select('accuracy_rate')
      .eq('user_id', userId)
      .eq('metric_type', 'action_accuracy')
      .eq('context_key', 'overall')
      .single();

    if (overallMetrics) {
      if (overallMetrics.accuracy_rate < 75) {
        threshold = Math.max(threshold, 0.85); // Increase threshold if overall accuracy is low
      }
    }

    console.log(`📊 Adaptive confidence threshold: ${threshold} (sender: ${senderEmail})`);
    return threshold;
  } catch (error) {
    console.error('❌ Error getting adaptive confidence:', error);
    return 0.75; // Default
  }
}

/**
 * Suggest prompt improvements based on negative feedback patterns
 */
export async function suggestPromptImprovements(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  try {
    const suggestions: string[] = [];

    // Get categories with low accuracy
    const { data: lowAccuracyCategories } = await supabase
      .from('email_ai_performance_metrics')
      .select('context_key, accuracy_rate, total_actions')
      .eq('user_id', userId)
      .eq('metric_type', 'classification_accuracy')
      .lt('accuracy_rate', 75)
      .gte('total_actions', 5);

    if (lowAccuracyCategories) {
      for (const category of lowAccuracyCategories) {
        suggestions.push(
          `📝 Category "${category.context_key}" has ${category.accuracy_rate.toFixed(1)}% accuracy. Consider rephrasing the classification prompt.`
        );
      }
    }

    // Get senders with low accuracy
    const { data: problematicSenders } = await supabase
      .from('email_ai_performance_metrics')
      .select('context_key, accuracy_rate, total_actions')
      .eq('user_id', userId)
      .eq('metric_type', 'sender_accuracy')
      .lt('accuracy_rate', 70)
      .gte('total_actions', 3);

    if (problematicSenders) {
      for (const sender of problematicSenders) {
        suggestions.push(
          `👤 Sender "${sender.context_key}" has ${sender.accuracy_rate.toFixed(1)}% accuracy. Consider creating a custom rule.`
        );
      }
    }

    // Get recent rejections for specific patterns
    const { data: recentRejections } = await supabase
      .from('email_ai_learning_feedback')
      .select('ai_suggestion, user_correction, feedback_notes')
      .eq('user_id', userId)
      .eq('user_feedback', 'rejected')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentRejections && recentRejections.length > 5) {
      suggestions.push(
        `⚠️ ${recentRejections.length} rejections in recent history. Review feedback notes for common issues.`
      );
    }

    return suggestions;
  } catch (error) {
    console.error('❌ Error suggesting improvements:', error);
    return [];
  }
}
