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
    const { conversation_id, task, agents, rounds = 2, technical_context } = await req.json();
    console.log(`🧠 Brain Orchestrator: ${agents.length} agents × ${rounds} rounds`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    // Multi-round loop
    for (let round = 1; round <= rounds; round++) {
      console.log(`\n🔄 === ROUND ${round}/${rounds} ===`);

      const roundResponses: any[] = [];

      // Sequential agent calls
      for (let agentIdx = 0; agentIdx < agents.length; agentIdx++) {
        const agentType = agents[agentIdx];
        console.log(`\n🤖 Agent ${agentIdx + 1}/${agents.length}: ${agentType}`);

        const { data: taskRecord } = await supabaseClient
          .from('brain_ai_tasks')
          .insert({
            conversation_id,
            round_number: round,
            task_type: task,
            input_data: { task, technical_context, round, agent_order: agentIdx },
            assigned_agent: agentType,
            agent_order: agentIdx,
            status: 'queued',
            user_id: user.id
          })
          .select()
          .single();

        if (!taskRecord) continue;

        // Build prompt with cumulative context
        const systemPrompt = buildBrainSystemPrompt({
          task,
          technical_context,
          round,
          total_rounds: rounds,
          previous_round_responses: round > 1 ? await getPreviousRoundResponses(supabaseClient, conversation_id, round - 1) : [],
          current_round_responses: roundResponses,
          agent_type: agentType
        });

        await supabaseClient
          .from('brain_ai_tasks')
          .update({ status: 'running', started_at: new Date().toISOString() })
          .eq('id', taskRecord.id);

        const startTime = Date.now();
        
        try {
          let aiResult;
          
          if (agentType === 'gemini') {
            aiResult = await callGemini(LOVABLE_API_KEY!, systemPrompt, task);
          } else if (agentType === 'chatgpt') {
            aiResult = await callChatGPT(LOVABLE_API_KEY!, systemPrompt, task);
          } else if (agentType === 'claude') {
            const { data: config } = await supabaseClient
              .from('config_ai')
              .select('api_key')
              .eq('provider', 'anthropic')
              .eq('attivo', true)
              .single();
            
            if (config) {
              aiResult = await callClaude(config.api_key, systemPrompt, task);
            }
          }

          if (!aiResult) continue;

          const duration = Date.now() - startTime;

          await supabaseClient
            .from('brain_ai_tasks')
            .update({
              status: 'completed',
              output_data: {
                content: aiResult.content,
                tokens_in: aiResult.tokensIn,
                tokens_out: aiResult.tokensOut
              },
              completed_at: new Date().toISOString(),
              duration_ms: duration,
              previous_responses: roundResponses
            })
            .eq('id', taskRecord.id);

          roundResponses.push({
            agent: agentType,
            content: aiResult.content
          });

          console.log(`✅ ${agentType} completato: ${aiResult.tokensOut} tokens in ${duration}ms`);

        } catch (error: any) {
          console.error(`❌ Errore ${agentType}:`, error);
          
          await supabaseClient
            .from('brain_ai_tasks')
            .update({
              status: 'failed',
              error_message: error.message,
              completed_at: new Date().toISOString()
            })
            .eq('id', taskRecord.id);
        }

        if (agentIdx < agents.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      console.log(`✅ Round ${round} completato: ${roundResponses.length} risposte`);

      if (round < rounds) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Errore orchestrator:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildBrainSystemPrompt(params: {
  task: string;
  technical_context: any;
  round: number;
  total_rounds: number;
  previous_round_responses: any[];
  current_round_responses: any[];
  agent_type: string;
}): string {
  const { task, technical_context, round, total_rounds, previous_round_responses, current_round_responses, agent_type } = params;

  let prompt = `Sei un esperto di debugging e refactoring di codice.

**TASK:** ${task}

**CONTESTO TECNICO:**
- ${technical_context.duplicates_count} duplicati rilevati
- ${technical_context.heavy_count} funzioni pesanti (>1000 LOC)
- ${technical_context.shared_count} funzioni condivise

**DISCUSSIONE MULTI-ROUND:** Round ${round}/${total_rounds}
`;

  if (previous_round_responses.length > 0) {
    prompt += `\n\n**ROUND ${round - 1} - RISPOSTE PRECEDENTI:**\n`;
    previous_round_responses.forEach(r => {
      prompt += `\n**${r.agent.toUpperCase()}:** ${r.content}\n`;
    });
    prompt += `\n**CONSIDERA** queste risposte e aggiungi nuovi punti.`;
  }

  if (current_round_responses.length > 0) {
    prompt += `\n\n**ROUND ${round} - RISPOSTE ATTUALI:**\n`;
    current_round_responses.forEach(r => {
      prompt += `\n**${r.agent.toUpperCase()}:** ${r.content}\n`;
    });
  }

  if (round === 1) {
    prompt += `\n\n**OBIETTIVO:** Analisi iniziale. Fornisci osservazioni tecniche concrete.`;
  } else if (round === total_rounds) {
    prompt += `\n\n**OBIETTIVO:** Ultimo round. Fornisci proposta finale concreta e implementabile.`;
  } else {
    prompt += `\n\n**OBIETTIVO:** Approfondisci l'analisi. Commenta le proposte precedenti.`;
  }

  if (agent_type === 'gemini') {
    prompt += `\n\n**TUA PERSONALITÀ:** Veloce ed efficiente. Focus soluzioni pragmatiche.`;
  } else if (agent_type === 'chatgpt') {
    prompt += `\n\n**TUA PERSONALITÀ:** Versatile e preciso. Bilancia teoria e pratica.`;
  } else if (agent_type === 'claude') {
    prompt += `\n\n**TUA PERSONALITÀ:** Analisi approfondita. Focus qualità e best practices.`;
  }

  prompt += `\n\n**LIMITE:** Massimo 150 parole. Sii conciso e tecnico.`;

  return prompt;
}

async function getPreviousRoundResponses(supabaseClient: any, conversation_id: string, round: number) {
  const { data } = await supabaseClient
    .from('brain_ai_tasks')
    .select('assigned_agent, output_data')
    .eq('conversation_id', conversation_id)
    .eq('round_number', round)
    .eq('status', 'completed');

  return (data || []).map((t: any) => ({
    agent: t.assigned_agent,
    content: t.output_data.content
  }));
}

async function callGemini(apiKey: string, systemPrompt: string, userMessage: string) {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 500
    })
  });

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    tokensIn: data.usage?.prompt_tokens || 0,
    tokensOut: data.usage?.completion_tokens || 0
  };
}

async function callChatGPT(apiKey: string, systemPrompt: string, userMessage: string) {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-5-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 500
    })
  });

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    tokensIn: data.usage?.prompt_tokens || 0,
    tokensOut: data.usage?.completion_tokens || 0
  };
}

async function callClaude(apiKey: string, systemPrompt: string, userMessage: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        { role: 'user', content: `${systemPrompt}\n\n${userMessage}` }
      ]
    })
  });

  const data = await response.json();
  return {
    content: data.content[0].text,
    tokensIn: data.usage?.input_tokens || 0,
    tokensOut: data.usage?.output_tokens || 0
  };
}
