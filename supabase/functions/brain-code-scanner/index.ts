import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FileContent {
  path: string;
  content: string;
}

interface FunctionInfo {
  name: string;
  signature: string;
  start_line: number;
  end_line: number;
  lines_of_code: number;
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { files, scan_type = 'full' } = await req.json() as { files: FileContent[]; scan_type?: string };

    console.log(`🔍 Starting ${scan_type} scan for ${files.length} files`);

    // Create scan record
    const { data: scan, error: scanError } = await supabaseClient
      .from('brain_code_scans')
      .insert({
        scan_type,
        files_scanned: files.length,
        user_id: user.id,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (scanError) throw scanError;

    const scan_id = scan.id;
    let total_functions = 0;
    let duplicates_detected = 0;
    let shared_functions = 0;
    let heavy_functions = 0;

    // Map to track functions by hash for duplicate detection
    const functionHashes = new Map<string, { file_path: string; function_name: string; signature: string }[]>();

    // Analyze each file
    for (const file of files) {
      try {
        const functions = extractFunctions(file.content, file.path);
        
        for (const func of functions) {
          const content_hash = await hashString(func.content);
          const complexity = calculateComplexity(func.content);
          const dependencies = extractDependencies(func.content);
          const is_heavy = func.lines_of_code > 50 || complexity > 10;

          if (is_heavy) heavy_functions++;

          // Check for duplicates
          const existing = functionHashes.get(content_hash) || [];
          const is_duplicate = existing.length > 0;
          const duplicate_of = is_duplicate ? `${existing[0].file_path}::${existing[0].function_name}` : null;

          if (is_duplicate) duplicates_detected++;

          // Track this function
          existing.push({ file_path: file.path, function_name: func.name, signature: func.signature });
          functionHashes.set(content_hash, existing);

          // Insert function analysis
          await supabaseClient.from('brain_function_analysis').insert({
            scan_id,
            file_path: file.path,
            function_name: func.name,
            function_signature: func.signature,
            lines_of_code: func.lines_of_code,
            cyclomatic_complexity: complexity,
            dependencies,
            is_duplicate,
            duplicate_of,
            is_heavy,
            content_hash
          });

          total_functions++;
        }
      } catch (error) {
        console.error(`Error analyzing ${file.path}:`, error);
      }
    }

    // Detect shared functions (same name in multiple files)
    const functionNames = new Map<string, string[]>();
    const { data: allFunctions } = await supabaseClient
      .from('brain_function_analysis')
      .select('function_name, file_path')
      .eq('scan_id', scan_id);

    if (allFunctions) {
      for (const func of allFunctions) {
        const paths = functionNames.get(func.function_name) || [];
        paths.push(func.file_path);
        functionNames.set(func.function_name, paths);
      }

      // Update shared functions
      for (const [func_name, paths] of functionNames.entries()) {
        if (paths.length > 1) {
          shared_functions++;
          await supabaseClient
            .from('brain_function_analysis')
            .update({
              is_shared: true,
              shared_in_files: paths,
              share_count: paths.length
            })
            .eq('scan_id', scan_id)
            .eq('function_name', func_name);
        }
      }
    }

    // Complete scan
    await supabaseClient
      .from('brain_code_scans')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        functions_found: total_functions,
        duplicates_detected,
        shared_functions,
        heavy_functions
      })
      .eq('id', scan_id);

    console.log(`✅ Scan complete: ${total_functions} functions, ${duplicates_detected} duplicates, ${shared_functions} shared, ${heavy_functions} heavy`);

    return new Response(
      JSON.stringify({
        success: true,
        scan_id,
        stats: {
          files_scanned: files.length,
          functions_found: total_functions,
          duplicates_detected,
          shared_functions,
          heavy_functions
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in brain-code-scanner:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Extract functions from code
function extractFunctions(content: string, filePath: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  
  // Regex patterns for different function types
  const patterns = [
    // Named functions: function myFunc() {}
    /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((.*?)\)\s*{/g,
    // Arrow functions: const myFunc = () => {}
    /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\((.*?)\)\s*=>/g,
    // Class methods: myMethod() {}
    /^\s*(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((.*?)\)\s*{/gm,
    // Export functions: export function myFunc() {}
    /export\s+(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((.*?)\)\s*{/g,
  ];

  const lines = content.split('\n');
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1];
      const params = match[2] || '';
      const signature = `${name}(${params})`;
      const start_index = match.index;
      
      // Find function body
      let brace_count = 1;
      let end_index = content.indexOf('{', start_index) + 1;
      
      while (brace_count > 0 && end_index < content.length) {
        if (content[end_index] === '{') brace_count++;
        if (content[end_index] === '}') brace_count--;
        end_index++;
      }
      
      const function_content = content.substring(start_index, end_index);
      const start_line = content.substring(0, start_index).split('\n').length;
      const end_line = content.substring(0, end_index).split('\n').length;
      const lines_of_code = end_line - start_line + 1;
      
      functions.push({
        name,
        signature,
        start_line,
        end_line,
        lines_of_code,
        content: function_content
      });
    }
  }
  
  return functions;
}

// Calculate cyclomatic complexity (simplified)
function calculateComplexity(code: string): number {
  let complexity = 1; // Base complexity
  
  // Count decision points
  const patterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bwhile\s*\(/g,
    /\bfor\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\&\&/g,
    /\|\|/g,
    /\?/g
  ];
  
  for (const pattern of patterns) {
    const matches = code.match(pattern);
    if (matches) complexity += matches.length;
  }
  
  return complexity;
}

// Extract dependencies (imports)
function extractDependencies(code: string): string[] {
  const dependencies: string[] = [];
  
  // Match imports
  const importPattern = /import\s+(?:{[^}]+}|[^"']+)\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importPattern.exec(code)) !== null) {
    dependencies.push(match[1]);
  }
  
  return dependencies;
}

// Hash function using Web Crypto API
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
