import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { personalityPrompt, testQuestion, agentId } = await req.json();
    
    // 📏 Carica limite parole dal DB usando agentId
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: agent } = await supabaseClient
      .from('elevenlabs_agents')
      .select('max_words_per_response')
      .eq('id', agentId)
      .maybeSingle();

    const maxWords = agent?.max_words_per_response || 60;
    console.log(`📏 Preview usando limite: ${maxWords} parole (agentId: ${agentId})`);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: `${personalityPrompt}\n\nIMPORTANTE: Rispondi in modo breve e conciso, massimo ${maxWords} parole.` 
          },
          { 
            role: 'user', 
            content: testQuestion || "Ciao! Mi parli del tuo caffè preferito?" 
          }
        ],
        max_tokens: maxWords * 5
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const preview = data.choices[0].message.content;
    
    console.log('Preview generated successfully');
    
    return new Response(
      JSON.stringify({ preview }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Error generating preview:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
