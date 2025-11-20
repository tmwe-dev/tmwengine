// ============================================
// CRM CONTEXT LOADER - SPRINT 1
// Carica contesto CRM per decision-making AI
// ============================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface ContactContext {
  rubrica_id: string | null;
  nome: string | null;
  azienda: string | null;
  note: string | null;
  tag: string[] | null;
  email: string;
  telefono: string | null;
  last_contact: string | null;
  stato: string | null;
}

export interface ContactActivity {
  id: string;
  tipo: string;
  descrizione: string;
  stato: string;
  scadenza: string | null;
  priorita: string;
  created_at: string;
}

export interface RelatedCampaign {
  id: string;
  nome: string;
  stato: string;
  inizio: string | null;
  fine: string | null;
  obiettivo: string | null;
}

/**
 * Carica il contesto del contatto dalla rubrica
 */
export async function loadContactContext(
  supabaseClient: SupabaseClient,
  email: string
): Promise<ContactContext> {
  console.log(`[CRM Context] Loading contact context for: ${email}`);

  const { data, error } = await supabaseClient
    .from('rubrica')
    .select('id, nome, azienda, email, telefono, note, tag, last_contact, stato')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('[CRM Context] Error loading contact:', error);
  }

  if (!data) {
    console.log('[CRM Context] Contact not found in rubrica');
    return {
      rubrica_id: null,
      nome: null,
      azienda: null,
      note: null,
      tag: null,
      email,
      telefono: null,
      last_contact: null,
      stato: null,
    };
  }

  console.log('[CRM Context] ✅ Contact found:', data.nome || data.azienda);

  return {
    rubrica_id: data.id,
    nome: data.nome,
    azienda: data.azienda,
    note: data.note,
    tag: data.tag,
    email: data.email,
    telefono: data.telefono,
    last_contact: data.last_contact,
    stato: data.stato,
  };
}

/**
 * Carica le attività recenti del contatto
 */
export async function loadContactActivities(
  supabaseClient: SupabaseClient,
  rubrica_id: string
): Promise<ContactActivity[]> {
  console.log(`[CRM Context] Loading activities for rubrica_id: ${rubrica_id}`);

  const { data, error } = await supabaseClient
    .from('attivita')
    .select('id, tipo, descrizione, stato, scadenza, priorita, created_at')
    .eq('rubrica_id', rubrica_id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('[CRM Context] Error loading activities:', error);
    return [];
  }

  console.log(`[CRM Context] ✅ Found ${data?.length || 0} activities`);

  return data || [];
}

/**
 * Carica le campagne collegate al contatto
 */
export async function loadRelatedCampaigns(
  supabaseClient: SupabaseClient,
  rubrica_id: string
): Promise<RelatedCampaign[]> {
  console.log(`[CRM Context] Loading campaigns for rubrica_id: ${rubrica_id}`);

  const { data, error } = await supabaseClient
    .from('attivita')
    .select(`
      campagna_id,
      campagne:campagna_id (
        id,
        nome,
        stato,
        inizio,
        fine,
        obiettivo
      )
    `)
    .eq('rubrica_id', rubrica_id)
    .not('campagna_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('[CRM Context] Error loading campaigns:', error);
    return [];
  }

  // Extract unique campaigns
  const campaigns = data
    ?.map((item: any) => item.campagne)
    .filter((c: any) => c && c.id)
    .reduce((acc: any[], curr: any) => {
      if (!acc.find(c => c.id === curr.id)) {
        acc.push(curr);
      }
      return acc;
    }, []);

  console.log(`[CRM Context] ✅ Found ${campaigns?.length || 0} related campaigns`);

  return campaigns || [];
}

/**
 * Formatta il contesto CRM per il prompt AI
 */
export function formatCRMContextForAI(
  contact: ContactContext,
  activities: ContactActivity[],
  campaigns: RelatedCampaign[]
): string {
  let context = '\n\n=== CONTESTO CRM ===\n';

  // Contact info
  if (contact.rubrica_id) {
    context += `\n📋 CONTATTO IN RUBRICA:\n`;
    context += `- Nome: ${contact.nome || 'N/A'}\n`;
    context += `- Azienda: ${contact.azienda || 'N/A'}\n`;
    context += `- Stato: ${contact.stato || 'N/A'}\n`;
    
    if (contact.tag && contact.tag.length > 0) {
      context += `- Tag: ${contact.tag.join(', ')}\n`;
    }
    
    if (contact.note) {
      context += `- Note: ${contact.note.substring(0, 200)}${contact.note.length > 200 ? '...' : ''}\n`;
    }
    
    if (contact.last_contact) {
      const lastContactDate = new Date(contact.last_contact).toLocaleDateString('it-IT');
      context += `- Ultimo contatto: ${lastContactDate}\n`;
    }
  } else {
    context += `\n⚠️ CONTATTO NON IN RUBRICA\n`;
    context += `Email: ${contact.email} - Prima email da questo mittente\n`;
  }

  // Activities
  if (activities.length > 0) {
    context += `\n📊 ATTIVITÀ RECENTI (${activities.length}):\n`;
    activities.forEach((act, idx) => {
      const deadline = act.scadenza ? new Date(act.scadenza).toLocaleDateString('it-IT') : 'N/A';
      context += `${idx + 1}. [${act.tipo}] ${act.descrizione.substring(0, 80)} - ${act.stato} (scad: ${deadline})\n`;
    });
  }

  // Campaigns
  if (campaigns.length > 0) {
    context += `\n🎯 CAMPAGNE COLLEGATE (${campaigns.length}):\n`;
    campaigns.forEach((camp, idx) => {
      context += `${idx + 1}. ${camp.nome} - ${camp.stato}\n`;
      if (camp.obiettivo) {
        context += `   Obiettivo: ${camp.obiettivo.substring(0, 100)}\n`;
      }
    });
  }

  context += '\n===================\n';

  return context;
}
