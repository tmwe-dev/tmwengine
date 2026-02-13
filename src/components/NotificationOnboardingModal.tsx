import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bell, BellOff, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { VAPID_CONFIG } from '@/config/vapid';

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

interface NotificationOnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationOnboardingModal({ open, onClose }: NotificationOnboardingModalProps) {
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
          const subscription = await (registration as any).pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_CONFIG.publicKey)
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
        
        onClose();
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
        
        onClose();
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
      
      onClose();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      onClose();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Se chiude il modal con X, salva come "non interessato"
      skipOnboarding();
    }
  };

  if (!notificationsSupported) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <BellOff className="h-8 w-8 text-destructive" />
            </div>
            <DialogTitle className="text-center">Notifiche non supportate</DialogTitle>
            <DialogDescription className="text-center">
              Il tuo browser non supporta le notifiche push.
              Utilizza un browser moderno come Chrome, Firefox o Edge.
            </DialogDescription>
          </DialogHeader>
          
          <Button
            onClick={() => onClose()}
            className="w-full"
            size="lg"
          >
            Continua senza notifiche
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center">Resta sempre connesso</DialogTitle>
          <DialogDescription className="text-center">
            Vuoi ricevere notifiche audio anche quando l'app è chiusa?
            <br />
            <span className="font-medium text-foreground/80 text-sm">
              Potrai ricevere avvisi per chiamate e messaggi importanti.
            </span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          <Button
            onClick={enableNotifications}
            disabled={isEnabling}
            className="w-full"
            size="lg"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            {isEnabling ? 'Abilitazione...' : 'Sì, abilita notifiche'}
          </Button>
          
          <Button
            onClick={skipOnboarding}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <BellOff className="mr-2 h-5 w-5" />
            No, forse più tardi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
