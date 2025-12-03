// ============================================
// EMAIL AI PROCESSOR v2.1 - Zero-Sync with OAuth from DB
// Implementa: Analisi Gerarchica | Memoria Multilivello | Ricerca Attiva
// FIX: Uses OAuth token from user_tmwe_credentials table
// ============================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { loadSenderContext, loadSenderActionHistory, formatSenderContextForAI } from '../_shared/email-sender-context-loader.ts';
import { getAdaptiveConfidence } from '../_shared/learning-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TMWE API Base URL (same as tmwe-api-proxy)
const TMWE_API_BASE_URL = 'https://findair.it/erp/tmwe_json';

interface AIProcessRequest {
  email_id?: string;              // Legacy: UUID local (deprecated)
  tmwe_email_id?: number;         // 🆕 TMWE API email_id (primary)
  user_email: string;
  operation?: 'classify' | 'automate';
  selected_agent?: 'gemini' | 'gpt' | 'claude';
  force_category?: string;
}

// 🆕 Get TMWE OAuth Token from Database
async function getTMWETokenFromDB(supabase: SupabaseClient, userEmail: string): Promise<string> {
  console.log(`[TMWE Auth] 🔍 Fetching token for: ${userEmail}`);
  
  const { data: credentials, error } = await supabase
    .from('user_tmwe_credentials')
    .select('access_token, expires_at, token_type')
    .eq('email', userEmail)
    .maybeSingle();
  
  if (error) {
    console.error('[TMWE Auth] ❌ DB error:', error.message);
    throw new Error(`Error fetching TMWE credentials: ${error.message}`);
  }
  
  if (!credentials?.access_token) {
    console.error('[TMWE Auth] ❌ No token found for user');
    throw new Error(`Token TMWE no encontrado para ${userEmail}. Por favor, realiza login TMWE primero.`);
  }
  
  // Check expiration
  if (credentials.expires_at) {
    const expiresAt = new Date(credentials.expires_at);
    const now = new Date();
    
    if (expiresAt < now) {
      console.warn('[TMWE Auth] ⚠️ Token expired, may need refresh');
      // Still return it - the API will reject if truly invalid
    } else {
      console.log(`[TMWE Auth] ✅ Token valid until: ${expiresAt.toISOString()}`);
    }
  }
  
  return credentials.access_token;
}

