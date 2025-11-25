import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { originalMessage, mode = 'standard' } = await req.json();

    if (!originalMessage || originalMessage.length < 100) {
      return new Response(
        JSON.stringify({ 
          summary: originalMessage,
          tokenReduction: 0,
          originalLength: originalMessage?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect and preserve code blocks
    const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
    const codeBlocks: string[] = [];
    let messageWithPlaceholders = originalMessage.replace(codeBlockRegex, (match) => {
      const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
      codeBlocks.push(match);
      return placeholder;
    });

    // Generate summary
    const summaryPrompt = `Riassumi questo messaggio in max 150 parole preservando:
- Domande chiave
- Concetti tecnici essenziali
- Tutti i placeholder ___CODE_BLOCK_X___ (NON modificarli)
- Numeri e dati specifici

Messaggio originale:
${messageWithPlaceholders}

Riassunto conciso:`;

    console.log('📝 Generating summary...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: summaryPrompt }],
        max_completion_tokens: 250
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let summary = data.choices[0].message.content.trim();

    // Restore code blocks
    codeBlocks.forEach((code, index) => {
      summary = summary.replace(`___CODE_BLOCK_${index}___`, code);
    });

    const originalLength = originalMessage.length;
    const summaryLength = summary.length;
    const tokenReduction = Math.round(((originalLength - summaryLength) / originalLength) * 100);

    console.log(`✅ Summary generated: ${originalLength} → ${summaryLength} chars (-${tokenReduction}%)`);

    return new Response(
      JSON.stringify({ 
        summary,
        originalLength,
        summaryLength,
        tokenReduction,
        codeBlocksPreserved: codeBlocks.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in summarize-user-message:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        summary: null
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
