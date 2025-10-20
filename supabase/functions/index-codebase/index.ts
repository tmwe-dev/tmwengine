import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IndexStats {
  indexed: number;
  updated: number;
  errors: number;
  files: string[];
  errorDetails: Array<{ file: string; error: string }>;
}

interface FileMetadata {
  file_path: string;
  file_type: string;
  content: string;
  imports: string[];
  exports: string[];
  functions: string[];
  components: string[];
  line_count: number;
  token_count: number;
  complexity_score: number;
  language: string;
}

const DEFAULT_DIRECTORIES = [
  'src/components',
  'src/pages',
  'src/hooks',
  'src/lib',
  'src/integrations',
  'supabase/functions'
];

function extractImports(content: string): string[] {
  const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
  const imports: string[] = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function extractExports(content: string): string[] {
  const exportRegex = /export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+(\w+)/g;
  const exports: string[] = [];
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  return exports;
}

function extractFunctions(content: string): string[] {
  const functionRegex = /(?:function|const)\s+(\w+)\s*(?:=|:|\()/g;
  const functions: string[] = [];
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    functions.push(match[1]);
  }
  return functions;
}

function extractComponents(content: string): string[] {
  const componentRegex = /(?:function|const)\s+([A-Z]\w+)\s*(?:=|:)\s*(?:\([^)]*\)\s*(?:=>|:)|React\.FC)/g;
  const components: string[] = [];
  let match;
  while ((match = componentRegex.exec(content)) !== null) {
    components.push(match[1]);
  }
  return components;
}

function determineFileType(filePath: string): string {
  if (filePath.includes('/pages/')) return 'page';
  if (filePath.includes('/components/')) return 'component';
  if (filePath.includes('/hooks/')) return 'hook';
  if (filePath.includes('/lib/')) return 'util';
  if (filePath.includes('/integrations/')) return 'integration';
  if (filePath.includes('supabase/functions/')) return 'edge-function';
  if (filePath.endsWith('.config.ts') || filePath.endsWith('.config.js')) return 'config';
  return 'other';
}

function calculateComplexity(content: string): number {
  let score = 0;
  score += (content.match(/if\s*\(/g) || []).length;
  score += (content.match(/for\s*\(/g) || []).length * 2;
  score += (content.match(/while\s*\(/g) || []).length * 2;
  score += (content.match(/switch\s*\(/g) || []).length * 3;
  score += (content.match(/catch\s*\(/g) || []).length;
  score += (content.match(/\?\s*[^:]+\s*:/g) || []).length;
  return score;
}

function processFile(file: { file_path: string; content: string }): FileMetadata {
  const lineCount = file.content.split('\n').length;
  const tokenCount = Math.ceil(file.content.length / 4);
  
  return {
    file_path: file.file_path,
    file_type: determineFileType(file.file_path),
    content: file.content,
    imports: extractImports(file.content),
    exports: extractExports(file.content),
    functions: extractFunctions(file.content),
    components: extractComponents(file.content),
    line_count: lineCount,
    token_count: tokenCount,
    complexity_score: calculateComplexity(file.content),
    language: file.file_path.endsWith('.tsx') || file.file_path.endsWith('.jsx') ? 'tsx' : 'typescript'
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { files = [], forceReindex = false } = await req.json();
    
    const startTime = Date.now();
    const stats: IndexStats = {
      indexed: 0,
      updated: 0,
      errors: 0,
      files: [],
      errorDetails: []
    };

    console.log(`Starting codebase indexing. Received ${files.length} files from frontend`);

    // Cancella indice esistente se forceReindex è true
    if (forceReindex) {
      const { error: deleteError } = await supabase
        .from('code_index')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteError) {
        console.error('Error clearing index:', deleteError);
      } else {
        console.log('Cleared existing index');
      }
    }

    // Process all files received from frontend
    for (const fileInput of files) {
      try {
        const fileMetadata = processFile(fileInput);
        
        const { error: upsertError } = await supabase
          .from('code_index')
          .upsert({
            file_path: fileMetadata.file_path,
            file_type: fileMetadata.file_type,
            content: fileMetadata.content,
            imports: fileMetadata.imports,
            exports: fileMetadata.exports,
            functions: fileMetadata.functions,
            components: fileMetadata.components,
            line_count: fileMetadata.line_count,
            token_count: fileMetadata.token_count,
            complexity_score: fileMetadata.complexity_score,
            language: fileMetadata.language,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'file_path'
          });

        if (upsertError) {
          console.error(`Error indexing ${fileMetadata.file_path}:`, upsertError);
          stats.errors++;
          stats.errorDetails.push({
            file: fileMetadata.file_path,
            error: upsertError.message
          });
        } else {
          stats.indexed++;
          stats.files.push(fileMetadata.file_path);
        }
      } catch (error) {
        console.error(`Error processing file:`, error);
        stats.errors++;
        stats.errorDetails.push({
          file: fileInput.file_path || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`Indexing completed in ${duration}s:`, stats);

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        duration: `${duration}s`,
        message: `Indexed ${stats.indexed} files with ${stats.errors} errors in ${duration}s`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in index-codebase function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
