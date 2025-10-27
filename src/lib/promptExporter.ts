import { supabase } from '@/integrations/supabase/client';

interface ExportPromptSection {
  section_type: string;
  section_name: string;
  content: string;
  order_priority: number;
  is_active: boolean;
}

interface ExportComposedPrompt {
  id: string;
  name: string;
  content: string;
  target_agent: string;
  created_at: string;
}

/**
 * Export all system prompts to formatted TXT file
 */
export async function exportAllPromptsToTxt(): Promise<string> {
  // Load all prompts
  const [globalPromptsRes, sectionsRes, composedRes] = await Promise.all([
    supabase
      .from('chat_laboratory_system_prompts')
      .select('nome, contenuto, created_at, attivo')
      .order('nome'),
    
    supabase
      .from('chat_laboratory_prompt_sections')
      .select('section_type, section_name, content, order_priority, is_active')
      .order('section_type, order_priority'),
    
    supabase
      .from('chat_laboratory_composed_prompts')
      .select('id, name, content, target_agent, created_at')
      .order('created_at', { ascending: false })
  ]);

  const globalPrompts = globalPromptsRes.data || [];
  const sections: ExportPromptSection[] = sectionsRes.data || [];
  const composedPrompts: ExportComposedPrompt[] = composedRes.data || [];

  // Group sections by type
  const baseSections = sections.filter(s => s.section_type === 'BASE');
  const personalitySections = sections.filter(s => s.section_type === 'AGENT_PERSONALITY' || s.section_type === 'personality');
  const styleSections = sections.filter(s => s.section_type === 'CONVERSATION_STYLE');
  const orchestratorSections = sections.filter(s => s.section_type === 'ORCHESTRATOR_RULES');
  const topicSections = sections.filter(s => s.section_type === 'TOPIC_OBJECTIVE');

  // Build TXT content
  let output = '';
  
  // Header
  output += '═══════════════════════════════════════════════════════════\n';
  output += '           EXPORT COMPLETO PROMPT SISTEMA\n';
  output += '═══════════════════════════════════════════════════════════\n';
  output += `Data Export: ${new Date().toLocaleString('it-IT')}\n\n`;

  // Index
  output += '📑 INDICE\n';
  output += '─────────────────────────────────────────────────────────\n';
  
  let indexNum = 1;
  if (globalPrompts.length > 0) {
    output += `${indexNum}. PROMPT GLOBALI (${globalPrompts.length})\n`;
    globalPrompts.forEach((p, i) => {
      output += `   ${indexNum}.${i + 1} ${p.nome}${p.attivo ? ' [ATTIVO]' : ''}\n`;
    });
    indexNum++;
  }

  if (baseSections.length > 0) {
    output += `${indexNum}. SEZIONI BASE (${baseSections.length})\n`;
    baseSections.forEach((s, i) => {
      output += `   ${indexNum}.${i + 1} ${s.section_name}${s.is_active ? ' [ATTIVO]' : ' [Inattivo]'}\n`;
    });
    indexNum++;
  }

  if (personalitySections.length > 0) {
    output += `${indexNum}. PERSONALITÀ AGENTI (${personalitySections.length})\n`;
    personalitySections.forEach((s, i) => {
      output += `   ${indexNum}.${i + 1} ${s.section_name}${s.is_active ? ' [ATTIVO]' : ' [Inattivo]'}\n`;
    });
    indexNum++;
  }

  if (styleSections.length > 0) {
    output += `${indexNum}. STILI CONVERSAZIONE (${styleSections.length})\n`;
    styleSections.forEach((s, i) => {
      output += `   ${indexNum}.${i + 1} ${s.section_name}${s.is_active ? ' [ATTIVO]' : ' [Inattivo]'}\n`;
    });
    indexNum++;
  }

  if (orchestratorSections.length > 0) {
    output += `${indexNum}. ORCHESTRATOR (${orchestratorSections.length})\n`;
    orchestratorSections.forEach((s, i) => {
      output += `   ${indexNum}.${i + 1} ${s.section_name}${s.is_active ? ' [ATTIVO]' : ' [Inattivo]'}\n`;
    });
    indexNum++;
  }

  if (topicSections.length > 0) {
    output += `${indexNum}. OBIETTIVI CONVERSAZIONE (${topicSections.length})\n`;
    topicSections.forEach((s, i) => {
      output += `   ${indexNum}.${i + 1} ${s.section_name}${s.is_active ? ' [ATTIVO]' : ' [Inattivo]'}\n`;
    });
    indexNum++;
  }

  if (composedPrompts.length > 0) {
    output += `${indexNum}. PROMPT PRONTI IN PRODUZIONE (${composedPrompts.length})\n`;
    composedPrompts.forEach((p, i) => {
      output += `   ${indexNum}.${i + 1} ${p.name}\n`;
    });
  }

  output += '\n\n';

  // Content sections
  indexNum = 1;

  // 1. Global Prompts
  if (globalPrompts.length > 0) {
    output += '\n╔═══════════════════════════════════════════════════════════╗\n';
    output += `║  ${indexNum}. PROMPT GLOBALI                                      ║\n`;
    output += '╚═══════════════════════════════════════════════════════════╝\n\n';

    globalPrompts.forEach((prompt, idx) => {
      output += `── ${indexNum}.${idx + 1} ${prompt.nome} ──\n`;
      output += `Creato: ${new Date(prompt.created_at).toLocaleString('it-IT')}\n`;
      output += `Stato: ${prompt.attivo ? '✅ ATTIVO' : '⏸️ Inattivo'}\n\n`;
      output += '--- CONTENUTO ---\n';
      output += `${prompt.contenuto}\n\n`;
      output += '─'.repeat(60) + '\n\n';
    });
    indexNum++;
  }

  // 2. Base Sections
  if (baseSections.length > 0) {
    output += '\n╔═══════════════════════════════════════════════════════════╗\n';
    output += `║  ${indexNum}. SEZIONI BASE                                        ║\n`;
    output += '╚═══════════════════════════════════════════════════════════╝\n\n';

    baseSections.forEach((section, idx) => {
      output += `── ${indexNum}.${idx + 1} ${section.section_name} ──\n`;
      output += `Priorità: ${section.order_priority} | Stato: ${section.is_active ? '✅ ATTIVO' : '⏸️ Inattivo'}\n\n`;
      output += `${section.content}\n\n`;
      output += '─'.repeat(60) + '\n\n';
    });
    indexNum++;
  }

  // 3. Personality Sections
  if (personalitySections.length > 0) {
    output += '\n╔═══════════════════════════════════════════════════════════╗\n';
    output += `║  ${indexNum}. PERSONALITÀ AGENTI                                  ║\n`;
    output += '╚═══════════════════════════════════════════════════════════╝\n\n';

    personalitySections.forEach((section, idx) => {
      output += `── ${indexNum}.${idx + 1} ${section.section_name} ──\n`;
      output += `Priorità: ${section.order_priority} | Stato: ${section.is_active ? '✅ ATTIVO' : '⏸️ Inattivo'}\n\n`;
      output += `${section.content}\n\n`;
      output += '─'.repeat(60) + '\n\n';
    });
    indexNum++;
  }

  // 4. Style Sections
  if (styleSections.length > 0) {
    output += '\n╔═══════════════════════════════════════════════════════════╗\n';
    output += `║  ${indexNum}. STILI CONVERSAZIONE                                 ║\n`;
    output += '╚═══════════════════════════════════════════════════════════╝\n\n';

    styleSections.forEach((section, idx) => {
      output += `── ${indexNum}.${idx + 1} ${section.section_name} ──\n`;
      output += `Priorità: ${section.order_priority} | Stato: ${section.is_active ? '✅ ATTIVO' : '⏸️ Inattivo'}\n\n`;
      output += `${section.content}\n\n`;
      output += '─'.repeat(60) + '\n\n';
    });
    indexNum++;
  }

  // 5. Orchestrator Sections
  if (orchestratorSections.length > 0) {
    output += '\n╔═══════════════════════════════════════════════════════════╗\n';
    output += `║  ${indexNum}. ORCHESTRATOR                                        ║\n`;
    output += '╚═══════════════════════════════════════════════════════════╝\n\n';

    orchestratorSections.forEach((section, idx) => {
      output += `── ${indexNum}.${idx + 1} ${section.section_name} ──\n`;
      output += `Priorità: ${section.order_priority} | Stato: ${section.is_active ? '✅ ATTIVO' : '⏸️ Inattivo'}\n\n`;
      output += `${section.content}\n\n`;
      output += '─'.repeat(60) + '\n\n';
    });
    indexNum++;
  }

  // 6. Topic Objectives
  if (topicSections.length > 0) {
    output += '\n╔═══════════════════════════════════════════════════════════╗\n';
    output += `║  ${indexNum}. OBIETTIVI CONVERSAZIONE                             ║\n`;
    output += '╚═══════════════════════════════════════════════════════════╝\n\n';

    topicSections.forEach((section, idx) => {
      output += `── ${indexNum}.${idx + 1} ${section.section_name} ──\n`;
      output += `Priorità: ${section.order_priority} | Stato: ${section.is_active ? '✅ ATTIVO' : '⏸️ Inattivo'}\n\n`;
      output += `${section.content}\n\n`;
      output += '─'.repeat(60) + '\n\n';
    });
    indexNum++;
  }

  // 7. Composed Prompts (Ready)
  if (composedPrompts.length > 0) {
    output += '\n╔═══════════════════════════════════════════════════════════╗\n';
    output += `║  ${indexNum}. PROMPT PRONTI IN PRODUZIONE                         ║\n`;
    output += '╚═══════════════════════════════════════════════════════════╝\n\n';

    composedPrompts.forEach((prompt, idx) => {
      output += `── ${indexNum}.${idx + 1} ${prompt.name} ──\n`;
      output += `Target Agent: ${prompt.target_agent}\n`;
      output += `Creato: ${new Date(prompt.created_at).toLocaleString('it-IT')}\n\n`;
      output += '--- CONTENUTO COMPLETO ---\n';
      output += `${prompt.content}\n\n`;
      output += '─'.repeat(60) + '\n\n';
    });
  }

  // Footer
  output += '\n═══════════════════════════════════════════════════════════\n';
  output += '                    FINE EXPORT\n';
  output += '═══════════════════════════════════════════════════════════\n';

  return output;
}

/**
 * Trigger download of TXT file
 */
export function downloadTxtFile(content: string, filename?: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `prompt-sistema-export-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
