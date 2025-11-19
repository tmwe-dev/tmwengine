// Email AI Learning System - INCREMENTO 10
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import {
  recordFeedback,
  updatePerformanceMetrics,
  getAdaptiveConfidence,
  suggestPromptImprovements,
  type FeedbackData,
} from '../_shared/learning-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { operation, ...params } = await req.json();

    console.log(`📊 Learning operation: ${operation}`, params);

    switch (operation) {
      case 'record_feedback': {
        const feedbackData: FeedbackData = {
          user_id: user.id,
          email_id: params.email_id,
          action_type: params.action_type,
          ai_suggestion: params.ai_suggestion,
          user_feedback: params.user_feedback,
          user_correction: params.user_correction,
          confidence_score: params.confidence_score,
          sender_email: params.sender_email,
          email_category: params.email_category,
          feedback_notes: params.feedback_notes,
        };

        const result = await recordFeedback(supabase, feedbackData);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'calculate_metrics': {
        await updatePerformanceMetrics(
          supabase,
          user.id,
          params.sender_email,
          params.category
        );
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_adaptive_threshold': {
        const threshold = await getAdaptiveConfidence(
          supabase,
          user.id,
          params.sender_email,
          params.category
        );
        return new Response(
          JSON.stringify({ threshold }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'suggest_improvements': {
        const suggestions = await suggestPromptImprovements(supabase, user.id);
        return new Response(
          JSON.stringify({ suggestions }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown operation' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: any) {
    console.error('❌ Learning system error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
