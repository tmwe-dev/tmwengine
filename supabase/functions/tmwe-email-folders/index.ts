import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FoldersRequest {
  user_email?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_email }: FoldersRequest = await req.json();
    console.log('📁 TMWE Email Folders - user_email:', user_email);

    // SOLUZIONE 1: Ottieni cartelle dal database dei messaggi
    // Questo funziona sempre perché usa i dati già sincronizzati
    const { data: dbFolders, error: dbError } = await supabase
      .from('email_messages')
      .select('cartella, stato')
      .not('cartella', 'is', null);

    if (dbError) {
      console.error('❌ Errore query database:', dbError);
      throw dbError;
    }

    console.log(`📊 Messaggi trovati: ${dbFolders?.length || 0}`);

    // Estrai cartelle uniche e conta messaggi
    const folderMap = new Map<string, { total_messages: number; unread_messages: number }>();
    
    if (dbFolders && dbFolders.length > 0) {
      for (const msg of dbFolders) {
        const folderName = msg.cartella || 'INBOX';
        
        if (!folderMap.has(folderName)) {
          folderMap.set(folderName, {
            total_messages: 0,
            unread_messages: 0
          });
        }
        
        const folder = folderMap.get(folderName)!;
        folder.total_messages++;
        
        // Conta messaggi non letti (stato = 'nuovo')
        if (msg.stato === 'nuovo') {
          folder.unread_messages++;
        }
      }
    }

    // Se non ci sono cartelle nel database, usa cartelle IMAP standard
    if (folderMap.size === 0) {
      console.log('⚠️ Nessuna cartella nel database, uso cartelle IMAP standard');
      
      const standardFolders = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam'];
      for (const name of standardFolders) {
        folderMap.set(name, {
          total_messages: 0,
          unread_messages: 0
        });
      }
    }

    // Converti in array
    const folders = Array.from(folderMap.entries()).map(([name, counts]) => ({
      name,
      path: name,
      parent: null,
      total_messages: counts.total_messages,
      unread_messages: counts.unread_messages,
      is_special: ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam'].includes(name),
      special_use: getSpecialUse(name)
    }));

    console.log(`✅ Cartelle trovate: ${folders.length}`);
    folders.forEach(f => {
      console.log(`  - ${f.name}: ${f.total_messages} messaggi (${f.unread_messages} non letti)`);
    });

    return new Response(JSON.stringify({
      success: true,
      folders: folders
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ ERRORE tmwe-email-folders:', error);
    
    // In caso di errore, ritorna almeno le cartelle standard
    const fallbackFolders = [
      { name: 'INBOX', path: 'INBOX', parent: null, total_messages: 0, unread_messages: 0, is_special: true, special_use: 'inbox' },
      { name: 'Sent', path: 'Sent', parent: null, total_messages: 0, unread_messages: 0, is_special: true, special_use: 'sent' },
      { name: 'Drafts', path: 'Drafts', parent: null, total_messages: 0, unread_messages: 0, is_special: true, special_use: 'drafts' },
      { name: 'Trash', path: 'Trash', parent: null, total_messages: 0, unread_messages: 0, is_special: true, special_use: 'trash' }
    ];

    return new Response(JSON.stringify({
      success: true,
      folders: fallbackFolders,
      warning: 'Usando cartelle standard IMAP come fallback'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }
});

function getSpecialUse(folderName: string): string | null {
  const lowerName = folderName.toLowerCase();
  
  if (lowerName === 'inbox') return 'inbox';
  if (lowerName === 'sent' || lowerName === 'sent items') return 'sent';
  if (lowerName === 'drafts') return 'drafts';
  if (lowerName === 'trash' || lowerName === 'deleted' || lowerName === 'bin') return 'trash';
  if (lowerName === 'spam' || lowerName === 'junk') return 'spam';
  if (lowerName === 'archive') return 'archive';
  
  return null;
}
