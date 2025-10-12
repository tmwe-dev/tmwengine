import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting backup of all edge functions...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const functionsPath = './';
    const backups: any[] = [];
    
    // Leggi tutte le cartelle nella directory functions
    const entries = [];
    for await (const entry of Deno.readDir(functionsPath)) {
      if (entry.isDirectory && entry.name !== 'backup-all-edge-functions') {
        entries.push(entry.name);
      }
    }

    console.log(`📂 Found ${entries.length} functions to backup`);

    // Per ogni funzione, leggi il file index.ts
    for (const functionName of entries) {
      try {
        const indexPath = `${functionsPath}${functionName}/index.ts`;
        const content = await Deno.readTextFile(indexPath);
        
        // Ottieni il numero di versione corrente
        const { data: existingVersions } = await supabase
          .from('edge_function_versions')
          .select('version_number')
          .eq('function_name', functionName)
          .order('version_number', { ascending: false })
          .limit(1);

        const nextVersion = existingVersions && existingVersions.length > 0 
          ? existingVersions[0].version_number + 1 
          : 1;

        // Salva la versione
        const { error: insertError } = await supabase
          .from('edge_function_versions')
          .insert({
            function_name: functionName,
            version_number: nextVersion,
            content: content,
            description: `Backup automatico ${new Date().toISOString()}`,
            is_active: true
          });

        if (insertError) {
          console.error(`❌ Error backing up ${functionName}:`, insertError);
        } else {
          console.log(`✅ Backed up ${functionName} as v${nextVersion}`);
          backups.push({ 
            function: functionName, 
            version: nextVersion,
            size: content.length 
          });
        }
      } catch (err) {
        console.error(`❌ Error reading ${functionName}:`, err);
      }
    }

    console.log(`✅ Backup complete: ${backups.length}/${entries.length} functions saved`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Backed up ${backups.length} edge functions`,
        backups: backups,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Backup error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
