import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

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
      
      // === RUBRICA AVANZATA ===
      case 'get_rubrica_statistics':
        result = await getRubricaStatistics(supabaseClient);
        break;

      case 'search_rubrica_advanced':
        result = await searchRubricaAdvanced(supabaseClient, parameters);
        break;

      case 'get_rubrica_by_filters':
        result = await getRubricaByFilters(supabaseClient, parameters);
        break;

      // === IMPORT TEMPLATES ===
      case 'get_import_logs':
        result = await getImportLogs(supabaseClient, parameters);
        break;

      case 'get_imported_contacts_stats':
        result = await getImportedContactsStats(supabaseClient);
        break;

      case 'search_imported_contacts':
        result = await searchImportedContacts(supabaseClient, parameters);
        break;

      // === ATTIVITÀ AVANZATE ===
      case 'get_activities_statistics':
        result = await getActivitiesStatistics(supabaseClient);
        break;

      case 'get_activities_by_status':
        result = await getActivitiesByStatus(supabaseClient, parameters);
        break;

      case 'get_overdue_activities':
        result = await getOverdueActivities(supabaseClient);
        break;

      case 'get_user_activities':
        result = await getUserActivities(supabaseClient, parameters);
        break;

      // === CAMPAGNE AVANZATE ===
      case 'get_campaigns_statistics':
        result = await getCampaignsStatistics(supabaseClient);
        break;

      case 'get_campaign_performance':
        result = await getCampaignPerformance(supabaseClient, parameters);
        break;

      case 'get_active_campaigns':
        result = await getActiveCampaigns(supabaseClient);
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

// ===== RUBRICA AVANZATA =====

async function getRubricaStatistics(supabase: any) {
  const stats: any = {};
  
  // Totali
  const { count: totalContacts } = await supabase
    .from('rubrica').select('*', { count: 'exact', head: true });
  stats.contatti_totali = totalContacts;
  
  // Con azienda
  const { count: withCompany } = await supabase
    .from('rubrica')
    .select('*', { count: 'exact', head: true })
    .not('azienda', 'is', null);
  stats.con_azienda = withCompany;
  
  // Per paese (top 5)
  const { data: byCountry } = await supabase
    .from('rubrica')
    .select('paese')
    .not('paese', 'is', null);
  
  const countryMap: Record<string, number> = {};
  byCountry?.forEach((r: any) => {
    countryMap[r.paese] = (countryMap[r.paese] || 0) + 1;
  });
  
  stats.top_paesi = Object.entries(countryMap)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([paese, count]) => ({ paese, count }));
  
  // Per origine (top 5)
  const { data: byOrigin } = await supabase
    .from('rubrica')
    .select('origine')
    .not('origine', 'is', null);
  
  const originMap: Record<string, number> = {};
  byOrigin?.forEach((r: any) => {
    originMap[r.origine] = (originMap[r.origine] || 0) + 1;
  });
  
  stats.top_origini = Object.entries(originMap)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([origine, count]) => ({ origine, count }));
  
  // Con note
  const { count: withNotes } = await supabase
    .from('rubrica')
    .select('*', { count: 'exact', head: true })
    .not('note', 'is', null)
    .neq('note', '');
  stats.con_note = withNotes;
  
  return stats;
}

async function searchRubricaAdvanced(supabase: any, params: any) {
  const { query, paese, origine, limit = 20 } = params;
  
  let q = supabase
    .from('rubrica')
    .select('id, nome, azienda, email, telefono, citta, paese, origine');
  
  if (query) {
    q = q.or(`nome.ilike.%${query}%, azienda.ilike.%${query}%, email.ilike.%${query}%`);
  }
  
  if (paese) q = q.eq('paese', paese);
  if (origine) q = q.eq('origine', origine);
  
  const { data, error } = await q.limit(limit);
  if (error) throw error;
  
  return { contacts: data, count: data?.length || 0 };
}

async function getRubricaByFilters(supabase: any, params: any) {
  const { paese, citta, origine, has_activities } = params;
  
  let q = supabase.from('rubrica').select('*');
  
  if (paese) q = q.eq('paese', paese);
  if (citta) q = q.ilike('citta', `%${citta}%`);
  if (origine) q = q.eq('origine', origine);
  
  const { data, error } = await q;
  if (error) throw error;
  
  // Se richiesto filtro attività, carica e filtra
  if (has_activities) {
    const contactIds = data.map((c: any) => c.id);
    const { data: activities } = await supabase
      .from('attivita')
      .select('rubrica_id')
      .in('rubrica_id', contactIds);
    
    const contactsWithActivities = new Set(activities?.map((a: any) => a.rubrica_id));
    const filtered = data.filter((c: any) => contactsWithActivities.has(c.id));
    
    return { contacts: filtered, count: filtered.length };
  }
  
  return { contacts: data, count: data?.length || 0 };
}

// ===== IMPORT TEMPLATES =====

async function getImportLogs(supabase: any, params: any) {
  const { limit = 10, stato } = params;
  
  let q = supabase
    .from('import_logs')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (stato) q = q.eq('stato', stato);
  
  const { data, error } = await q.limit(limit);
  if (error) throw error;
  
  return { imports: data, count: data?.length || 0 };
}

