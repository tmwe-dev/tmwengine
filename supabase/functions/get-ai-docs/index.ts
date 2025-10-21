import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  docType: 'overview' | 'errors' | 'tasks' | 'history';
  format?: 'markdown' | 'json';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AUTH: Verifica JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ User ${user.email} requesting AI docs`);

    // Parse request
    const { docType, format } = await req.json() as RequestBody;

    // Mappa docType → file path
    const docPaths: Record<string, string> = {
      overview: 'docs/ai-collaboration/project-overview.md',
      errors: 'docs/ai-collaboration/errors-log.json',
      tasks: 'docs/ai-collaboration/ai-tasks.md',
      history: 'docs/ai-collaboration/change-history.md'
    };

    const filePath = docPaths[docType];
    if (!filePath) {
      return new Response(JSON.stringify({ error: 'Invalid docType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Leggi file da filesystem
    let content: string;
    try {
      content = await Deno.readTextFile(filePath);
    } catch (err) {
      console.error(`❌ File not found: ${filePath}`, err);
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📄 Serving ${docType} doc (${content.length} chars)`);

    // Ritorna content (JSON auto-parsed se .json)
    const responseData = docType === 'errors' ? JSON.parse(content) : content;

    return new Response(JSON.stringify({ 
      docType, 
      content: responseData,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('🔥 Error in get-ai-docs:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
