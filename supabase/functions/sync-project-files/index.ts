// SYNC PROJECT FILES TO DATABASE (PAYLOAD VERSION)
// Riceve snapshot files dal client e li salva nel DB per accesso Albert
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { files } = await req.json();

    if (!files || !Array.isArray(files)) {
      return new Response(
        JSON.stringify({ error: 'Payload "files" array mancante' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 [SYNC] Inizio sincronizzazione ${files.length} file da payload...`);

    // Pulisci tabella esistente
    console.log('🗑️ Elimino file esistenti...');
    await supabaseClient
      .from('project_source_files')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Inserisci nuovi file in batch
    const batchSize = 50;
    let totalInserted = 0;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      const { error } = await supabaseClient
        .from('project_source_files')
        .insert(batch);

      if (error) {
        console.error(`❌ Errore insert batch ${i}-${i + batch.length}:`, error);
        throw error;
      }

      totalInserted += batch.length;
      console.log(`   💾 Batch ${i + 1}-${i + batch.length} salvato (${totalInserted}/${files.length})`);
    }

    console.log(`✅ Sincronizzazione completata: ${totalInserted} file inseriti`);

    return new Response(
      JSON.stringify({
        success: true,
        filesProcessed: totalInserted,
        message: `Sincronizzazione completata: ${totalInserted} file inseriti`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ [SYNC] Errore:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============ HELPER FUNCTIONS ============

function extractImports(content: string): string[] {
  const matches = content.match(/^import .+ from ['"](.+)['"];?$/gm) || [];
  return matches.map(m => m.trim()).slice(0, 20); // Max 20 imports
}

function extractExports(content: string): string[] {
  const matches = content.match(/^export (const|function|class|interface|type|default) (\w+)/gm) || [];
  return matches.map(m => {
    const parts = m.split(' ');
    return parts[parts.length - 1];
  }).slice(0, 20); // Max 20 exports
}
