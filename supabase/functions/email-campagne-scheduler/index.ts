import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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

    console.log('🔄 Email Campaign Scheduler avviato');

    // 1. Trova campagne attive con data_ora_programmata raggiunta
    const { data: emailsToSend, error: fetchError } = await supabaseClient
      .from('email_campagne_queue')
      .select('*')
      .in('stato', ['programmata', 'in_coda'])
      .lte('data_ora_programmata', new Date().toISOString())
      .order('data_ora_programmata', { ascending: true });

    if (fetchError) throw fetchError;

    if (!emailsToSend || emailsToSend.length === 0) {
      console.log('✅ Nessuna email da inviare al momento');
      return new Response(JSON.stringify({ message: 'Nessuna email in coda' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`📧 Trovate ${emailsToSend.length} email potenziali da processare`);

    // 2. Raggruppa per campagna_nome
    const campaignGroups: { [key: string]: typeof emailsToSend } = {};
    emailsToSend.forEach(email => {
      if (!campaignGroups[email.campagna_nome]) {
        campaignGroups[email.campagna_nome] = [];
      }
      campaignGroups[email.campagna_nome].push(email);
    });

    let totalSent = 0;
    let totalErrors = 0;

    // 3. Per ogni campagna, gestisci l'invio rispettando l'intervallo
    for (const [campaignName, emails] of Object.entries(campaignGroups)) {
      console.log(`📋 Processando campagna: ${campaignName} (${emails.length} email)`);

      const intervalMinutes = emails[0].intervallo_minuti || 2;

      // Trova l'ultima email inviata in questa campagna per calcolare l'intervallo
      const { data: lastSent } = await supabaseClient
        .from('email_campagne_queue')
        .select('data_ora_invio')
        .eq('campagna_nome', campaignName)
        .eq('stato', 'inviata')
        .order('data_ora_invio', { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = new Date();
      const canSendNow = !lastSent || 
        (now.getTime() - new Date(lastSent.data_ora_invio).getTime()) >= (intervalMinutes * 60 * 1000);

      if (!canSendNow) {
        console.log(`⏳ Intervallo non ancora trascorso per ${campaignName}, salto`);
        continue;
      }

      // Invia solo la PRIMA email in coda per questa campagna (rispetta intervallo)
      const emailToSend = emails.find(e => e.stato === 'programmata' || e.stato === 'in_coda');
      
      if (!emailToSend) {
        console.log(`⚠️ Nessuna email pronta per ${campaignName}`);
        continue;
      }

      // ⚠️ CONTROLLO TENTATIVI - Se ha superato max_tentativi, segna come errore permanente
      if (emailToSend.tentativi_invio >= emailToSend.max_tentativi) {
        console.log(`❌ Email ${emailToSend.destinatario_email} ha superato max tentativi (${emailToSend.max_tentativi})`);
        
        await supabaseClient
          .from('email_campagne_queue')
          .update({ 
            stato: 'errore',
            errore_dettaglio: `Superato numero massimo di tentativi (${emailToSend.max_tentativi})`
          })
          .eq('id', emailToSend.id);
        
        totalErrors++;
        continue;
      }

      // Segna come "in_invio"
      await supabaseClient
        .from('email_campagne_queue')
        .update({ stato: 'in_invio' })
        .eq('id', emailToSend.id);

      // Chiama tmwe-api-proxy per inviare l'email
      const { data: sendResult, error: sendError } = await supabaseClient.functions.invoke(
        'tmwe-api-proxy',
        {
          body: {
            handler: 'email_send',
            to: emailToSend.destinatario_email,
            subject: emailToSend.oggetto,
            body_text: emailToSend.corpo_testo,
            body_html: emailToSend.corpo_html
          }
        }
      );

      if (sendError) {
        console.error(`❌ Errore invio ${emailToSend.destinatario_email}:`, sendError);
        
        const nuoviTentativi = emailToSend.tentativi_invio + 1;
        const haRaggiuntoMax = nuoviTentativi >= emailToSend.max_tentativi;
        
        // Aggiorna come errore (se ha raggiunto max) o rimetti in coda per ritentare
        await supabaseClient
          .from('email_campagne_queue')
          .update({
            stato: haRaggiuntoMax ? 'errore' : 'programmata', // Riprova o errore definitivo
            errore_dettaglio: `${sendError.message} (Tentativo ${nuoviTentativi}/${emailToSend.max_tentativi})`,
            tentativi_invio: nuoviTentativi
          })
          .eq('id', emailToSend.id);
        
        totalErrors++;
      } else {
        console.log(`✅ Email inviata con successo a ${emailToSend.destinatario_email}`);
        
        // Aggiorna come inviata
        await supabaseClient
          .from('email_campagne_queue')
          .update({
            stato: 'inviata',
            data_ora_invio: new Date().toISOString(),
            message_id: sendResult?.message_id,
            tentativi_invio: emailToSend.tentativi_invio + 1
          })
          .eq('id', emailToSend.id);
        
        totalSent++;
      }
    }

    console.log(`✅ Scheduler completato: ${totalSent} inviate, ${totalErrors} errori`);

    return new Response(
      JSON.stringify({
        success: true,
        totalSent,
        totalErrors,
        message: `Processate ${totalSent + totalErrors} email`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Errore nello scheduler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
