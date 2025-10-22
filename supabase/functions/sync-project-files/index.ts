// SYNC PROJECT FILES TO DATABASE
// Scansiona src/, supabase/functions/, docs/ e salva nel DB per accesso Albert
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

    console.log('🔄 [SYNC] Inizio sincronizzazione file progetto...');

    const filesToSync: any[] = [];
    const foldersToScan = ['src', 'supabase/functions', 'docs'];
    const validExtensions = ['.tsx', '.ts', '.json', '.md', '.sql', '.toml'];

    // Funzione ricorsiva per scansione
    async function scanDirectory(dirPath: string) {
      try {
        for await (const entry of Deno.readDir(dirPath)) {
          const fullPath = `${dirPath}/${entry.name}`;
          
          // Skip node_modules, .git, build artifacts
          if (
            entry.name.startsWith('.') || 
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === 'build'
          ) {
            continue;
          }

          if (entry.isDirectory) {
            await scanDirectory(fullPath);
          } else if (entry.isFile) {
            const ext = entry.name.substring(entry.name.lastIndexOf('.'));
            
            if (validExtensions.includes(ext)) {
              try {
                const content = await Deno.readTextFile(fullPath);
                const lineCount = content.split('\n').length;
                
                // Estrai metadata base
                const imports = extractImports(content);
                const exports = extractExports(content);
                const hasHooks = /use[A-Z]\w+/.test(content);
                const hasSupabaseQueries = /supabase\.(from|rpc|functions)/.test(content);
                
                filesToSync.push({
                  file_path: fullPath,
                  content,
                  file_type: ext.substring(1), // Remove leading dot
                  file_size: content.length,
                  line_count: lineCount,
                  imports,
                  exports,
                  has_hooks: hasHooks,
                  has_supabase_queries: hasSupabaseQueries,
                  last_synced_at: new Date().toISOString()
                });
                
                console.log(`  ✅ ${fullPath} (${lineCount} linee)`);
              } catch (err) {
                console.warn(`  ⚠️ Errore lettura ${fullPath}:`, err);
              }
            }
          }
        }
      } catch (err) {
        console.warn(`  ⚠️ Impossibile leggere directory ${dirPath}:`, err);
      }
    }

    // Scansiona tutte le cartelle
    for (const folder of foldersToScan) {
      console.log(`📁 Scansiono ${folder}/...`);
      await scanDirectory(folder);
    }

    console.log(`\n📊 Totale file trovati: ${filesToSync.length}`);

    // Upsert massivo nel DB (batch per evitare payload troppo grandi)
    if (filesToSync.length > 0) {
      const batchSize = 50;
      let totalUpserted = 0;
      
      for (let i = 0; i < filesToSync.length; i += batchSize) {
        const batch = filesToSync.slice(i, i + batchSize);
        
        const { error } = await supabaseClient
          .from('project_source_files')
          .upsert(batch, { 
            onConflict: 'file_path',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error(`❌ Errore upsert batch ${i}-${i+batch.length}:`, error);
          throw error;
        }
        
        totalUpserted += batch.length;
        console.log(`   💾 Batch ${i}-${i+batch.length} salvato (${totalUpserted}/${filesToSync.length})`);
      }

      console.log(`✅ Sincronizzazione completata: ${totalUpserted} file aggiornati`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        filesProcessed: filesToSync.length,
        message: `Sincronizzazione completata: ${filesToSync.length} file`
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
