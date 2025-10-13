import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ElevenLabsConfig {
  agentId: string;
  enabled: boolean;
}

export const useElevenLabsWidget = () => {
  const { toast } = useToast();

  useEffect(() => {
    const loadAndMountWidget = async () => {
      try {
        // 1. Leggi configurazione da localStorage
        const configStr = localStorage.getItem('voice_agent_config');
        if (!configStr) {
          console.log('No ElevenLabs config found');
          return;
        }

        const config: ElevenLabsConfig = JSON.parse(configStr);
        
        if (!config.enabled || !config.agentId) {
          console.log('ElevenLabs widget disabled or no agentId');
          return;
        }

        console.log('ElevenLabs config loaded:', config);

        // 2. Richiedi permesso microfono
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('Microphone permission granted');
        } catch (error) {
          console.error('Microphone permission denied:', error);
          toast({
            title: 'Permesso microfono richiesto',
            description: 'Il widget vocale richiede l\'accesso al microfono.',
            variant: 'destructive',
          });
          return;
        }

        // 3. Carica script ElevenLabs
        const loadScript = () => {
          return new Promise<void>((resolve, reject) => {
            // Controlla se il loader esiste
            if (!window.ElevenLabsConvaiLoader) {
              // Carica il loader script
              const loaderScript = document.createElement('script');
              loaderScript.src = '/js/elevenlabs-convai-loader.js';
              loaderScript.async = true;
              
              loaderScript.onload = () => {
                console.log('Loader script loaded');
                // Ora carica lo script ElevenLabs
                window.ElevenLabsConvaiLoader.loadScript(() => {
                  resolve();
                });
              };
              
              loaderScript.onerror = () => {
                reject(new Error('Failed to load loader script'));
              };
              
              document.body.appendChild(loaderScript);
            } else {
              // Loader già presente, carica solo lo script ElevenLabs
              window.ElevenLabsConvaiLoader.loadScript(() => {
                resolve();
              });
            }
          });
        };

        await loadScript();

        // 4. Script pronto - widget si monta on-demand al click del bottone
        console.log('ElevenLabs script ready, widget will mount on demand');

      } catch (error) {
        console.error('Error loading ElevenLabs widget:', error);
        toast({
          title: 'Errore',
          description: 'Impossibile caricare il widget vocale.',
          variant: 'destructive',
        });
      }
    };

    // Listener per cambiamenti config
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'voice_agent_config') {
        console.log('Config changed, reloading widget');
        loadAndMountWidget();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    loadAndMountWidget();

    // Funzione globale per toggle widget globale (mount/unmount)
    window.toggleGlobalVoiceWidget = () => {
      const widget = document.querySelector('#global-widget') as HTMLElement;
      
      if (widget) {
        // Widget già montato - rimuovilo
        widget.remove();
        console.log('Global widget removed');
        return false;
      } else {
        // Widget non montato - crealo ORA
        const configStr = localStorage.getItem('voice_agent_config');
        if (!configStr) return false;
        
        const config: ElevenLabsConfig = JSON.parse(configStr);
        if (window.mountElevenLabsConvai && config.agentId && config.enabled) {
          window.mountElevenLabsConvai(config.agentId, 'global-widget');
          console.log('Global widget mounted');
          return true;
        }
        return false;
      }
    };

    // Cleanup: rimuovi widget quando componente viene smontato
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      const widget = document.querySelector('#global-widget');
      if (widget) {
        widget.remove();
      }
      delete window.toggleGlobalVoiceWidget;
    };
  }, [toast]);
};

// Aggiungi type declarations per TypeScript
declare global {
  interface Window {
    ElevenLabsConvaiLoader: {
      scriptLoaded: boolean;
      loadScript: (callback?: () => void) => void;
    };
    mountElevenLabsConvai: (agentId: string, widgetId?: string) => HTMLElement | void;
    toggleGlobalVoiceWidget?: () => boolean;
    executeAppCommand: (params: any) => any;
    read_page_content: () => any;
  }
}