// 🆕 TMWE API Helper - Zero-Sync Architecture (uses DB token)
async function fetchEmailFromTMWEApi(
  supabase: SupabaseClient, 
  tmweEmailId: number, 
  userEmail: string
): Promise<any> {
  // Get token from database instead of env vars
  const accessToken = await getTMWETokenFromDB(supabase, userEmail);
  
  console.log(`[TMWE API] 📧 Fetching email ${tmweEmailId} from TMWE API...`);
  
  const response = await fetch(`${TMWE_API_BASE_URL}/email_message`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      handler: 'get_detail',
      id: tmweEmailId
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TMWE API error (${response.status}): ${errorText}`);
  }
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`TMWE API error: ${data.error}`);
  }
  
  const email = data.email || data.result || data;
  
  if (!email || (!email.subject && !email.body_text)) {
    throw new Error(`Email not found in TMWE API: ${tmweEmailId}`);
  }
  
  console.log(`[TMWE API] ✅ Email loaded: ${email.subject || '(no subject)'}`);
  
  // Normalize TMWE API response to match expected format
  return {
    id: email.id || tmweEmailId,
    tmwe_email_id: tmweEmailId,
    subject: email.subject || '',
    body_text: email.body_text || email.snippet || '',
    body_html: email.body_html || '',
    from_email: email.from?.email || email.from_email || email.sender || '',
    to_email: email.to?.[0]?.email || email.to_email || '',
    user_email: userEmail,
    cartella: email.folder || email.folder_name || 'INBOX',
    uid: email.uid || String(tmweEmailId),
    received_at: email.date || email.received_at,
    has_attachments: email.has_attachments || false
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============================================
    // STEP 1: PARSE REQUEST & VALIDATE
    // ============================================

    const { 
      email_id,                    // Legacy: UUID local (deprecated)
      tmwe_email_id,               // 🆕 TMWE API email_id (primary)
      user_email, 
      operation = 'classify', 
      selected_agent = 'gemini',
      additional_instructions,
      force_category 
    } = await req.json();

    console.log('[AI Processor] 📧 Processing request:', {
      email_id,
      tmwe_email_id,
      has_tmwe_email_id: !!tmwe_email_id,
      tmwe_email_id_type: typeof tmwe_email_id,
      user_email,
      operation,
      selected_agent
    });

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 🆕 ZERO-SYNC: Get email from TMWE API or fallback to local DB
    let email: any;
    
    if (tmwe_email_id) {
      // Primary path: Fetch from TMWE API (Zero-Sync) - uses token from DB
      console.log('[AI Processor] 🌐 Using TMWE API (Zero-Sync mode)');
      email = await fetchEmailFromTMWEApi(supabase, tmwe_email_id, user_email);
    } else if (email_id) {
      // Fallback path: Legacy local DB query (deprecated)
      console.log('[AI Processor] ⚠️ Using legacy email_messages (deprecated)');
      const { data: localEmail, error: emailError } = await supabase
        .from('email_messages')
        .select('*')
        .eq('id', email_id)
        .single();

      if (emailError || !localEmail) {
        throw new Error(`Email not found in local DB: ${email_id}`);
      }
      email = localEmail;
    } else {
      throw new Error('Either tmwe_email_id or email_id is required');
    }

    console.log('[AI Processor] ✅ Email loaded:', email.subject);

    // ============================================
    // STEP 2: GET AI CONFIG
    // ============================================

    console.log('[AI Processor] 🔧 Loading AI configuration...');
    
    const aiConfig = await getAIConfig(supabase, selected_agent);
    
    console.log('[AI Processor] ✅ AI Config loaded:', {
      provider: aiConfig.provider,
      model: aiConfig.modello
    });

    // ============================================
    // STEP 3: BUILD PROMPT
    // ============================================

    console.log('[AI Processor] 📝 Building prompt...');
    
    const emailData: EmailData = {
      id: email.id,
      subject: email.subject || '',
      body_text: email.body_text || '',
      from_email: email.from_email || '',
      user_email: email.user_email,
      cartella: email.cartella
    };

    const { systemPrompt, userPrompt } = await buildPrompt(
      supabase,
      emailData,
      operation,
      {
        additionalInstructions: additional_instructions,
        forceCategory: force_category,
        selectedAgent: selected_agent
      }
    );

    console.log('[AI Processor] ✅ Prompt built');

    // ============================================
    // STEP 4: CALL AI PROVIDER
    // ============================================

    console.log('[AI Processor] 🚀 Calling AI provider...');

    // Define tools for classification
    const tools = operation === 'classify' ? [{
      type: "function",
      function: {
        name: "classify_email",
        description: "Classifica email in categorie predefinite",
        parameters: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: [
                "Fatture",
                "Bolle / Packing List",
                "Preventivi / Quotazioni",
                "Rate Aeree / Rate Navali",
                "Documenti Spedizione",
                "Offerte di Lavoro",
                "Marketing / Pubblicità",
                "Spam / Non Rilevante"
              ]
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1
            },
            summary: {
              type: "string",
              maxLength: 200
            },
            keywords: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 5
            }
          },
          required: ["category", "confidence", "summary", "keywords"]
        }
      }
    }] : undefined;

    const aiResponse = await callAIProvider(
      aiConfig,
      systemPrompt,
      userPrompt,
      tools
    );

    console.log('[AI Processor] ✅ AI response received');

    // ============================================
    // STEP 5: PARSE RESPONSE
    // ============================================

    console.log('[AI Processor] 📊 Parsing AI response...');
    
    const classification = await parseAIResponse(
      aiResponse,
      aiConfig.provider,
      operation
    );

    console.log('[AI Processor] ✅ Classification:', classification);

    // ============================================
    // STEP 6: UPDATE DATABASE (if classify)
    // ============================================

    if (operation === 'classify') {
      console.log('[AI Processor] 💾 Updating email classification...');
      
      // 🆕 ZERO-SYNC: Pass full params including tmwe_email_id
      await updateEmailClassification(supabase, {
        email_id: email_id,
        tmwe_email_id: tmwe_email_id,
        user_email: user_email,
        sender_email: email.from_email || '',
        folder_name: email.cartella || 'INBOX',
        email_uid: email.uid || '',
        subject: email.subject || '',
        body_preview: email.body_text?.substring(0, 500) || ''
      }, classification);
      
      console.log('[AI Processor] ✅ Classification saved to database');
      console.log('[AI Processor] 🆕 Zero-Sync tmwe_email_id:', tmwe_email_id || 'N/A (legacy mode)');
    }

    // ============================================
    // STEP 7: EXTRACT ENTITIES (PROMPT 3)
    // ============================================

    console.log('[AI Processor] 🔍 Extracting entities...');
    
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(
      (await supabase.from('email_messages').select('user_email').eq('id', email_id).single()).data?.user_email || ''
    );
    
    const userId = authUser?.id || '';
    
    if (userId) {
      const entities = await extractEntities(supabase, emailData, aiConfig);
      console.log('[AI Processor] ✅ Entities extracted:', entities.length);

      // Create/update topics for tracking numbers, invoices, orders
      for (const entity of entities) {
        if (['tracking', 'invoice', 'order'].includes(entity.type) && entity.confidence > 0.7) {
          await createOrUpdateTopic(supabase, entity, userId, email_id);
        }
      }
    }

    // ============================================
    // STEP 8: UPDATE CONVERSATION HISTORY
    // ============================================

    if (userId) {
      console.log('[AI Processor] 💬 Updating conversation history...');
      
      await updateConversationHistory(supabase, {
        user_id: userId,
        sender_email: email.from_email,
        email_subject: email.subject,
        email_summary: classification.summary || '',
        email_date: email.received_at
      });
      
      console.log('[AI Processor] ✅ Conversation history updated');
    }

    // ============================================
    // STEP 9: DECIDE ACTION (PROMPT 6) - if automate + INCREMENTI 7-9
    // ============================================

    if (operation === 'automate' && userId) {
      console.log('[AI Processor] 🎯 Deciding action...');

      // Load conversation history
      const { data: convHistory } = await supabase
        .from('conversation_history')
        .select('last_5_exchanges')
        .eq('user_id', userId)
        .eq('sender_email', email.from_email)
        .maybeSingle();

      // 🔧 INCREMENTO 7: Get tools context
      console.log('[AI Processor] 🔧 Fetching tools context...');
      const toolsContext = await getToolsContext({
        supabaseClient: supabase,
        userId: userId,
      });

      // 🏢 SPRINT 1 CORRECTED: Load Email Sender context
      console.log('[AI Processor] 🏢 Loading Email Sender context...');
      
      const senderContext = await loadSenderContext(supabase, email.from_email);
      const senderActionHistory = await loadSenderActionHistory(supabase, email.from_email);
      
      const senderContextText = formatSenderContextForAI(senderContext, senderActionHistory);
      console.log('[AI Processor] ✅ Email Sender context loaded');

      // 📊 INCREMENTO 10: Get adaptive confidence threshold
      const adaptiveThreshold = await getAdaptiveConfidence(
        supabase,
        userId,
        email.from_email,
        classification.category
      );
      console.log(`📊 Adaptive confidence threshold: ${adaptiveThreshold}`);

      const decision = await decideAction(
        supabase,
        emailData,
        classification,
        convHistory?.last_5_exchanges || [],
        aiConfig,
        toolsContext
      );

      console.log('[AI Processor] ✅ Action decided:', decision.action);

      // 🤖 INCREMENTO 8: Generate AI reply if action is 'reply'
      let generatedReply = decision.suggested_response;
      if (decision.action === 'reply') {
        console.log('[AI Processor] 🤖 Generating AI reply...');
        generatedReply = await generateAIReply({
          supabaseClient: supabase,
          userId: userId,
          senderEmail: email.from_email,
          emailSubject: email.subject,
          emailBody: email.body_text,
          conversationHistory: convHistory?.last_5_exchanges || [],
          extractedEntities: {}, // TODO: pass actual entities
          aiConfig,
        });
        console.log('[AI Processor] ✅ AI reply generated');
      }

      // ============================================
      // 🚀 INCREMENTO 9: AUTO-EXECUTE OR CREATE PENDING ACTION
      // ============================================

      // Load auto-execute config
      const { data: autoConfig } = await supabase
        .from('email_automation_config')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // 📊 INCREMENTO 10: Use adaptive threshold
      const effectiveThreshold = Math.max(
        autoConfig?.confidence_threshold || 0.90,
        adaptiveThreshold
      );

      const shouldAutoExecute =
        autoConfig?.auto_execute_enabled &&
        decision.confidence >= effectiveThreshold &&
        autoConfig.allowed_auto_actions?.includes(decision.action);

      if (shouldAutoExecute) {
        console.log(`[AI Processor] ⚡ Auto-executing action: ${decision.action} (confidence: ${decision.confidence})`);

        let success = false;
        let errorMessage = null;

        try {
          if (decision.action === 'archive') {
            const { error: archiveError } = await supabase
              .from('email_messages')
              .update({ folder_name: 'Archive' })
              .eq('id', email_id);
            success = !archiveError;
            if (archiveError) errorMessage = archiveError.message;
          } else if (decision.action === 'delete') {
            const { error: deleteError } = await supabase
              .from('email_messages')
              .update({ folder_name: 'eliminato' })
              .eq('id', email_id);
            success = !deleteError;
            if (deleteError) errorMessage = deleteError.message;
          } else if (['create_task', 'create_meeting', 'create_call', 'update_contact', 'add_tag', 'link_to_campaign'].includes(decision.action)) {
            // 🚀 SPRINT 2: Execute CRM actions via edge function
            console.log(`[AI Processor] 🏢 Executing CRM action: ${decision.action}`);
            
            try {
              const { data: crmResult, error: crmError } = await supabase.functions.invoke('execute-crm-action', {
                body: {
                  action: decision.action,
                  params: decision.payload || {},
                  sender_email: email.from_email,
                  user_id: userId,
                  ai_confidence: decision.confidence,
                  ai_reasoning: decision.reasoning,
                },
              });

              if (crmError) throw crmError;
              
              success = crmResult?.success || false;
              if (!success) {
                errorMessage = crmResult?.error || 'CRM action failed';
              } else {
                console.log(`[AI Processor] ✅ CRM action executed: ${crmResult?.message}`);
              }
            } catch (err: any) {
              errorMessage = err.message;
              success = false;
              console.error(`[AI Processor] ❌ CRM action error:`, err);
            }
          } else {
            // Other actions require manual confirmation
            success = false;
            errorMessage = 'Action requires manual confirmation';
          }

          console.log(`[AI Processor] ${success ? '✅' : '❌'} Auto-execute ${success ? 'succeeded' : 'failed'}`);
        } catch (err: any) {
          errorMessage = err.message;
          success = false;
        }

        // Log auto-execution
        await supabase
          .from('email_auto_execution_log')
          .insert({
            user_id: userId,
            email_uid: email.uid || '',
            action_type: decision.action,
            confidence: decision.confidence,
            success,
            error_message: errorMessage,
            metadata: { reasoning: decision.reasoning },
          });

        return new Response(
          JSON.stringify({
            success: true,
            classification,
            decision,
            auto_executed: true,
            message: `Azione "${decision.action}" eseguita automaticamente (confidence: ${decision.confidence.toFixed(2)})`,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // ============================================
      // STEP 10: CREATE PENDING ACTION (if not auto-executed)
      // ============================================

      if (decision.action !== 'nothing') {
        console.log('[AI Processor] 📝 Creating pending action...');

        await supabase
          .from('email_pending_actions')
          .insert({
            user_id: userId,
            email_uid: email.uid || '',
            email_id,
            sender_email: email.from_email,
            action_type: decision.action,
            action_payload: decision.payload,
            suggested_response: generatedReply,
            reasoning: decision.reasoning,
            confidence: decision.confidence,
            status: 'pending'
          });

        console.log('[AI Processor] ✅ Pending action created');
      }
    }

    // ============================================
    // STEP 11: EXECUTE AUTOMATION (legacy - deprecated)
    // ============================================

    if (operation === 'automate') {
      console.log('[AI Processor] 🤖 Executing legacy automation...');
      
      // Get prompt config for automation actions
      const { data: promptConfig } = await supabase
        .from('email_sender_ai_prompts')
        .select('automatic_actions, prompt_library:prompt_library_id(default_actions)')
        .eq('sender_email', email.from_email)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (promptConfig) {
        const actions = promptConfig.automatic_actions || promptConfig.prompt_library?.default_actions;
        console.log('[AI Processor] 🎯 Legacy automation actions:', actions);
        
        // Execute actions (log execution)
        await supabase
          .from('email_ai_automation_log')
          .insert({
            email_id,
            sender_email: email.from_email,
            actions_executed: actions,
            ai_response: classification,
            executed_at: new Date().toISOString()
          });
      }
      
      console.log('[AI Processor] ✅ Legacy automation executed');
    }

    // ============================================
    // RETURN SUCCESS
    // ============================================

    return new Response(
      JSON.stringify({
        success: true,
        operation,
        email_id,
        classification,
        provider: aiConfig.provider,
        agent: selected_agent
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[AI Processor] ❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
