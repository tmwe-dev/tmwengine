import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, TestTube } from 'lucide-react';
import { VAPID_CONFIG } from '@/config/vapid';

export default function NotificationSettings() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>('');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkNotificationSupport();
    loadUserPreferences();
  }, []);

  const checkNotificationSupport = () => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setBrowserSupported(supported);
    if (supported) {
      setPermissionStatus(Notification.permission);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('push_notifications_enabled, push_token')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setPushEnabled(data.push_notifications_enabled || false);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const togglePushNotifications = async (enabled: boolean) => {
    if (!browserSupported) {
      toast({
        title: 'Browser non supportato',
        description: 'Il tuo browser non supporta le notifiche push.',
        variant: 'destructive'
      });
      return;
    }

    if (enabled) {
      // Abilita notifiche
      try {
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);

        if (permission !== 'granted') {
          toast({
            title: 'Permesso negato',
            description: 'Devi concedere il permesso per le notifiche dal browser.',
            variant: 'destructive'
          });
          return;
        }

        // Registra service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Ottieni subscription
        const subscription = await (registration as any).pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_CONFIG.publicKey) as BufferSource
        });

        // Salva nel database
        const { error } = await supabase
          .from('user_notification_preferences')
          .upsert({
            user_id: userId,
            push_notifications_enabled: true,
            push_token: JSON.stringify(subscription),
            onboarding_completed: true
          });

        if (error) throw error;

        setPushEnabled(true);
        toast({
          title: '✅ Notifiche abilitate',
          description: 'Riceverai notifiche anche quando l\'app è chiusa.'
        });
      } catch (error: any) {
        console.error('Error enabling notifications:', error);
        toast({
          title: 'Errore',
          description: error.message || 'Impossibile abilitare le notifiche',
          variant: 'destructive'
        });
      }
    } else {
      // Disabilita notifiche
      try {
        const { error } = await supabase
          .from('user_notification_preferences')
          .update({
            push_notifications_enabled: false,
            push_token: null
          })
          .eq('user_id', userId);

        if (error) throw error;

        setPushEnabled(false);
        toast({
          title: 'Notifiche disabilitate',
          description: 'Non riceverai più notifiche push.'
        });
      } catch (error: any) {
        console.error('Error disabling notifications:', error);
        toast({
          title: 'Errore',
          description: 'Impossibile disabilitare le notifiche',
          variant: 'destructive'
        });
      }
    }
  };

  const testNotification = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: userId,
          title: '🔔 Notifica di Test',
          body: 'Se vedi questo messaggio, le notifiche funzionano correttamente!',
          url: '/notification-settings'
        }
      });

      if (error) throw error;

      toast({
        title: 'Notifica inviata',
        description: 'Controlla se hai ricevuto la notifica (anche con app chiusa).'
      });
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile inviare la notifica di test',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-10 text-center">
            Caricamento...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Impostazioni Notifiche</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {pushEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            Notifiche Push
          </CardTitle>
          <CardDescription>
            Ricevi notifiche anche quando l'app è chiusa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!browserSupported ? (
            <div className="p-4 bg-destructive/10 text-destructive rounded-md">
              ⚠️ Il tuo browser non supporta le notifiche push.
            </div>
          ) : permissionStatus === 'denied' ? (
            <div className="p-4 bg-destructive/10 text-destructive rounded-md">
              ❌ Hai bloccato le notifiche per questo sito. 
              <br />
              Vai nelle impostazioni del browser per sbloccarle.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-medium">Abilita notifiche push</div>
                  <div className="text-sm text-muted-foreground">
                    Riceverai notifiche per messaggi e chiamate
                  </div>
                </div>
                <Switch
                  checked={pushEnabled}
                  onCheckedChange={togglePushNotifications}
                />
              </div>

              {pushEnabled && (
                <Button 
                  onClick={testNotification} 
                  variant="outline" 
                  className="w-full"
                >
                  <TestTube className="mr-2 h-4 w-4" />
                  Testa Notifica
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Come funzionano le notifiche</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <strong>✅ Con app aperta:</strong> Vedrai toast (popup neri) in tempo reale
          </div>
          <div>
            <strong>🔔 Con app chiusa:</strong> Riceverai notifiche desktop (se abilitate)
          </div>
          <div>
            <strong>📱 Browser supportati:</strong> Chrome, Firefox, Edge, Safari 16.4+
          </div>
          <div>
            <strong>⚠️ Limitazioni:</strong> Non funziona in modalità incognito o se neghi il permesso
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
