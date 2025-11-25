// BACKUP: 2025-11-25 - search-document-embeddings
// Motivo: Limpieza de funciones sin uso en producción
// Rollback: cp docs/EDGE_FUNCTIONS_BACKUP/2025-11-25/search-document-embeddings-backup.ts supabase/functions/search-document-embeddings/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  conversationId?: string;
  roomId?: string;
  labConversationId?: string;
  matchThreshold?: number;
  matchCount?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[RAG Search] Processing search request');
    
    const { 
      query, 
      conversationId, 
      roomId, 
      labConversationId,
      matchThreshold = 0.7,
      matchCount = 5
    }: SearchRequest = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Leggi API key dal database CRM (config_ai)
    const { data: aiConfig, error: configError } = await supabase
      .from('config_ai')
      .select('api_key')
      .eq('provider', 'openai')
      .eq('attivo', true)
      .single();

    if (configError || !aiConfig?.api_key) {
      console.error('[RAG Search] OpenAI API key non trovata in config_ai:', configError);
      throw new Error('OpenAI API key non configurata nel CRM');
    }

    const openaiApiKey = aiConfig.api_key;

    // 1. Genera embedding della query
    console.log('[RAG Search] Generating query embedding');
    const queryEmbedding = await generateEmbedding(query, openaiApiKey);

    // 2. Cerca chunks simili nel database
    console.log('[RAG Search] Searching for similar chunks');
    const { data: results, error } = await supabase.rpc('search_document_chunks', {
      p_query_embedding: `[${queryEmbedding.join(',')}]`,
      p_conversation_id: conversationId || null,
      p_room_id: roomId || null,
      p_lab_conversation_id: labConversationId || null,
      p_match_threshold: matchThreshold,
      p_match_count: matchCount
    });

    if (error) {
      console.error('[RAG Search] Search error:', error);
      throw error;
    }

    console.log(`[RAG Search] Found ${results?.length || 0} matching chunks`);

    return new Response(
      JSON.stringify({ 
        success: true,
        results: results || [],
        count: results?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[RAG Search] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[RAG Search] Embedding API error:', errorText);
    throw new Error(`Embedding generation failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
