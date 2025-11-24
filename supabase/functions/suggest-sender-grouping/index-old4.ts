import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailSample {
  subject: string;
  body_preview: string;
  date: string;
}

interface ExistingGroup {
  id: string;
  nome_gruppo: string;
  tipo?: string;
  colore?: string;
  icon?: string;
  descrizione?: string;
}

interface GroupingSuggestion {
  group_id: string | null;
  group_name: string;
  confidence: number;
  reason: string;
}

interface RequestBody {
  sender_email: string;
  email_samples: EmailSample[];
  existing_groups: ExistingGroup[];
  user_email: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    console.log('📥 Request:', { sender_email: body.sender_email, samples: body.email_samples?.length });

    // Validation
    if (!body.sender_email || !body.email_samples || !body.existing_groups || !body.user_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sender_email, email_samples, existing_groups, user_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's company context (if available)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('company_context_ai')
      .eq('user_email', body.user_email)
      .single();

    const companyContext = userProfile?.company_context_ai || null;
    console.log(`🏢 Company context: ${companyContext ? 'FOUND (' + companyContext.substring(0, 50) + '...)' : 'NOT FOUND'}`);

    // ... rest of the existing code from index.ts ...
    // (questo è il backup del codice precedente)

    return new Response(
      JSON.stringify({ message: 'Backup file - see index.ts for current implementation' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
