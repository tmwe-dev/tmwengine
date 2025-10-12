// Background Edge Function: Generate Message Summaries
// Genera i riassunti user_friendly e ultra_compressed in background

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper: Generate message summaries
async function generateMessageSummary(
  content: string,
  type: 'user_friendly' | 'ultra_compressed',
  lovableApiKey: string
): Promise<string> {
  const prompts = {
    user_friendly: `Riassumi questo messaggio in max 60 parole, usando linguaggio naturale e NON tecnico. Focus su aspetti pratici e comprensibili:

${content}

Riassunto user-friendly:`,
    ultra_compressed: `Estrai SOLO i concetti tecnici chiave essenziali da questo messaggio in max 25 parole. Formato: "Problema + Soluzione" o "Concetto chiave":

${content}

Riassunto ultra-compresso:`
  };

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompts[type] }
        ],
        temperature: 0.3,
        max_tokens: type === 'user_friendly' ? 100 : 50
      })
    });

    if (!response.ok) {
      throw new Error(`Summary generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || content.substring(0, type === 'user_friendly' ? 200 : 100);
  } catch (error) {
    console.error(`Error generating ${type} summary:`, error);
    return content.substring(0, type === 'user_friendly' ? 200 : 100) + '...';
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId, content, conversationId, table } = await req.json();
    
    console.log(`🔄 [GENERATE-SUMMARIES] Inizio per messageId: ${messageId}`);

    if (!messageId || !content) {
      throw new Error('messageId e content sono obbligatori');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableAIKey = Deno.env.get('LOVABLE_API_KEY')!;

    if (!lovableAIKey) {
      throw new Error('LOVABLE_API_KEY non configurata');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate summaries
    console.log('🔄 Generazione summaries...');
    const [userFriendlySummary, ultraCompressedSummary] = await Promise.all([
      generateMessageSummary(content, 'user_friendly', lovableAIKey),
      generateMessageSummary(content, 'ultra_compressed', lovableAIKey)
    ]);

    console.log('✅ Summaries generate:', {
      userFriendly: userFriendlySummary.substring(0, 50) + '...',
      ultraCompressed: ultraCompressedSummary.substring(0, 30) + '...'
    });

    // Determina quale tabella aggiornare
    const targetTable = table || 'chat_laboratory_messages';

    // Update message with summaries
    const { error: updateError } = await supabase
      .from(targetTable)
      .update({
        content_user_friendly: userFriendlySummary,
        content_summary: ultraCompressedSummary,
        is_summary_available: true
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('❌ Errore aggiornamento messaggio:', updateError);
      throw updateError;
    }

    console.log(`✅ [GENERATE-SUMMARIES] Completato per messageId: ${messageId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        messageId,
        userFriendlySummary: userFriendlySummary.substring(0, 100),
        ultraCompressedSummary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [GENERATE-SUMMARIES] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Errore sconosciuto',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