async function getImportedContactsStats(supabase: any) {
  const stats: any = {};
  
  // Totali importati
  const { count: totalImported } = await supabase
    .from('imported_contacts').select('*', { count: 'exact', head: true });
  stats.contatti_importati_totali = totalImported;
  
  // Già trasferiti a rubrica
  const { count: transferred } = await supabase
    .from('imported_contacts')
    .select('*', { count: 'exact', head: true })
    .eq('is_imported_to_rubrica', true);
  stats.trasferiti_rubrica = transferred;
  
  // Da trasferire
  stats.da_trasferire = (totalImported || 0) - (transferred || 0);
  
  // Import logs
  const { count: logsCount } = await supabase
    .from('import_logs').select('*', { count: 'exact', head: true });
  stats.import_logs_totali = logsCount;
  
  return stats;
}

async function searchImportedContacts(supabase: any, params: any) {
  const { query, origin, limit = 20 } = params;
  
  let q = supabase
    .from('imported_contacts')
    .select('id, name, company_name, email, phone, city, country, origin');
  
  if (query) {
    q = q.or(`name.ilike.%${query}%, company_name.ilike.%${query}%, email.ilike.%${query}%`);
  }
  
  if (origin) q = q.eq('origin', origin);
  
  const { data, error } = await q.limit(limit);
  if (error) throw error;
  
  return { contacts: data, count: data?.length || 0 };
}

// ===== ATTIVITÀ AVANZATE =====

async function getActivitiesStatistics(supabase: any) {
  const stats: any = {};
  
  // Totali
  const { count: totalActivities } = await supabase
    .from('attivita').select('*', { count: 'exact', head: true });
  stats.attivita_totali = totalActivities;
  
  // Per stato
  const { data: activities } = await supabase.from('attivita').select('stato, tipo, priorita');
  
  const statusMap: Record<string, number> = {};
  const typeMap: Record<string, number> = {};
  const priorityMap: Record<string, number> = {};
  
  activities?.forEach((a: any) => {
    statusMap[a.stato] = (statusMap[a.stato] || 0) + 1;
    typeMap[a.tipo] = (typeMap[a.tipo] || 0) + 1;
    priorityMap[a.priorita] = (priorityMap[a.priorita] || 0) + 1;
  });
  
  stats.per_stato = statusMap;
  stats.per_tipo = typeMap;
  stats.per_priorita = priorityMap;
  
  // Scadute
  const { count: overdue } = await supabase
    .from('attivita')
    .select('*', { count: 'exact', head: true })
    .lt('scadenza', new Date().toISOString())
    .neq('stato', 'completata');
  stats.scadute = overdue;
  
  return stats;
}

async function getActivitiesByStatus(supabase: any, params: any) {
  const { stato, limit = 20 } = params;
  
  const { data, error } = await supabase
    .from('attivita')
    .select('*')
    .eq('stato', stato)
    .order('data_creazione', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return { activities: data, count: data?.length || 0 };
}

async function getOverdueActivities(supabase: any) {
  const { data, error } = await supabase
    .from('attivita')
    .select('*')
    .lt('scadenza', new Date().toISOString())
    .neq('stato', 'completata')
    .order('scadenza', { ascending: true })
    .limit(20);
  
  if (error) throw error;
  return { activities: data, count: data?.length || 0 };
}

async function getUserActivities(supabase: any, params: any) {
  const { user_id, limit = 20 } = params;
  
  const { data, error } = await supabase
    .from('attivita')
    .select('*')
    .eq('assegnato_a', user_id)
    .order('data_creazione', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return { activities: data, count: data?.length || 0 };
}

// ===== CAMPAGNE AVANZATE =====

async function getCampaignsStatistics(supabase: any) {
  const stats: any = {};
  
  // Totali
  const { count: totalCampaigns } = await supabase
    .from('campagne').select('*', { count: 'exact', head: true });
  stats.campagne_totali = totalCampaigns;
  
  // Per stato
  const { data: campaigns } = await supabase.from('campagne').select('stato, budget');
  
  const statusMap: Record<string, number> = {};
  let totalBudget = 0;
  
  campaigns?.forEach((c: any) => {
    statusMap[c.stato] = (statusMap[c.stato] || 0) + 1;
    totalBudget += c.budget || 0;
  });
  
  stats.per_stato = statusMap;
  stats.budget_totale = totalBudget;
  
  // Attive ora
  const now = new Date().toISOString();
  const { count: active } = await supabase
    .from('campagne')
    .select('*', { count: 'exact', head: true })
    .eq('stato', 'attiva')
    .lte('inizio', now)
    .gte('fine', now);
  stats.attive_ora = active;
  
  return stats;
}

async function getCampaignPerformance(supabase: any, params: any) {
  const { campaign_id } = params;
  
  // Carica campagna
  const { data: campaign, error: campError } = await supabase
    .from('campagne')
    .select('*')
    .eq('id', campaign_id)
    .single();
  
  if (campError) throw campError;
  
  // Conta attività associate
  const { count: activitiesCount } = await supabase
    .from('attivita')
    .select('*', { count: 'exact', head: true })
    .eq('campagna_id', campaign_id);
  
  // Conta email in coda
  const { count: queueCount } = await supabase
    .from('email_campagne_queue')
    .select('*', { count: 'exact', head: true })
    .eq('campagna_nome', campaign.nome);
  
  return {
    campaign,
    activities_count: activitiesCount,
    email_queue_count: queueCount
  };
}

async function getActiveCampaigns(supabase: any) {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('campagne')
    .select('*')
    .eq('stato', 'attiva')
    .lte('inizio', now)
    .gte('fine', now);
  
  if (error) throw error;
  return { campaigns: data, count: data?.length || 0 };
}