// ============================================
// EMAIL AI PROCESSOR - Consolidado
// Función única que reemplaza: classify-email-content, classify-email-content-intelligent, email-ai-automation-processor
// ============================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  getAIConfig,
  buildPrompt,
  callAIProvider,
  parseAIResponse,
  updateEmailClassification,
  type EmailData,
  type AIClassificationResult
} from '../_shared/ai-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIProcessRequest {
  email_id: string;
  user_email: string;
  operation?: 'classify' | 'automate';
  selected_agent?: 'gemini' | 'gpt' | 'claude';
  additional_instructions?: string;
  force_category?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email_id,
      user_email,
      operation = 'classify',
      selected_agent = 'gemini',
      additional_instructions,
      force_category
    }: AIProcessRequest = await req.json();

    console.log('🤖 Email AI Processor started');
    console.log('📧 Email ID:', email_id);
    console.log('🎯 Operation:', operation);
    console.log('🤖 Agent:', selected_agent);

    if (!email_id || !user_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email_id, user_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============================================
    // STEP 1: FETCH EMAIL FROM DB
    // ============================================

    console.log('[AI Processor] 📥 Fetching email from database...');
    
    const { data: email, error: emailError } = await supabase
      .from('email_messages')
      .select('*')
      .eq('id', email_id)
      .eq('user_email', user_email)
      .single();

    if (emailError || !email) {
      console.error('[AI Processor] ❌ Email not found:', emailError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email not found in local database. Please sync emails first.' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[AI Processor] ✅ Email fetched:', {
      id: email.id,
      subject: email.subject?.substring(0, 50),
      from: email.from_email
    });

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
      
      await updateEmailClassification(supabase, email_id, classification);
      
      console.log('[AI Processor] ✅ Classification saved to database');
    }

    // ============================================
    // STEP 7: EXECUTE AUTOMATION (if automate)
    // ============================================

    if (operation === 'automate') {
      console.log('[AI Processor] 🤖 Executing automation...');
      
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
        console.log('[AI Processor] 🎯 Automation actions:', actions);
        
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
      
      console.log('[AI Processor] ✅ Automation executed');
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
