import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  user_id: string;
  company_description: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    console.log('📥 Optimize company profile request:', { user_id: body.user_id });

    if (!body.user_id || !body.company_description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, company_description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get AI API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build expansion prompt
    const systemPrompt = `Sei un esperto di business intelligence e AI prompt engineering per aziende di trasporti e logistica.

Ricevi una descrizione aziendale sommaria e devi generare un CONTEXT PROMPT dettagliato che sarà utilizzato da un'AI per classificare mittenti email.

Il prompt generato deve:
1. Mantenere tutte le informazioni fornite dall'utente
2. Aggiungere principi di classificazione mittenti specifici per il settore
3. Definire categorie operative chiare
4. Specificare il formato di output JSON richiesto
5. Includere esempi di termini tecnici chiave del settore

STRUTTURA RICHIESTA:

**Contesto Aziendale**
[Espandi la descrizione fornita]

**Categorie di Classificazione**
- cliente_diretto: Richiede preventivi, tracking, assistenza su spedizioni proprie
- partner_network: Spedizioniere o agente WCA, corrispondente estero, forwarding partner
- compagnia_trasporto: Compagnia aerea, marittima o terrestre che offre spazi o tariffe
- fornitore_logistico: Trasportatore locale, doganalista, magazzino o operatore di handling
- professionista: Commercialista, consulente legale, tecnico o amministrativo
- servizio_finanziario: Banca, assicurazione, leasing, factoring o istituto creditizio
- commerciale: Proposte marketing, partnership, recruiting, offerte generiche
- spam: Phishing, virus, contenuti ingannevoli, mittenti non pertinenti
- altro: Non classificabile con certezza o fuori contesto

**Principi Guida**
1. Priorità operativa → se un mittente può rientrare in più categorie, scegli quella più utile al lavoro quotidiano
2. Contesto prima del dominio → domini generici (gmail, yahoo) possono essere validi se il contenuto è coerente
3. Distinzione commerciale/spam → "commerciale" = messaggio legittimo ma non richiesto; "spam" = contenuto malevolo
4. Segnali spam → urgenza artificiale, errori gravi, allegati sospetti, link strani
5. Termini tecnici chiave → AWB, BOL, customs clearance, DGR, quote request, freight
6. Dubbio ragionevole → se non hai abbastanza indizi, assegna "altro" con confidenza bassa

**Output Atteso**
{
  "email": "indirizzo@dominio.com",
  "categoria": "partner_network",
  "motivazione": "Dominio appartenente a network WCA; invia richieste di quotazione per spedizioni.",
  "confidenza": "alta"
}

Genera il prompt completo (max 2500 caratteri) mantenendo questo formato.`;

    const userPrompt = `DESCRIZIONE AZIENDALE:
${body.company_description}

Genera ora il context prompt completo per classificare mittenti email in base a questa azienda.`;

    console.log('🤖 Calling Lovable AI for context expansion...');

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 3000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const optimizedContext = aiData.choices[0].message.content;

    console.log('✅ Context optimized, length:', optimizedContext.length);

    // Save to user_profiles
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ company_context_ai: optimizedContext })
      .eq('user_id', body.user_id);

    if (updateError) {
      console.error('❌ Error updating profile:', updateError);
      throw updateError;
    }

    console.log('✅ Company context saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        optimized_context: optimizedContext,
        length: optimizedContext.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in optimize-company-profile:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
