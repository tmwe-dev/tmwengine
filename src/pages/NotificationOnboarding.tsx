import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Helper per convertire VAPID key
function urlBase64ToUint8Array(base64String: string) {
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
}

export default function NotificationOnboarding() {
  const navigate = useNavigate();
  const [isEnabling, setIsEnabling] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(true);

  useEffect(() => {
    // Controlla se le notifiche sono supportate
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotificationsSupported(false);
    }
  }, []);

  const enableNotifications = async () => {
    setIsEnabling(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // 1. Richiedi permesso browser
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        let pushToken = null;
        
        try {
          // 2. Registra Service Worker
          const registration = await navigator.serviceWorker.register('/sw.js');
          await registration.update();
          
          // 3. Ottieni subscription (Web Push API)
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BNuV8KBQVvqT6z4yJX0R9kYv8F3Xr2HzL6mN9pQ1sT2uV3wX4yZ5A6bC7dE8fG9hH0iJ1kL2mN3oP4qR5sT6uV7wX8yZ9'
            )
          });
          
          pushToken = JSON.stringify(subscription);
        } catch (swError) {
          console.warn('Service Worker registration failed, saving preferences without token:', swError);
        }
        
        // 4. Salva nel database
        await supabase
          .from('user_notification_preferences')
          .upsert({
            user_id: user.id,
            push_notifications_enabled: true,
            push_token: pushToken,
            onboarding_completed: true
          });
        
        toast({
          title: "✅ Notifiche abilitate",
          description: "Riceverai notifiche anche quando l'app è chiusa",
        });
        
        navigate('/');
      } else if (permission === 'denied') {
        // Salva che ha rifiutato
        await supabase
          .from('user_notification_preferences')
          .upsert({
            user_id: user.id,
            push_notifications_enabled: false,
            onboarding_completed: true
          });
        
        toast({
          title: "Permesso negato",
          description: "Puoi riattivare le notifiche dalle impostazioni del browser",
          variant: "destructive"
        });
        
        navigate('/');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: "Errore",
        description: "Impossibile abilitare le notifiche",
        variant: "destructive"
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const skipOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          push_notifications_enabled: false,
          onboarding_completed: true
        });
      
      navigate('/');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      navigate('/');
    }
  };

  if (!notificationsSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center">
              <BellOff className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Notifiche non supportate</CardTitle>
            <CardDescription className="text-base mt-2">
              Il tuo browser non supporta le notifiche push.
              Utilizza un browser moderno come Chrome, Firefox o Edge.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Button
              onClick={() => navigate('/')}
              className="w-full h-12 text-lg"
              size="lg"
            >
              Continua senza notifiche
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Resta sempre connesso</CardTitle>
          <CardDescription className="text-base mt-2">
            Vuoi ricevere notifiche audio anche quando l'app è chiusa?
            <br />
            <span className="font-medium text-foreground/80">
              Potrai ricevere avvisi per chiamate e messaggi importanti.
            </span>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Button
            onClick={enableNotifications}
            disabled={isEnabling}
            className="w-full h-12 text-lg"
            size="lg"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            {isEnabling ? 'Abilitazione...' : 'Sì, abilita notifiche'}
          </Button>
          
          <Button
            onClick={skipOnboarding}
            variant="outline"
            className="w-full h-12 text-lg"
            size="lg"
          >
            <BellOff className="mr-2 h-5 w-5" />
            No, forse più tardi
          </Button>
          
          <button
            onClick={skipOnboarding}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-4"
          >
            Salta questo passaggio
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
