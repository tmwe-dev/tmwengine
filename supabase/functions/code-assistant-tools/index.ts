import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Tool {
  name: string;
  parameters: any;
}

// Helper functions
function extractHooks(content: string): string[] {
  const hookRegex = /use[A-Z]\w+/g;
  return [...new Set(content.match(hookRegex) || [])];
}

function extractPropsInterface(content: string): string | null {
  const propsRegex = /interface\s+\w+Props\s*{[^}]+}/s;
  const match = content.match(propsRegex);
  return match ? match[0] : null;
}

function generateSimpleDiff(original: string, proposed: string): string {
  const origLines = original.split('\n');
  const propLines = proposed.split('\n');
  
  let diff = '';
  const maxLen = Math.max(origLines.length, propLines.length);
  
  for (let i = 0; i < maxLen; i++) {
    if (origLines[i] !== propLines[i]) {
      if (origLines[i]) diff += `- ${origLines[i]}\n`;
      if (propLines[i]) diff += `+ ${propLines[i]}\n`;
    }
  }
  
  return diff || 'No changes detected';
}

function validateTypeScriptSyntax(code: string): boolean {
  try {
    const openBrackets = (code.match(/[{[(]/g) || []).length;
    const closeBrackets = (code.match(/[}\])]/g) || []).length;
    
    if (openBrackets !== closeBrackets) return false;
    if (code.includes('import from')) return false;
    
    return true;
  } catch {
    return false;
  }
}

async function buildDependencyTree(supabase: any, filePath: string, imports: any[]): Promise<any> {
  const tree: any = { file: filePath, children: [] };
  
  for (const imp of imports) {
    if (imp.startsWith('@/')) {
      const depPath = imp.replace('@/', 'src/');
      const { data } = await supabase
        .from('code_index')
        .select('file_path, imports')
        .eq('file_path', depPath)
        .single();
      
      if (data) {
        tree.children.push({ file: data.file_path, children: [] });
      }
    }
  }
  
  return tree;
}

// Tool implementations
async function listProjectFiles(supabase: any, params: any) {
  const { file_type, limit = 50 } = params;
  
  let query = supabase
    .from('code_index')
    .select('id, file_path, file_type, line_count, last_updated')
    .order('file_path', { ascending: true });
  
  if (file_type) query = query.eq('file_type', file_type);
  
  const { data, error } = await query.limit(limit);
  if (error) throw error;
  
  return { files: data, count: data?.length || 0 };
}

async function readSourceCode(supabase: any, params: any) {
  const { file_path } = params;
  
  const { data, error } = await supabase
    .from('code_index')
    .select('*')
    .eq('file_path', file_path)
    .single();
  
  if (error) throw error;
  return data;
}

async function analyzeComponent(supabase: any, params: any) {
  const { file_path } = params;
  
  const { data: file, error } = await supabase
    .from('code_index')
    .select('content, imports, exports, components, dependencies')
    .eq('file_path', file_path)
    .single();
  
  if (error) throw error;
  
  const analysis = {
    file_path,
    imports: file.imports,
    exports: file.exports,
    components: file.components,
    hooks_used: extractHooks(file.content),
    props_interface: extractPropsInterface(file.content),
    dependencies: file.dependencies
  };
  
  return analysis;
}

async function searchCode(supabase: any, params: any) {
  const { query, file_type, limit = 20 } = params;
  
  let q = supabase
    .from('code_index')
    .select('file_path, file_type, content')
    .textSearch('content_tsvector', query);
  
  if (file_type) q = q.eq('file_type', file_type);
  
  const { data, error } = await q.limit(limit);
  if (error) throw error;
  
  return { results: data, count: data?.length || 0 };
}

async function getDependencies(supabase: any, params: any) {
  const { file_path } = params;
  
  const { data, error } = await supabase
    .from('code_index')
    .select('file_path, dependencies, imports')
    .eq('file_path', file_path)
    .single();
  
  if (error) throw error;
  
  const tree = await buildDependencyTree(supabase, file_path, data.imports);
  
  return { file_path, dependencies: data.dependencies, tree };
}

async function proposeCodeChange(supabase: any, params: any) {
  const { 
    file_path, 
    proposed_code, 
    reason, 
    change_type = 'modification',
    impact_level = 'low'
  } = params;
  
  // Leggi codice originale
  const { data: original } = await supabase
    .from('code_index')
    .select('content')
    .eq('file_path', file_path)
    .maybeSingle();
  
  const diff = generateSimpleDiff(original?.content || '', proposed_code);
  const syntax_valid = validateTypeScriptSyntax(proposed_code);
  
  const { data: proposal, error } = await supabase
    .from('code_change_proposals')
    .insert({
      file_path,
      original_code: original?.content,
      proposed_code,
      reason,
      change_type,
      impact_level,
      diff,
      syntax_valid
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return { proposal_id: proposal.id, status: 'pending', syntax_valid };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool_name, parameters } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    let result;
    
    switch (tool_name) {
      case 'list_project_files':
        result = await listProjectFiles(supabaseClient, parameters);
        break;
      case 'read_source_code':
        result = await readSourceCode(supabaseClient, parameters);
        break;
      case 'analyze_component':
        result = await analyzeComponent(supabaseClient, parameters);
        break;
      case 'search_code':
        result = await searchCode(supabaseClient, parameters);
        break;
      case 'get_dependencies':
        result = await getDependencies(supabaseClient, parameters);
        break;
      case 'propose_code_change':
        result = await proposeCodeChange(supabaseClient, parameters);
        break;
      default:
        throw new Error(`Unknown tool: ${tool_name}`);
    }
    
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('Code assistant error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
