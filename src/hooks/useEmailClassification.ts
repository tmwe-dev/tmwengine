/**
 * useEmailClassification - Email Classification Hook
 * 
 * ✅ Handles AI classification of individual emails
 * ✅ Saves results to tmwe_classifications
 * ✅ Supports batch operations with queue
 * 
 * PROTECTED: Uses ClassificationApi (do not modify)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClassificationApi, CreateClassificationParams, TMWEClassification } from '@/lib/tmwe/api/ClassificationApi';
import { supabase } from '@/integrations/supabase/client';
import { useState, useCallback } from 'react';

export interface EmailToClassify {
  tmwe_email_id: number;
  subject: string;
  from_email: string;
  body_preview?: string;
}

export interface ClassificationResult {
  success: boolean;
  classification?: TMWEClassification | null;
  error?: string;
}

interface AIClassificationResponse {
  success: boolean;
  group_name?: string;
  group_type?: string;
  confidence?: number;
  reasoning?: string;
  model?: string;
  error?: string;
}

/**
 * Hook for classifying emails using AI
 */
export const useEmailClassification = (userEmail: string | null) => {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<EmailToClassify[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  /**
   * Call AI classification edge function
   */
  const callAIClassification = async (email: EmailToClassify): Promise<AIClassificationResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke('tmwe-email-ai-classify', {
        body: {
          email_id: email.tmwe_email_id,
          subject: email.subject,
          from_email: email.from_email,
          body_preview: email.body_preview,
          user_email: userEmail,
        },
      });

      if (error) {
        console.error('❌ [Classification] AI call failed:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        group_name: data?.group_name || 'General',
        group_type: data?.group_type || 'auto',
        confidence: data?.confidence,
        reasoning: data?.reasoning,
        model: data?.model || 'gpt-4o-mini',
      };
    } catch (error: any) {
      console.error('🔥 [Classification] Request failed:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Classify a single email
   */
  const classifyMutation = useMutation({
    mutationFn: async (email: EmailToClassify): Promise<ClassificationResult> => {
      if (!userEmail) {
        return { success: false, error: 'User email not available' };
      }

      // Check if already classified
      const existing = await ClassificationApi.getByEmailId(email.tmwe_email_id, userEmail);
      if (existing) {
        console.log('⏭️ [Classification] Already classified:', email.tmwe_email_id);
        return { success: true, classification: existing };
      }

      // Get AI classification
      const aiResult = await callAIClassification(email);
      if (!aiResult.success) {
        return { success: false, error: aiResult.error };
      }

      // Save to database
      const params: CreateClassificationParams = {
        tmwe_email_id: email.tmwe_email_id,
        user_email: userEmail,
        sender_email: email.from_email,
        subject: email.subject,
        group_name: aiResult.group_name!,
        group_type: aiResult.group_type!,
        ai_model: aiResult.model!,
        confidence: aiResult.confidence,
        reasoning: aiResult.reasoning,
      };

      const classification = await ClassificationApi.create(params);
      
      if (!classification) {
        return { success: false, error: 'Failed to save classification' };
      }

      console.log('✅ [Classification] Saved:', {
        email_id: email.tmwe_email_id,
        group: classification.group_name,
        confidence: classification.confidence,
      });

      return { success: true, classification };
    },
    onSuccess: () => {
      // Invalidate classifications cache
      queryClient.invalidateQueries({ queryKey: ['tmwe-classifications'] });
    },
  });

  /**
   * Add emails to classification queue
   */
  const addToQueue = useCallback((emails: EmailToClassify[]) => {
    setQueue(prev => {
      const existingIds = new Set(prev.map(e => e.tmwe_email_id));
      const newEmails = emails.filter(e => !existingIds.has(e.tmwe_email_id));
      return [...prev, ...newEmails];
    });
  }, []);

  /**
   * Process the classification queue
   */
  const processQueue = useCallback(async () => {
    if (processing || queue.length === 0 || !userEmail) return;

    setProcessing(true);
    setProcessedCount(0);

    const BATCH_SIZE = 3; // Process 3 at a time
    const toProcess = [...queue];
    setQueue([]);

    try {
      for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
        const batch = toProcess.slice(i, i + BATCH_SIZE);
        
        await Promise.all(
          batch.map(async (email) => {
            try {
              await classifyMutation.mutateAsync(email);
              setProcessedCount(prev => prev + 1);
            } catch (error) {
              console.warn('⚠️ [Classification] Batch item failed:', email.tmwe_email_id);
            }
          })
        );

        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < toProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } finally {
      setProcessing(false);
      // Refresh classifications after batch completes
      queryClient.invalidateQueries({ queryKey: ['tmwe-classifications'] });
    }
  }, [processing, queue, userEmail, classifyMutation, queryClient]);

  /**
   * Clear the queue
   */
  const clearQueue = useCallback(() => {
    setQueue([]);
    setProcessedCount(0);
  }, []);

  /**
   * Get classification for a specific email
   */
  const getClassification = useCallback(async (tmwe_email_id: number): Promise<TMWEClassification | null> => {
    if (!userEmail) return null;
    return ClassificationApi.getByEmailId(tmwe_email_id, userEmail);
  }, [userEmail]);

  /**
   * Update classification manually
   */
  const updateClassification = useMutation({
    mutationFn: async ({ 
      tmwe_email_id, 
      group_name, 
      group_color 
    }: { 
      tmwe_email_id: number; 
      group_name: string; 
      group_color?: string; 
    }) => {
      if (!userEmail) throw new Error('User email not available');
      
      const success = await ClassificationApi.update(tmwe_email_id, userEmail, {
        group_name,
        group_color,
        is_manual_override: true,
      });

      if (!success) throw new Error('Failed to update classification');
      return { tmwe_email_id, group_name, group_color };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tmwe-classifications'] });
    },
  });

  return {
    // Single classification
    classifyEmail: classifyMutation.mutate,
    classifyEmailAsync: classifyMutation.mutateAsync,
    isClassifying: classifyMutation.isPending,
    
    // Queue operations
    queue,
    queueLength: queue.length,
    addToQueue,
    processQueue,
    clearQueue,
    isProcessingQueue: processing,
    processedCount,
    
    // Manual operations
    updateClassification: updateClassification.mutate,
    isUpdating: updateClassification.isPending,
    
    // Utilities
    getClassification,
  };
};
