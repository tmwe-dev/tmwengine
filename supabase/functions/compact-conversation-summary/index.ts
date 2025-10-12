import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompactRequest {
  conversationId?: string;
  roomId?: string;
  labConversationId?: string;
  variant: 'chat' | 'intranet' | 'laboratory';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Compact] Processing compaction request');
    
    const { conversationId, roomId, labConversationId, variant }: CompactRequest = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('[Compact] LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // 1. Recupera riassunto attuale
    let currentSummary = '';
    let tableName = '';
    let idField = '';
    let idValue = '';

    if (variant === 'chat') {
      tableName = 'chat_conversations';
      idField = 'id';
      idValue = conversationId!;
      const { data } = await supabase
        .from('chat_conversations')
        .select('riassunto_contesto')
        .eq('id', conversationId)
        .single();
      currentSummary = data?.riassunto_contesto || '';
    } else if (variant === 'intranet') {
      tableName = 'intranet_rooms';
      idField = 'id';
      idValue = roomId!;
      const { data } = await supabase
        .from('intranet_rooms')
        .select('riassunto_contesto')
        .eq('id', roomId)
        .single();
      currentSummary = data?.riassunto_contesto || '';
    } else if (variant === 'laboratory') {
      tableName = 'chat_laboratory_conversations';
      idField = 'id';
      idValue = labConversationId!;
      const { data } = await supabase
        .from('chat_laboratory_conversations')
        .select('riassunto_contesto')
        .eq('id', labConversationId)
        .single();
      currentSummary = data?.riassunto_contesto || '';
    }

    if (!currentSummary) {
      console.log('[Compact] No summary to compact');
      return new Response(
        JSON.stringify({ error: 'No summary to compact' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Compact] Current summary length: ${currentSummary.length} chars`);

    // 2. Ricompatta usando Lovable AI
    const compactedSummary = await compactSummary(currentSummary, lovableApiKey);
    console.log(`[Compact] Compacted summary length: ${compactedSummary.length} chars`);

    // 3. Salva riassunto compattato
    await supabase
      .from(tableName)
      .update({ riassunto_contesto: compactedSummary })
      .eq(idField, idValue);

    // 4. Reset token counter
    await supabase.rpc('reset_token_count', {
      p_table: tableName,
      p_id: idValue
    });

    console.log('[Compact] Compaction completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        originalLength: currentSummary.length,
        compactedLength: compactedSummary.length,
        compressionRatio: (compactedSummary.length / currentSummary.length * 100).toFixed(2) + '%'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Compact] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function compactSummary(fullSummary: string, apiKey: string): Promise<string> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{
        role: 'user',
        content: `Riassumi questa cronologia di conversazione mantenendo TUTTI i concetti chiave essenziali in max 500 parole:

${fullSummary}

Riassunto compatto ma completo:`
      }],
      temperature: 0.3,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Compact] API error:', errorText);
    throw new Error(`Compaction failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim() || fullSummary;
}
