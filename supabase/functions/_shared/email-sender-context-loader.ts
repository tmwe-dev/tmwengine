// ============================================
// EMAIL SENDER CONTEXT LOADER
// Carica contesto email_sender per decision-making AI
// ============================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface SenderContext {
  sender_email: string;
  rule_id: string | null;
  action_type: string | null;
  specific_folder: string | null;
  auto_archive: boolean;
  auto_mark_read: boolean;
  group_id: string | null;
  group_name: string | null;
  group_type: string | null;
  group_color: string | null;
  context_notes: string | null;
  custom_prompt: string | null;
}

export interface SenderActionHistory {
  id: string;
  action_type: string;
  action_value: string;
  created_at: string;
  executed_successfully: boolean;
}

/**
 * Carica il contesto del mittente dalle tabelle email_sender
 */
export async function loadSenderContext(
  supabaseClient: SupabaseClient,
  senderEmail: string
): Promise<SenderContext> {
  console.log(`[Email Sender Context] Loading context for: ${senderEmail}`);

  // Load email_sender_rules with joined data
  const { data: rule, error: ruleError } = await supabaseClient
    .from('email_sender_rules')
    .select(`
      id,
      action_type,
      specific_folder,
      auto_archive,
      auto_mark_read,
      group_id,
      email_sender_groups:group_id (
        name,
        type,
        color
      )
    `)
    .eq('sender_email', senderEmail)
    .maybeSingle();

  if (ruleError) {
    console.error('[Email Sender Context] Error loading rule:', ruleError);
  }

  // Load custom prompt if exists
  const { data: promptData } = await supabaseClient
    .from('email_sender_ai_prompts')
    .select('custom_prompt')
    .eq('sender_email', senderEmail)
    .maybeSingle();

  // Load group context if group_id exists
  let contextNotes = null;
  if (rule?.group_id) {
    const { data: contextData } = await supabaseClient
      .from('email_sender_groups_context')
      .select('context_notes')
      .eq('group_id', rule.group_id)
      .maybeSingle();
    
    contextNotes = contextData?.context_notes || null;
  }

  if (!rule) {
    console.log('[Email Sender Context] No rule found for sender');
    return {
      sender_email: senderEmail,
      rule_id: null,
      action_type: null,
      specific_folder: null,
      auto_archive: false,
      auto_mark_read: false,
      group_id: null,
      group_name: null,
      group_type: null,
      group_color: null,
      context_notes: null,
      custom_prompt: promptData?.custom_prompt || null,
    };
  }

  console.log('[Email Sender Context] ✅ Rule found:', rule.id);

  const group = rule.email_sender_groups as any;

  return {
    sender_email: senderEmail,
    rule_id: rule.id,
    action_type: rule.action_type,
    specific_folder: rule.specific_folder,
    auto_archive: rule.auto_archive || false,
    auto_mark_read: rule.auto_mark_read || false,
    group_id: rule.group_id,
    group_name: group?.name || null,
    group_type: group?.type || null,
    group_color: group?.color || null,
    context_notes: contextNotes,
    custom_prompt: promptData?.custom_prompt || null,
  };
}

/**
 * Carica lo storico delle azioni eseguite per questo mittente
 */
export async function loadSenderActionHistory(
  supabaseClient: SupabaseClient,
  senderEmail: string
): Promise<SenderActionHistory[]> {
  console.log(`[Email Sender Context] Loading action history for: ${senderEmail}`);

  const { data, error } = await supabaseClient
    .from('email_sender_actions')
    .select('id, action_type, action_value, created_at, executed_successfully')
    .eq('sender_email', senderEmail)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('[Email Sender Context] Error loading action history:', error);
    return [];
  }

  console.log(`[Email Sender Context] ✅ Found ${data?.length || 0} actions`);

  return data || [];
}

/**
 * Formatta il contesto email_sender per il prompt AI
 */
export function formatSenderContextForAI(
  context: SenderContext,
  actionHistory: SenderActionHistory[]
): string {
  let prompt = '\n\n=== CONTESTO MITTENTE EMAIL ===\n';

  prompt += `\n📧 MITTENTE: ${context.sender_email}\n`;

  if (context.rule_id) {
    prompt += `\n🔧 REGOLA CONFIGURATA:\n`;
    prompt += `- Azione: ${context.action_type || 'Nessuna'}\n`;
    
    if (context.specific_folder) {
      prompt += `- Cartella: ${context.specific_folder}\n`;
    }
    
    if (context.auto_archive) {
      prompt += `- Auto-archivia: Sì\n`;
    }
    
    if (context.auto_mark_read) {
      prompt += `- Auto-segna letto: Sì\n`;
    }

    if (context.group_name) {
      prompt += `\n🏷️ GRUPPO:\n`;
      prompt += `- Nome: ${context.group_name}\n`;
      prompt += `- Tipo: ${context.group_type || 'N/A'}\n`;
      
      if (context.context_notes) {
        prompt += `- Note Contesto: ${context.context_notes.substring(0, 200)}${context.context_notes.length > 200 ? '...' : ''}\n`;
      }
    }

    if (context.custom_prompt) {
      prompt += `\n🎯 PROMPT PERSONALIZZATO:\n`;
      prompt += `${context.custom_prompt}\n`;
    }
  } else {
    prompt += `\n⚠️ NESSUNA REGOLA CONFIGURATA\n`;
    prompt += `Primo contatto da questo mittente o mittente non categorizzato.\n`;
  }

  // Action history
  if (actionHistory.length > 0) {
    prompt += `\n📊 STORICO AZIONI RECENTI (${actionHistory.length}):\n`;
    actionHistory.forEach((action, idx) => {
      const status = action.executed_successfully ? '✅' : '❌';
      const date = new Date(action.created_at).toLocaleDateString('it-IT');
      prompt += `${idx + 1}. ${status} [${action.action_type}] ${action.action_value} - ${date}\n`;
    });
  }

  prompt += '\n===========================\n';

  return prompt;
}
