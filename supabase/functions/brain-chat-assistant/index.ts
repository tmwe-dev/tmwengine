import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { conversation_id, user_message, technical_context, selected_agent = 'gemini' } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const systemPrompt = `
Sei un assistente esperto in debugging e refactoring di codice.

**CONTESTO TECNICO DISPONIBILE:**

DUPLICATI RILEVATI: ${technical_context.duplicates?.length || 0}
${technical_context.duplicates?.map((d: any) => 
  `- ${d.function} in ${d.file} (duplicato di: ${d.duplicate_of})`
).join('\n')}

FUNZIONI PESANTI: ${technical_context.heavy_functions?.length || 0}
${technical_context.heavy_functions?.map((h: any) => 
  `- ${h.function} (${h.complexity} complexity, ${h.loc} LOC) in ${h.file}`
).join('\n')}

FUNZIONI CONDIVISE: ${technical_context.shared_functions?.length || 0}
${technical_context.shared_functions?.map((s: any) => 
  `- ${s.function} (usata ${s.share_count} volte)`
).join('\n')}

Rispondi in modo conciso e tecnico con suggerimenti concreti.
`;

    let aiResponse;

    if (selected_agent === 'gemini') {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: user_message }
          ],
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Gemini API error ${response.status}:`, errorText);
        return new Response(
          JSON.stringify({ error: `Gemini API error ${response.status}: ${errorText}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const data = await response.json();
      aiResponse = data.choices[0].message.content;
    } else if (selected_agent === 'chatgpt') {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: user_message }
          ],
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ChatGPT API error ${response.status}:`, errorText);
        return new Response(
          JSON.stringify({ error: `ChatGPT API error ${response.status}: ${errorText}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const data = await response.json();
      aiResponse = data.choices[0].message.content;
    } else if (selected_agent === 'claude') {
      const { data: config } = await supabaseClient
        .from('config_ai')
        .select('api_key')
        .eq('provider', 'anthropic')
        .eq('attivo', true)
        .single();

      if (!config) {
        return new Response(
          JSON.stringify({ error: 'Claude API key not configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': config.api_key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1000,
          messages: [
            { role: 'user', content: `${systemPrompt}\n\n${user_message}` }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Claude API error ${response.status}:`, errorText);
        return new Response(
          JSON.stringify({ error: `Claude API error ${response.status}: ${errorText}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      aiResponse = data.content[0].text;
    }

    if (!aiResponse) {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabaseClient.from('chat_laboratory_messages').insert({
      conversation_id,
      sender_type: selected_agent,
      sender_name: selected_agent === 'gemini' ? 'Pitagora' : selected_agent === 'chatgpt' ? 'Albert' : 'Archimede',
      content: aiResponse,
      created_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
