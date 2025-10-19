import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestCommentBody {
  conversationId: string;
  messageId: string;
  targetAgent: 'all' | 'chatgpt' | 'gemini' | 'claude';
  requestingUser: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, messageId, targetAgent, requestingUser }: RequestCommentBody = await req.json();

    console.log(`🔔 Richiesta commento: conversationId=${conversationId}, messageId=${messageId}, target=${targetAgent}, user=${requestingUser}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1️⃣ Ottieni il messaggio di riferimento
    const { data: refMessage, error: msgError } = await supabaseClient
      .from('chat_laboratory_messages')
      .select('sender_name, content')
      .eq('id', messageId)
      .single();

    if (msgError || !refMessage) {
      throw new Error('Messaggio non trovato');
    }

    // 2️⃣ Ottieni partecipanti attivi
    const { data: participants, error: partError } = await supabaseClient
      .from('chat_laboratory_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_active', true);

    if (partError || !participants) {
      throw new Error('Partecipanti non trovati');
    }

    // 3️⃣ Determina quali agenti chiamare
    let targetAgents: any[] = [];
    if (targetAgent === 'all') {
      // Tutti tranne il sender del messaggio originale
      targetAgents = participants.filter(p => p.name !== refMessage.sender_name);
    } else {
      // Solo l'agente specificato
      targetAgents = participants.filter(p => p.type === targetAgent);
    }

    if (targetAgents.length === 0) {
      throw new Error('Nessun agente target trovato');
    }

    console.log(`📢 Chiamata diretta a: ${targetAgents.map(a => a.name).join(', ')}`);

    // 4️⃣ Invoca orchestrator con parametri speciali
    const { error: orchError } = await supabaseClient.functions.invoke('bar-chat-orchestrator', {
      body: {
        conversationId,
        userMessage: `[RICHIESTA UTENTE] Commenta il messaggio di ${refMessage.sender_name}: "${refMessage.content.substring(0, 300)}..."`,
        participants: targetAgents.map(a => a.name),
        manualRequest: true // Flag per identificare richiesta manuale
      }
    });

    if (orchError) {
      console.error('❌ Errore orchestrator:', orchError);
      throw orchError;
    }

    return new Response(
      JSON.stringify({ success: true, targetedAgents: targetAgents.map(a => a.name) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Errore bar-request-comment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
