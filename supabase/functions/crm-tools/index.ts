import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://unpkg.com/@supabase/supabase-js@2.38.0/dist/module/index.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tool_name, parameters } = await req.json();

    let result;

    switch (tool_name) {
      case 'count_records':
        result = await countRecords(supabaseClient, parameters);
        break;
      
      case 'get_table_data':
        result = await getTableData(supabaseClient, parameters);
        break;
      
      case 'get_statistics':
        result = await getStatistics(supabaseClient);
        break;
      
      case 'search_contacts':
        result = await searchContacts(supabaseClient, parameters);
        break;
      
      case 'get_campaign_status':
        result = await getCampaignStatus(supabaseClient, parameters);
        break;
      
      case 'get_activities':
        result = await getActivities(supabaseClient, parameters);
        break;
      
      case 'insert_activity':
        result = await insertActivity(supabaseClient, parameters);
        break;
      
      case 'update_record':
        result = await updateRecord(supabaseClient, parameters);
        break;
      
      case 'insert_contact':
        result = await insertContact(supabaseClient, parameters);
        break;
      
      default:
        throw new Error(`Tool sconosciuto: ${tool_name}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Errore in crm-tools:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function countRecords(supabase: any, params: any) {
  const { table, filters } = params;
  
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  
  if (filters) {
    for (const [column, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined) {
        query = query.eq(column, value);
      }
    }
  }
  
  const { count, error } = await query;
  if (error) throw error;
  
  return { table, count, filters };
}

async function getTableData(supabase: any, params: any) {
  const { table, limit = 10, columns = '*', filters, order_by } = params;
  
  let query = supabase.from(table).select(columns);
  
  if (filters) {
    for (const [column, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined) {
        query = query.eq(column, value);
      }
    }
  }
  
  if (order_by) {
    query = query.order(order_by.column, { ascending: order_by.ascending ?? true });
  }
  
  query = query.limit(limit);
  
  const { data, error } = await query;
  if (error) throw error;
  
  return { table, data, count: data?.length || 0 };
}

async function getStatistics(supabase: any) {
  const stats: any = {};
  
  // Conta contatti
  const { count: contactsCount } = await supabase
    .from('rubrica')
    .select('*', { count: 'exact', head: true });
  stats.contatti_totali = contactsCount;
  
  // Conta campagne
  const { count: campaignsCount } = await supabase
    .from('campagne')
    .select('*', { count: 'exact', head: true });
  stats.campagne_totali = campaignsCount;
  
  // Conta attività
  const { count: activitiesCount } = await supabase
    .from('attivita')
    .select('*', { count: 'exact', head: true });
  stats.attivita_totali = activitiesCount;
  
  // Conta email
  const { count: emailsCount } = await supabase
    .from('email')
    .select('*', { count: 'exact', head: true });
  stats.email_totali = emailsCount;
  
  // Campagne attive
  const { count: activeCampaigns } = await supabase
    .from('campagne')
    .select('*', { count: 'exact', head: true })
    .eq('stato', 'attiva');
  stats.campagne_attive = activeCampaigns;
  
  // Attività in scadenza (prossimi 7 giorni)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const { count: dueSoonCount } = await supabase
    .from('attivita')
    .select('*', { count: 'exact', head: true })
    .lte('scadenza', nextWeek.toISOString())
    .neq('stato', 'completata');
  stats.attivita_in_scadenza = dueSoonCount;
  
  return stats;
}

async function searchContacts(supabase: any, params: any) {
  const { query, limit = 10 } = params;
  
  const { data, error } = await supabase
    .from('rubrica')
    .select('id, responsabile, azienda, email, telefono, tag')
    .or(`responsabile.ilike.%${query}%, azienda.ilike.%${query}%, email.ilike.%${query}%`)
    .limit(limit);
  
  if (error) throw error;
  
  return { query, contacts: data, count: data?.length || 0 };
}

async function getCampaignStatus(supabase: any, params: any) {
  const { campaign_id } = params;
  
  if (campaign_id) {
    const { data, error } = await supabase
      .from('campagne')
      .select('*')
      .eq('id', campaign_id)
      .single();
    
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('campagne')
      .select('id, nome, stato, inizio, fine, budget')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { campaigns: data };
  }
}

async function getActivities(supabase: any, params: any) {
  const { status, priority, limit = 10, assignee } = params;
  
  let query = supabase
    .from('attivita')
    .select('id, rubrica_id, tipo, descrizione, stato, scadenza, priorita, assegnato_a');
  
  if (status) query = query.eq('stato', status);
  if (priority) query = query.eq('priorita', priority);
  if (assignee) query = query.eq('assegnato_a', assignee);
  
  query = query.order('scadenza', { ascending: true }).limit(limit);
  
  const { data, error } = await query;
  if (error) throw error;
  
  return { activities: data, count: data?.length || 0 };
}

// Inserisce una nuova attività 
async function insertActivity(supabase: any, params: any) {
  const { 
    titolo, 
    descrizione, 
    tipo = 'task', 
    priorita = 'media', 
    stato = 'da_fare', 
    scadenza, 
    rubrica_id, 
    note 
  } = params;

  if (!titolo) {
    throw new Error('Il titolo è obbligatorio per creare un\'attività');
  }

  const activityData: any = {
    descrizione: titolo, // Campo descrizione nella tabella attivita
    tipo,
    priorita,
    stato
  };

  if (scadenza) activityData.scadenza = scadenza;
  if (rubrica_id) activityData.rubrica_id = rubrica_id;
  if (note) activityData.note = note;

  const { data, error } = await supabase
    .from('attivita')
    .insert(activityData)
    .select()
    .single();

  if (error) {
    console.error('Errore nell\'inserimento attività:', error);
    throw error;
  }

  return { success: true, data, message: 'Attività creata con successo' };
}

// Aggiorna un record esistente
async function updateRecord(supabase: any, params: any) {
  const { table, id, updates } = params;

  if (!table || !id || !updates) {
    throw new Error('Tabella, ID e aggiornamenti sono obbligatori');
  }

  const { data, error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Errore nell'aggiornamento ${table}:`, error);
    throw error;
  }

  return { success: true, data, message: `Record aggiornato con successo nella tabella ${table}` };
}

// Inserisce un nuovo contatto
async function insertContact(supabase: any, params: any) {
  const { 
    responsabile, 
    azienda, 
    email, 
    telefono, 
    tag, 
    note,
    stato = 'attivo'
  } = params;

  if (!responsabile && !azienda) {
    throw new Error('È richiesto almeno il nome del responsabile o dell\'azienda');
  }

  const contactData: any = { stato };

  if (responsabile) contactData.responsabile = responsabile;
  if (azienda) contactData.azienda = azienda;
  if (email) contactData.email = email;
  if (telefono) contactData.telefono = telefono;
  if (tag) contactData.tag = tag;
  if (note) contactData.note = note;

  const { data, error } = await supabase
    .from('rubrica')
    .insert(contactData)
    .select()
    .single();

  if (error) {
    console.error('Errore nell\'inserimento contatto:', error);
    throw error;
  }

  return { success: true, data, message: 'Contatto creato con successo' };
}