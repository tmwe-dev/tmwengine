import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConvergenceMetrics {
  A: number; // Agreement ratio
  C: number; // Contradiction rate
  P: number; // Progress coverage
  level: 'diverging' | 'converging' | 'lock';
  details: {
    totalMessages: number;
    proposalCount: number;
    critiqueCount: number;
    voteCount: number;
    agreementVotes: number;
    totalVotes: number;
    summaryAvailable: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, windowSize = 20 } = await req.json();

    if (!conversationId) {
      throw new Error('conversationId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recent messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_laboratory_messages')
      .select('intent_tags, content, is_summary_available')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(windowSize);

    if (messagesError) throw messagesError;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({
          A: 0,
          C: 0,
          P: 0,
          level: 'diverging',
          details: {
            totalMessages: 0,
            proposalCount: 0,
            critiqueCount: 0,
            voteCount: 0,
            agreementVotes: 0,
            totalVotes: 0,
            summaryAvailable: false
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count intent types
    let proposalCount = 0;
    let critiqueCount = 0;
    let voteCount = 0;
    let agreementVotes = 0; // Votes without "Block" or strong critique
    let summaryCount = 0;

    messages.forEach(msg => {
      const intents = msg.intent_tags || [];
      
      if (intents.includes('Proposal')) proposalCount++;
      if (intents.includes('Critique')) critiqueCount++;
      if (intents.includes('Vote')) {
        voteCount++;
        // Simple heuristic: if no critique in same message, count as agreement
        if (!intents.includes('Critique') && !msg.content?.toLowerCase().includes('block')) {
          agreementVotes++;
        }
      }
      if (intents.includes('Summarize') || msg.is_summary_available) summaryCount++;
    });

    // Calculate metrics
    const A = voteCount > 0 ? agreementVotes / voteCount : 0;
    const C = (proposalCount + critiqueCount) > 0 
      ? critiqueCount / (proposalCount + critiqueCount) 
      : 0;
    const P = summaryCount > 0 ? Math.min(summaryCount / 3, 1) : 0; // 3+ summaries = good progress

    // Determine convergence level
    let level: 'diverging' | 'converging' | 'lock' = 'diverging';
    
    // Lock: strong agreement + low contradiction + good progress
    if (A >= 0.75 && C <= 0.15 && P >= 0.85) {
      level = 'lock';
    } 
    // Converging: moderate thresholds
    else if (A >= 0.65 && C <= 0.2 && P >= 0.6) {
      level = 'converging';
    }

    const metrics: ConvergenceMetrics = {
      A: parseFloat(A.toFixed(3)),
      C: parseFloat(C.toFixed(3)),
      P: parseFloat(P.toFixed(3)),
      level,
      details: {
        totalMessages: messages.length,
        proposalCount,
        critiqueCount,
        voteCount,
        agreementVotes,
        totalVotes: voteCount,
        summaryAvailable: summaryCount > 0
      }
    };

    // Update conversation with metrics
    const { error: updateError } = await supabase
      .from('chat_laboratory_conversations')
      .update({ convergence_metrics: metrics })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error updating convergence metrics:', updateError);
    }

    return new Response(
      JSON.stringify(metrics),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating convergence:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});