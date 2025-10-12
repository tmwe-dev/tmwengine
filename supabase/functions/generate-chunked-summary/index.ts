import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SummaryChunk {
  messageRange: [number, number];
  summary: string;
  keyPoints: string[];
  participants: string[];
}

interface GenerateChunkedSummaryRequest {
  conversationId: string;
  chunkSize?: number;
  includeAll?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, chunkSize = 50, includeAll = false } = await req.json() as GenerateChunkedSummaryRequest;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Fetch conversation data
    const { data: conversation, error: convError } = await supabaseClient
      .from('chat_laboratory_conversations')
      .select('last_message_summarized, economy_mode')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    // Fetch messages
    const { data: messages, error: msgError } = await supabaseClient
      .from('chat_laboratory_messages')
      .select('id, sender_name, sender_type, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which messages to summarize
    const startIdx = includeAll ? 0 : (conversation?.last_message_summarized || 0);
    const messagesToSummarize = messages.slice(startIdx);

    if (messagesToSummarize.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Already up to date',
          chunks: [],
          finalSummary: ''
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Split into chunks
    const chunks: SummaryChunk[] = [];
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    for (let i = 0; i < messagesToSummarize.length; i += chunkSize) {
      const chunkMessages = messagesToSummarize.slice(i, Math.min(i + chunkSize, messagesToSummarize.length));
      const startMsgIdx = startIdx + i;
      const endMsgIdx = startIdx + i + chunkMessages.length - 1;

      // Build conversation text for this chunk
      const conversationText = chunkMessages
        .map(m => `${m.sender_name}: ${m.content}`)
        .join('\n\n');

      // Get unique participants
      const participants = [...new Set(chunkMessages.map(m => m.sender_name))];

      // Generate summary using Lovable AI
      const summaryPrompt = `Analizza questa conversazione e fornisci:
1. Un riassunto conciso (max 200 parole)
2. I punti chiave principali (max 5 bullet points)

Conversazione:
${conversationText}

Rispondi in formato JSON:
{
  "summary": "riassunto breve",
  "keyPoints": ["punto 1", "punto 2", ...]
}`;

      const summaryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Sei un assistente che crea riassunti precisi e concisi di conversazioni.' },
            { role: 'user', content: summaryPrompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!summaryResponse.ok) {
        console.error('AI summary error:', await summaryResponse.text());
        throw new Error('Failed to generate summary');
      }

      const summaryData = await summaryResponse.json();
      const summaryContent = summaryData.choices[0].message.content;
      
      // Parse JSON from response
      let parsedSummary;
      try {
        parsedSummary = JSON.parse(summaryContent);
      } catch {
        // Fallback if not valid JSON
        parsedSummary = {
          summary: summaryContent,
          keyPoints: []
        };
      }

      chunks.push({
        messageRange: [startMsgIdx, endMsgIdx],
        summary: parsedSummary.summary,
        keyPoints: parsedSummary.keyPoints || [],
        participants
      });
    }

    // Generate final summary combining all chunks
    let finalSummary = '';
    if (chunks.length > 1) {
      const combinedSummaries = chunks.map(c => c.summary).join('\n\n');
      
      const finalPrompt = `Combina questi riassunti parziali in un unico riassunto coerente (max 300 parole):

${combinedSummaries}`;

      const finalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Sei un assistente che combina riassunti in un testo coerente.' },
            { role: 'user', content: finalPrompt }
          ],
          temperature: 0.3,
        }),
      });

      const finalData = await finalResponse.json();
      finalSummary = finalData.choices[0].message.content;
    } else {
      finalSummary = chunks[0]?.summary || '';
    }

    // Update conversation with new summary data
    const { error: updateError } = await supabaseClient
      .from('chat_laboratory_conversations')
      .update({
        summary_chunks: chunks,
        last_summarized_at: new Date().toISOString(),
        last_message_summarized: messages.length,
        riassunto_contesto: finalSummary
      })
      .eq('id', conversationId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        chunks,
        finalSummary,
        messagesSummarized: messagesToSummarize.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-chunked-summary:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});