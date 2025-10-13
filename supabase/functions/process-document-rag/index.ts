import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessDocumentRequest {
  fileUrl: string;
  fileName: string;
  fileType: string;
  conversationId?: string;
  roomId?: string;
  labConversationId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[RAG] Processing document upload');
    
    const { fileUrl, fileName, fileType, conversationId, roomId, labConversationId }: ProcessDocumentRequest = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Scarica il file da Supabase Storage
    console.log(`[RAG] Downloading file: ${fileUrl}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('chat-attachments')
      .download(fileUrl);

    if (downloadError) {
      console.error('[RAG] Download error:', downloadError);
      throw new Error(`Download failed: ${downloadError.message}`);
    }

    // 2. Estrai testo dal file
    console.log('[RAG] Extracting text from file');
    const fileText = await extractTextFromFile(fileData, fileType);

    // 3. Chunking: Dividi il testo in chunk di ~500 parole
    console.log('[RAG] Chunking text');
    const chunks = chunkText(fileText, 500);
    console.log(`[RAG] Created ${chunks.length} chunks`);

    // 4. Recupera la chiave OpenAI dal database
    const { data: configData, error: configError } = await supabase
      .from('config_ai')
      .select('api_key')
      .eq('provider', 'openai')
      .single();

    if (configError || !configData?.api_key) {
      console.error('[RAG] Errore recupero chiave OpenAI:', configError);
      throw new Error('OPENAI_API_KEY non configurata nella tabella config_ai');
    }

    const openaiApiKey = configData.api_key;

    // 5. Genera embeddings per ogni chunk

    console.log('[RAG] Generating embeddings');
    const embeddingsPromises = chunks.map(async (chunkText, index) => {
      const embedding = await generateEmbedding(chunkText, openaiApiKey);
      return {
        file_name: fileName,
        file_type: fileType,
        chunk_index: index,
        chunk_text: chunkText,
        embedding: embedding,
        conversation_id: conversationId || null,
        room_id: roomId || null,
        lab_conversation_id: labConversationId || null,
        metadata: { page: Math.floor(index / 2) }
      };
    });

    const chunksWithEmbeddings = await Promise.all(embeddingsPromises);

    // 5. Salva chunks nel database
    console.log('[RAG] Saving chunks to database');
    const { error: insertError } = await supabase
      .from('document_chunks')
      .insert(chunksWithEmbeddings);

    if (insertError) {
      console.error('[RAG] Insert error:', insertError);
      throw insertError;
    }

    console.log(`[RAG] Successfully indexed document: ${fileName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunksProcessed: chunks.length,
        message: `Documento "${fileName}" indicizzato con successo (${chunks.length} chunks)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[RAG] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ===== HELPER FUNCTIONS =====

async function extractTextFromFile(fileData: Blob, fileType: string): Promise<string> {
  const text = await fileData.text();
  
  // TODO: Implementare parsing specifico per PDF, DOCX, etc.
  // Per ora supporta solo testo plain
  if (fileType === 'text/plain' || fileType === 'text/markdown') {
    return text;
  }
  
  // Per altri formati, ritorna testo grezzo (migliorare in futuro)
  return text;
}

function chunkText(text: string, wordsPerChunk: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
  }
  
  return chunks;
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small', // 768 dimensioni
      input: text
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[RAG] Embedding API error:', errorText);
    throw new Error(`Embedding generation failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
