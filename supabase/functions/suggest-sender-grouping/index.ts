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
  // 🆕 METADATI CONTESTUALI SPEDIZIONIERI
  transport_type?: 'air' | 'sea' | 'express' | 'road' | 'rail' | null;
  content_type?: 'quotation' | 'rate' | 'shipment' | 'documentation' | 'invoice' | 'tracking' | null;
  country_code?: string | null; // ISO 2-letter (IT, CN, US, etc.)
  country_confidence?: number; // 0-1
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

    // Get ALL active AI configs for fallback system
    const { data: aiConfigs, error: configError } = await supabase
      .from('config_ai')
      .select('*')
      .eq('attivo', true)
      .order('created_at', { ascending: false });

    if (configError || !aiConfigs || aiConfigs.length === 0) {
      console.error('❌ No active AI configs:', configError);
      return new Response(
        JSON.stringify({ error: 'No active AI configuration found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 Found ${aiConfigs.length} active AI configs, will try in order:`, 
      aiConfigs.map(c => `${c.provider}/${c.modello}`).join(', '));

    // 🧠 STEP 1: Carica Knowledge Base gruppi esistenti
    const { data: groupContexts, error: contextError } = await supabase
      .from('email_sender_groups_context')
      .select('group_id, context_summary, sender_patterns, quality_score')
      .eq('user_email', body.user_email);

    if (contextError) {
      console.warn('⚠️ Impossibile caricare knowledge base gruppi:', contextError);
    }

    // Crea mappa group_id → context per arricchire prompt
    const contextsMap = new Map<string, any>();
    (groupContexts || []).forEach(ctx => {
      contextsMap.set(ctx.group_id, ctx);
    });

    console.log(`📊 Knowledge Base: ${contextsMap.size} gruppi con context caricati`);

    // Build system prompt CON KNOWLEDGE BASE
    const systemPrompt = `Sei un assistente AI specializzato nella categorizzazione di MITTENTI email (non contenuti).
${companyContext ? `
🏢 **CONTESTO AZIENDALE DELL'UTENTE**
${companyContext}

IMPORTANTE: Utilizza questo contesto per comprendere meglio il tipo di mittenti e classificarli secondo le categorie aziendali specifiche definite dall'utente. Le tue classificazioni devono essere coerenti con questo profilo aziendale.
` : ''}
Il tuo compito è analizzare CHI È IL MITTENTE e suggerire 1-3 gruppi dove classificarlo.

🌍 **ANALISI CONTESTUALE SPECIFICA PER SPEDIZIONIERI**

Dato che l'utente opera nel settore trasporti/spedizioni, per OGNI mittente devi anche rilevare:

1. 🚢 **TIPO TRASPORTO** (transport_type):
   - "air": Trasporto aereo, air freight, cargo aereo, AWB
   - "sea": Trasporto marittimo, ocean freight, FCL, LCL, container, Bill of Lading
   - "express": Corriere espresso, DHL, FedEx, UPS, TNT, courier
   - "road": Trasporto su strada, camion, TIR, autotrasporto
   - "rail": Trasporto ferroviario, intermodale
   - null: Non determinabile o irrilevante

2. 📋 **TIPO CONTENUTO** (content_type):
   - "quotation": Richieste preventivo, quotazioni, offerte commerciali
   - "rate": Tariffe di spedizione, listini prezzi, rate sheets
   - "shipment": Documenti spedizione, tracking, conferme ritiro/consegna
   - "documentation": Documenti doganali, certificati origine, CMR, packing list
   - "invoice": Fatture, note di credito, pagamenti
   - "tracking": Aggiornamenti tracking, notifiche stato spedizione
   - null: Non determinabile o mix

3. 🌍 **PAESE DI ORIGINE** (country_code + country_confidence):
   - Analizza TLD email (es. .cn = Cina, .de = Germania)
   - Analizza display name (es. "Shanghai Logistics" = CN)
   - Analizza pattern spedizioni (es. sempre spedizioni da/per Brasile)
   - Analizza oggetti email (es. "FCL Shanghai-Hamburg" = CN→DE)
   - Fornisci ISO code a 2 lettere (IT, CN, US, DE, BR, etc.)
   - Fornisci confidence 0-1 (1.0 = certezza, 0.5 = indizio debole)

🎯 **ESEMPI PRATICI**:

📧 logistics@china-shipping.com + oggetti "FCL Shanghai-Rotterdam" + frequenza alta
→ transport_type: "sea"
→ content_type: "shipment"
→ country_code: "CN"
→ country_confidence: 0.95

📧 quotes@dhl.com + oggetti "Rate Request Air Freight" + dominio .com
→ transport_type: "air"
→ content_type: "quotation"
→ country_code: null (DHL è globale)
→ country_confidence: 0.0

📧 noreply@poste.it + oggetti "Tracking pacchi" + pattern automatico
→ transport_type: "express"
→ content_type: "tracking"
→ country_code: "IT"
→ country_confidence: 1.0

⚠️ **REGOLE IMPORTANTI**:
- Se mittente manda sia rate aeree che marittime → transport_type: null
- Se mittente manda quotazioni + spedizioni → content_type: "quotation" (priorità commerciale)
- Se TLD generico (.com, .net) ma azienda chiaramente locale → usa nome azienda per paese
- Se nessun indizio geografico → country_code: null, confidence: 0.0

🎯 FOCUS: Analizza la NATURA DEL MITTENTE, non il contenuto delle email.

GRUPPI ESISTENTI:
${body.existing_groups.map(g => {
  const context = contextsMap.get(g.id);
  const contextInfo = context 
    ? `\n   📊 PATTERN: ${context.context_summary}\n   🔍 SENDER PATTERNS: ${JSON.stringify(context.sender_patterns)}`
    : '';
  return `- ${g.nome_gruppo} (${g.tipo || 'custom'}): ${g.descrizione || 'Gruppo personalizzato'}${contextInfo}`;
}).join('\n')}

REGOLE DI ANALISI:
1. 🏢 ANALIZZA IL MITTENTE (NON IL CONTENUTO):
   - Dominio email (es. @cliente.com = esterno, @tuaazienda.com = interno)
   - Nome azienda/persona dal display name
   - Pattern di invio (frequenza, orari, volumi)
   - Tipo business (cliente, fornitore, partner, spedizioniere, autorità)

2. ❌ NON ANALIZZARE:
   - Oggetti email (es. "preventivo" non significa che mittente sia "Commerciale")
   - Contenuto body (es. "documenti doganali" non significa che sia "Operativo")
   - Argomenti discussi (un cliente può scrivere di operatività ma resta CLIENTE)

3. ✅ ESEMPI CORRETTI:
   - mittente@asmlogistics.com + "ASM Logistics" → CLIENTE (azienda esterna che ci scrive)
   - fatture@spedizioniexpress.it + invii frequenti → FORNITORI/SPEDIZIONIERI
   - noreply@agenziamaritime.it + pattern automatico → AUTORITÀ/ENTI
   - collega@tuaazienda.com → TEAM INTERNO (se esiste gruppo)

4. 📊 USA KNOWLEDGE BASE:
   - Se gruppo ha context_summary con "mittenti clienti B2B", usa quel pattern
   - Se sender_patterns mostra domini "@cliente.*", preferisci quel gruppo per nuovi @cliente
   - Quality score alto = pattern affidabile, usalo come riferimento

5. 🎯 CONFIDENCE:
   - >0.85: Mittente match chiaro con pattern gruppo (es. dominio cliente match pattern clienti)
   - 0.60-0.85: Indicatori parziali ma non definitivi
   - <0.60: Incerto, servono più dati

6. 🔢 SUGGERIMENTI (CRITICAL RULES):
   - Proponi MASSIMO 3 suggerimenti, ordinati per rilevanza
   - 🚨 PRIORITÀ ASSOLUTA: Usa SEMPRE gruppi esistenti generici
   - ✅ ACCETTABILE: "Logistica Cina" → gruppo "LOGISTICA" (generico)
   - ✅ ACCETTABILE: "Partner Nuovo" → gruppo "PARTNER" (generico)
   - ❌ VIETATO: Creare "Logistica Cina" se esiste già "LOGISTICA"
   - ❌ VIETATO: Creare "Partner Nuovo" se esiste già "PARTNER"
   - ❌ VIETATO: Creare "Spedizionieri Esteri" se esiste già "FORNITORI" o "LOGISTICA"
   
   📋 GERARCHIA DECISIONALE:
   1️⃣ Trova gruppo generico esistente che copre la categoria (es. LOGISTICA, CLIENTI, FORNITORI)
   2️⃣ Se confidence > 0.70, assegna a quel gruppo generico
   3️⃣ Se confidence < 0.70, proponi gruppo generico come seconda scelta
   4️⃣ Suggerisci nuovo gruppo SOLO se:
      - Nessun gruppo esistente copre minimamente la categoria
      - Il mittente rappresenta una categoria completamente nuova
      - Confidence per nuovo gruppo > 0.80
      - Esempi validi: primo "CLIENTE" mai visto, primo "AUTORITÀ" mai vista
   
   ⚠️ ESEMPI DI ERRORI DA EVITARE:
   - NON creare "Logistica Partner" se esiste "LOGISTICA" o "PARTNER"
   - NON creare "Clienti Esteri" se esiste "CLIENTI"
   - NON creare "Fornitori Cinesi" se esiste "FORNITORI" o "LOGISTICA"
   - NON creare "Spedizionieri Express" se esiste "FORNITORI"
   
   💡 PRINCIPIO GUIDA: "Quando in dubbio, usa il gruppo più GENERICO esistente"

7. 📋 FORMATO RISPOSTA:
   - group_id: ID del gruppo esistente (o null per nuovo gruppo)
   - group_name: Nome del gruppo
   - confidence: Valore 0-1
   - reason: Spiegazione breve (max 50 caratteri) che menziona TIPO MITTENTE (non contenuto)

Rispondi SOLO con JSON valido usando la funzione suggest_groups.`;

    // Build user prompt (focus su CHI È il mittente)
    const userPrompt = `Analizza questo MITTENTE e suggerisci 1-3 gruppi appropriati:

🏢 MITTENTE: ${body.sender_email}
📊 VOLUME: ${body.email_samples.length} email campionate

CAMPIONI EMAIL (per rilevare pattern temporali/formali, NON per contenuto):
${body.email_samples.map((email, i) => {
  const date = new Date(email.date);
  const dayOfWeek = date.toLocaleDateString('it-IT', { weekday: 'short' });
  const hour = date.getHours();
  return `${i + 1}. [${dayOfWeek} ${hour}:00] "${email.subject.substring(0, 60)}"`;
}).join('\n')}

🎯 FOCUS: Chi è questo mittente? È un cliente che ci scrive? Un fornitore? Un'autorità? Un collega?
📧 DOMINIO: ${body.sender_email.split('@')[1]}
🔍 PATTERN TEMPORALE: ${body.email_samples.length} email, orari ${body.email_samples.map(e => new Date(e.date).getHours()).join(', ')}

Suggerisci i gruppi più appropriati basandoti sulla NATURA DEL MITTENTE (non su cosa scrive).`;

    // 🔄 FALLBACK SYSTEM: Try each AI config until one works
    let aiResponse: any;
    let successfulConfig: any = null;
    let lastError: string = '';
    
    const requestBody: any = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'suggest_groups',
            description: 'Suggerisci gruppi per il mittente email',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  description: 'Array di 1-3 suggerimenti ordinati per rilevanza',
                  minItems: 1,
                  maxItems: 3,
                  items: {
                    type: 'object',
                    properties: {
                      group_id: {
                        type: ['string', 'null'],
                        description: 'UUID del gruppo esistente o null per nuovo gruppo'
                      },
                      group_name: {
                        type: 'string',
                        description: 'Nome del gruppo'
                      },
                      confidence: {
                        type: 'number',
                        description: 'Confidence 0-1',
                        minimum: 0,
                        maximum: 1
                      },
                      reason: {
                        type: 'string',
                        description: 'Spiegazione breve (max 50 caratteri)',
                        maxLength: 50
                      },
                      transport_type: {
                        type: ['string', 'null'],
                        enum: ['air', 'sea', 'express', 'road', 'rail', null],
                        description: 'Tipo trasporto rilevato (air/sea/express/road/rail/null)'
                      },
                      content_type: {
                        type: ['string', 'null'],
                        enum: ['quotation', 'rate', 'shipment', 'documentation', 'invoice', 'tracking', null],
                        description: 'Tipo contenuto prevalente nelle email'
                      },
                      country_code: {
                        type: ['string', 'null'],
                        description: 'Codice ISO 2-letter paese origine (IT, CN, US, etc.)'
                      },
                      country_confidence: {
                        type: 'number',
                        description: 'Confidence rilevamento paese (0-1)',
                        minimum: 0,
                        maximum: 1
                      }
                    },
                    required: ['group_id', 'group_name', 'confidence', 'reason', 'transport_type', 'content_type', 'country_code', 'country_confidence'],
                    additionalProperties: false
                  }
                }
              },
              required: ['suggestions'],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'suggest_groups' } }
    };

    // Try each config in order
    for (const aiConfig of aiConfigs) {
      try {
        console.log(`🔄 Trying ${aiConfig.provider}/${aiConfig.modello}...`);

        if (aiConfig.provider === 'anthropic') {
          aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': aiConfig.api_key,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: aiConfig.modello,
              max_tokens: 1000,
              ...requestBody
            })
          });
        } else if (aiConfig.provider === 'openai') {
          aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${aiConfig.api_key}`
            },
            body: JSON.stringify({
              model: aiConfig.modello,
              ...requestBody
            })
          });
        } else if (aiConfig.provider === 'lovable') {
          // 🔑 Lovable AI usa LOVABLE_API_KEY dal env (non dalla tabella)
          const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
          if (!lovableApiKey) {
            console.log(`⏭️ Skipping lovable: LOVABLE_API_KEY not configured`);
            continue;
          }
          
          aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${lovableApiKey}`
            },
            body: JSON.stringify({
              model: aiConfig.modello,
              ...requestBody
            })
          });
        } else {
          console.log(`⏭️ Skipping unsupported provider: ${aiConfig.provider}`);
          continue;
        }

        if (aiResponse.ok) {
          successfulConfig = aiConfig;
          console.log(`✅ Success with ${aiConfig.provider}/${aiConfig.modello}`);
          break;
        } else {
          const errorText = await aiResponse.text();
          lastError = errorText;
          
          // Check if it's a credit/quota error - if so, try next config
          if (errorText.includes('credit balance') || 
              errorText.includes('quota') || 
              errorText.includes('insufficient_quota') ||
              errorText.includes('rate_limit')) {
            console.log(`⚠️ ${aiConfig.provider} failed (no credits/quota), trying next...`);
            continue;
          } else {
            // Other error - log but still try next config
            console.error(`❌ ${aiConfig.provider} error:`, aiResponse.status, errorText);
            continue;
          }
        }
      } catch (error: any) {
        console.error(`❌ Exception with ${aiConfig.provider}:`, error.message);
        lastError = error.message;
        continue;
      }
    }

    // If no config worked, return error
    if (!successfulConfig || !aiResponse?.ok) {
      console.error('❌ All AI configs failed. Last error:', lastError);
      return new Response(
        JSON.stringify({ 
          error: 'All AI providers failed', 
          details: lastError,
          hint: 'Try activating Lovable AI in /configurazione-ai'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('🤖 AI Response:', JSON.stringify(aiData, null, 2));

    // Extract suggestions from tool call
    let suggestions: GroupingSuggestion[] = [];
    if (successfulConfig.provider === 'anthropic') {
      const toolUse = aiData.content?.find((c: any) => c.type === 'tool_use');
      if (toolUse?.input?.suggestions) {
        suggestions = toolUse.input.suggestions;
      }
    } else if (successfulConfig.provider === 'openai' || successfulConfig.provider === 'lovable') {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        suggestions = parsed.suggestions || [];
      }
    }

    if (suggestions.length === 0) {
      console.error('❌ No suggestions extracted from AI response');
      return new Response(
        JSON.stringify({ error: 'AI did not provide valid suggestions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Extracted suggestions:', suggestions);

    // 🛡️ POST-PROCESSING: Filtra suggerimenti troppo specifici
    console.log('🔍 Pre-filtering suggestions:', suggestions.length);

    suggestions = suggestions.filter(sugg => {
      // Se suggerisce nuovo gruppo (group_id === null)
      if (sugg.group_id === null) {
        // Verifica se esiste già un gruppo "generico" che copre questa categoria
        const suggNameLower = sugg.group_name.toLowerCase();
        
        // Lista gruppi generici da verificare (🆕 ESPANSA)
        const genericKeywords = [
          'logistica', 'cliente', 'fornitore', 'partner', 'operativo', 'commerciale', 'autorità',
          'spedizioniere', 'corriere', 'trasporti', 'freight', 'cargo', 'shipping',
          'recruiting', 'supporto', 'amministrativo', 'team', 'interno', 'esterno', 'servizi'
        ];
        
        for (const keyword of genericKeywords) {
          // Se il nuovo gruppo contiene una keyword generica
          if (suggNameLower.includes(keyword)) {
            // Cerca se esiste già un gruppo con quella keyword
            const existingGeneric = body.existing_groups.find(g => 
              g.nome_gruppo.toLowerCase().includes(keyword)
            );
            
            if (existingGeneric) {
              console.log(`⚠️ BLOCKED: "${sugg.group_name}" → esiste già "${existingGeneric.nome_gruppo}"`);
              return false; // Blocca questo suggerimento
            }
          }
        }
        
        // Se confidence per nuovo gruppo < 0.85, bloccalo (🆕 AUMENTATO)
        if (sugg.confidence < 0.85) {
          console.log(`⚠️ BLOCKED: "${sugg.group_name}" → confidence troppo bassa (${sugg.confidence})`);
          return false;
        }
      }
      
      return true; // Mantieni suggerimento
    });

    console.log('✅ Post-filtering suggestions:', suggestions.length);

    if (suggestions.length === 0) {
      console.error('❌ All suggestions filtered out as too specific');
      return new Response(
        JSON.stringify({ 
          error: 'AI suggestions were too specific. Please create groups manually or use existing generic groups.',
          hint: 'L\'AI ha proposto gruppi troppo dettagliati. Usa i gruppi esistenti.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing suggestion (anti-duplicate)
    const { data: existing, error: checkError } = await supabase
      .from('email_sender_grouping_suggestions')
      .select('id, status')
      .eq('sender_email', body.sender_email)
      .eq('user_email', body.user_email)
      .in('status', ['pending', 'accepted'])
      .maybeSingle();

    if (existing) {
      console.log(`⚠️ Suggerimento già esistente per ${body.sender_email} (status: ${existing.status}), skip INSERT`);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Suggerimento già esistente',
          suggestion_id: existing.id,
          skipped: true,
          status: existing.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Save to database (only if not exists)
    const { data: savedSuggestion, error: saveError } = await supabase
      .from('email_sender_grouping_suggestions')
      .insert({
        user_email: body.user_email,
        sender_email: body.sender_email,
        suggested_groups: suggestions,
        status: 'pending',
        analyzed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Save error:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save suggestions', details: saveError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Suggestions saved:', savedSuggestion.id);

    return new Response(
      JSON.stringify({
        success: true,
        suggestion_id: savedSuggestion.id,
        suggestions: suggestions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
