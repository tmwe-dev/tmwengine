import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, title, body, url, callId, roomId } = await req.json();

    console.log('Sending push notification to user:', userId);

    // Inizializza Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Recupera il push_token dell'utente
    const { data: prefs, error: prefsError } = await supabaseAdmin
      .from('user_notification_preferences')
      .select('push_token, push_notifications_enabled')
      .eq('user_id', userId)
      .eq('push_notifications_enabled', true)
      .maybeSingle();

    if (prefsError) {
      console.error('Error fetching notification preferences:', prefsError);
      return new Response(
        JSON.stringify({ error: 'Error fetching notification preferences' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!prefs?.push_token) {
      console.log('User has not enabled push notifications or has no token');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User has not enabled push notifications' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse subscription
    let subscription;
    try {
      subscription = JSON.parse(prefs.push_token);
    } catch (parseError) {
      console.error('Error parsing push token:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid push token format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Prepara payload per Web Push
    const payload = JSON.stringify({
      title,
      body,
      url: url || '/',
      callId,
      roomId,
      tag: `notification-${Date.now()}`
    });

    console.log('Push notification payload:', payload);
    console.log('Subscription endpoint:', subscription.endpoint);

    // 4. Configura VAPID details
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@example.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('❌ VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured. Please add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webpush.setVapidDetails(
      vapidEmail,
      vapidPublicKey,
      vapidPrivateKey
    );

    console.log('📤 Sending push notification to:', subscription.endpoint);

    // 5. Invia notifica usando Web Push Protocol
    try {
      await webpush.sendNotification(subscription, payload);
      console.log('✅ Push notification sent successfully!');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Push notification sent successfully',
          endpoint: subscription.endpoint
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (pushError: any) {
      console.error('❌ Error sending push notification:', pushError);
      
      // Se il token è scaduto o invalido, rimuovilo dal database
      if (pushError.statusCode === 410 || pushError.statusCode === 404) {
        console.log('🗑️ Removing expired push token');
        await supabaseAdmin
          .from('user_notification_preferences')
          .update({ push_token: null })
          .eq('user_id', userId);
      }

      return new Response(
        JSON.stringify({ 
          error: 'Failed to send push notification',
          details: pushError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
