import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  operation: 'stats' | 'search' | 'insights' | 'actions';
  filters?: {
    folders?: string[];
    dateRange?: { from: string; to: string };
    sender?: string;
    keywords?: string[];
  };
  context?: string;
}

// 🆕 ZERO-SYNC: Helper to fetch data from TMWE API
async function fetchFromTMWEApi(handler: string, params: Record<string, any> = {}): Promise<any> {
  const TMWE_API_URL = Deno.env.get('TMWE_API_URL') || 'https://findair.it/erp/tmwe_json';
  const TMWE_API_KEY = Deno.env.get('TMWE_API_KEY');
  
  if (!TMWE_API_KEY) {
    console.warn('⚠️ [Zero-Sync] TMWE_API_KEY not configured, using fallback mode');
    return null;
  }

  try {
    const response = await fetch(`${TMWE_API_URL}/email_search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TMWE_API_KEY}`
      },
      body: JSON.stringify({
        handler,
        ...params
      })
    });

    if (!response.ok) {
      console.error(`❌ [Zero-Sync] TMWE API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ [Zero-Sync] TMWE API fetch error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { operation, filters, context, selected_agent = 'gemini' } = await req.json() as AnalysisRequest & { selected_agent?: string };
    
    console.log(`[fun-email-ai-analysis] Operation: ${operation}, Agent: ${selected_agent}`, { filters, context });

    let result: any;

    switch (operation) {
      case 'stats':
        result = await getStats(supabaseClient, user.email!, filters);
        break;
      case 'search':
        result = await searchEmails(supabaseClient, user.email!, filters);
        break;
      case 'insights':
        result = await getInsights(supabaseClient, user.email!, filters);
        break;
      case 'actions':
        result = await suggestActions(supabaseClient, user.email!, filters);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid operation' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[fun-email-ai-analysis] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// 🆕 ZERO-SYNC: Stats using TMWE API with local fallback
async function getStats(supabase: any, userEmail: string, filters?: any) {
  console.log('📊 [Zero-Sync] getStats for:', userEmail);
  
  // Try TMWE API first
  const tmweData = await fetchFromTMWEApi('get_folder_info', {
    folder_name: filters?.folders?.[0] || 'INBOX',
    timeout: 10
  });

  if (tmweData?.folder) {
    console.log('✅ [Zero-Sync] Using TMWE API stats');
    return {
      totalEmails: tmweData.folder.total_messages || tmweData.folder.messages || 0,
      folderBreakdown: { [filters?.folders?.[0] || 'INBOX']: tmweData.folder.total_messages || 0 },
      topSenders: [], // Would need separate search call
      withAttachments: tmweData.folder.with_attachments || 0,
      dateRange: {
        earliest: null,
        latest: null,
      },
      source: 'tmwe_api'
    };
  }

  // Fallback to local DB
  console.log('📦 [Fallback] Using local email_messages table');
  
  let query = supabase
    .from('email_messages')
    .select('*', { count: 'exact', head: false })
    .eq('user_email', userEmail)
    .eq('sync_status', 'fun_email_backup');

  if (filters?.folders?.length) {
    query = query.in('cartella', filters.folders);
  }
  if (filters?.dateRange?.from) {
    query = query.gte('data_ricezione', filters.dateRange.from);
  }
  if (filters?.dateRange?.to) {
    query = query.lte('data_ricezione', filters.dateRange.to);
  }

  const { data: emails, count, error } = await query;
  if (error) throw error;

  const folderCounts = emails?.reduce((acc: any, email: any) => {
    acc[email.cartella] = (acc[email.cartella] || 0) + 1;
    return acc;
  }, {}) || {};

  const senderCounts = emails?.reduce((acc: any, email: any) => {
    const sender = email.from_email || 'Unknown';
    acc[sender] = (acc[sender] || 0) + 1;
    return acc;
  }, {}) || {};

  const topSenders = Object.entries(senderCounts)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 10)
    .map(([sender, count]) => ({ sender, count }));

  const withAttachments = emails?.filter((e: any) => e.has_attachments).length || 0;

  return {
    totalEmails: count,
    folderBreakdown: folderCounts,
    topSenders,
    withAttachments,
    dateRange: {
      earliest: emails?.[0]?.data_ricezione,
      latest: emails?.[emails.length - 1]?.data_ricezione,
    },
    source: 'local_db'
  };
}

// 🆕 ZERO-SYNC: Search using TMWE API with local fallback
async function searchEmails(supabase: any, userEmail: string, filters?: any) {
  console.log('🔍 [Zero-Sync] searchEmails for:', userEmail);

  // Try TMWE API first
  if (filters?.keywords?.length || filters?.sender) {
    const tmweData = await fetchFromTMWEApi('search_emails', {
      query: filters?.keywords?.[0] || filters?.sender || '',
      search_folder: filters?.folders?.[0] || 'INBOX',
      limit: 50,
      timeout: 15
    });

    if (tmweData?.emails && tmweData.emails.length > 0) {
      console.log('✅ [Zero-Sync] Using TMWE API search results:', tmweData.emails.length);
      return {
        results: tmweData.emails.map((email: any) => ({
          id: email.id || email.email_id,
          tmwe_email_id: email.id || email.email_id,
          subject: email.subject,
          from: email.from?.email || email.from_email || email.sender,
          date: email.date || email.received_at,
          preview: email.snippet || email.body_preview || '',
          hasAttachments: email.has_attachments || email.attachment_count > 0,
        })),
        count: tmweData.emails.length,
        source: 'tmwe_api'
      };
    }
  }

  // Fallback to local DB
  console.log('📦 [Fallback] Using local email_messages table');
  
  let query = supabase
    .from('email_messages')
    .select('*')
    .eq('user_email', userEmail)
    .eq('sync_status', 'fun_email_backup')
    .order('data_ricezione', { ascending: false })
    .limit(50);

  if (filters?.folders?.length) {
    query = query.in('cartella', filters.folders);
  }
  if (filters?.sender) {
    query = query.ilike('from_email', `%${filters.sender}%`);
  }
  if (filters?.keywords?.length) {
    const keyword = filters.keywords[0];
    query = query.or(`subject.ilike.%${keyword}%,body_text.ilike.%${keyword}%`);
  }
  if (filters?.dateRange?.from) {
    query = query.gte('data_ricezione', filters.dateRange.from);
  }
  if (filters?.dateRange?.to) {
    query = query.lte('data_ricezione', filters.dateRange.to);
  }

  const { data, error } = await query;
  if (error) throw error;

  return {
    results: data?.map((email: any) => ({
      id: email.id,
      subject: email.subject,
      from: email.from_email,
      date: email.data_ricezione,
      preview: email.body_text?.substring(0, 150),
      hasAttachments: email.has_attachments,
    })) || [],
    count: data?.length || 0,
    source: 'local_db'
  };
}

// 🆕 ZERO-SYNC: Insights using TMWE API with local fallback
async function getInsights(supabase: any, userEmail: string, filters?: any) {
  console.log('💡 [Zero-Sync] getInsights for:', userEmail);

  // Try TMWE API first for metadata
  const tmweData = await fetchFromTMWEApi('get_emails_metadata', {
    folder: filters?.folders?.[0] || 'INBOX',
    limit: 500,
    timeout: 15
  });

  if (tmweData?.emails && tmweData.emails.length > 0) {
    console.log('✅ [Zero-Sync] Using TMWE API for insights:', tmweData.emails.length, 'emails');
    
    const emails = tmweData.emails;
    
    const noReplies = emails.filter((e: any) => 
      !e.subject?.toLowerCase().startsWith('re:')
    ).length;

    const activeThreads = emails.filter((e: any) => 
      e.subject?.toLowerCase().startsWith('re:')
    ).length;

    const words = emails.flatMap((e: any) => 
      e.subject?.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4) || []
    );
    
    const wordCounts = words.reduce((acc: any, word: string) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});

    const topKeywords = Object.entries(wordCounts)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    return {
      noReplies,
      activeThreads,
      topKeywords,
      insights: [
        `${noReplies} email potrebbero richiedere una risposta`,
        `${activeThreads} conversazioni attive in corso`,
        `Parole chiave più frequenti: ${topKeywords.slice(0, 3).map(k => k.word).join(', ')}`,
      ],
      source: 'tmwe_api'
    };
  }

  // Fallback to local DB
  console.log('📦 [Fallback] Using local email_messages table');
  
  const { data: emails, error } = await supabase
    .from('email_messages')
    .select('*')
    .eq('user_email', userEmail)
    .eq('sync_status', 'fun_email_backup')
    .order('data_ricezione', { ascending: false })
    .limit(1000);

  if (error) throw error;

  const noReplies = emails?.filter((e: any) => 
    !e.subject?.toLowerCase().startsWith('re:')
  ).length || 0;

  const activeThreads = emails?.filter((e: any) => 
    e.subject?.toLowerCase().startsWith('re:')
  ).length || 0;

  const words = emails?.flatMap((e: any) => 
    e.subject?.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4) || []
  ) || [];
  
  const wordCounts = words.reduce((acc: any, word: string) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});

  const topKeywords = Object.entries(wordCounts)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  return {
    noReplies,
    activeThreads,
    topKeywords,
    insights: [
      `${noReplies} email potrebbero richiedere una risposta`,
      `${activeThreads} conversazioni attive in corso`,
      `Parole chiave più frequenti: ${topKeywords.slice(0, 3).map(k => k.word).join(', ')}`,
    ],
    source: 'local_db'
  };
}

// 🆕 ZERO-SYNC: Actions using TMWE API with local fallback
async function suggestActions(supabase: any, userEmail: string, filters?: any) {
  console.log('⚡ [Zero-Sync] suggestActions for:', userEmail);

  // Try TMWE API first
  const tmweData = await fetchFromTMWEApi('get_emails_metadata', {
    folder: filters?.folders?.[0] || 'INBOX',
    limit: 500,
    timeout: 15
  });

  if (tmweData?.emails && tmweData.emails.length > 0) {
    console.log('✅ [Zero-Sync] Using TMWE API for action suggestions');
    
    const emails = tmweData.emails;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const archiveCandidates = emails.filter((e: any) => {
      const emailDate = new Date(e.date || e.received_at);
      return emailDate < thirtyDaysAgo && !e.has_attachments;
    }).length;

    const followUpNeeded = emails.filter((e: any) => {
      const emailDate = new Date(e.date || e.received_at);
      return emailDate > sevenDaysAgo && !e.subject?.toLowerCase().startsWith('re:');
    }).length;

    const urgentKeywords = ['urgent', 'urgente', 'asap', 'importante', 'critical'];
    const highPriority = emails.filter((e: any) => 
      urgentKeywords.some(keyword => 
        e.subject?.toLowerCase().includes(keyword)
      )
    ).length;

    return {
      suggestions: [
        {
          action: 'archive',
          count: archiveCandidates,
          description: `${archiveCandidates} email più vecchie di 30 giorni potrebbero essere archiviate`,
          priority: 'low',
        },
        {
          action: 'follow_up',
          count: followUpNeeded,
          description: `${followUpNeeded} email recenti potrebbero richiedere un follow-up`,
          priority: 'medium',
        },
        {
          action: 'review_urgent',
          count: highPriority,
          description: `${highPriority} email contengono parole chiave urgenti`,
          priority: 'high',
        },
      ],
      source: 'tmwe_api'
    };
  }

  // Fallback to local DB
  console.log('📦 [Fallback] Using local email_messages table');
  
  const { data: emails, error } = await supabase
    .from('email_messages')
    .select('*')
    .eq('user_email', userEmail)
    .eq('sync_status', 'fun_email_backup')
    .order('data_ricezione', { ascending: false })
    .limit(500);

  if (error) throw error;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const archiveCandidates = emails?.filter((e: any) => {
    const emailDate = new Date(e.data_ricezione);
    return emailDate < thirtyDaysAgo && !e.has_attachments;
  }).length || 0;

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const followUpNeeded = emails?.filter((e: any) => {
    const emailDate = new Date(e.data_ricezione);
    return emailDate > sevenDaysAgo && !e.subject?.toLowerCase().startsWith('re:');
  }).length || 0;

  const urgentKeywords = ['urgent', 'urgente', 'asap', 'importante', 'critical'];
  const highPriority = emails?.filter((e: any) => 
    urgentKeywords.some(keyword => 
      e.subject?.toLowerCase().includes(keyword) || 
      e.body_text?.toLowerCase().includes(keyword)
    )
  ).length || 0;

  return {
    suggestions: [
      {
        action: 'archive',
        count: archiveCandidates,
        description: `${archiveCandidates} email più vecchie di 30 giorni potrebbero essere archiviate`,
        priority: 'low',
      },
      {
        action: 'follow_up',
        count: followUpNeeded,
        description: `${followUpNeeded} email recenti potrebbero richiedere un follow-up`,
        priority: 'medium',
      },
      {
        action: 'review_urgent',
        count: highPriority,
        description: `${highPriority} email contengono parole chiave urgenti`,
        priority: 'high',
      },
    ],
    source: 'local_db'
  };
}
