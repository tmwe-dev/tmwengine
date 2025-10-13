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

        // 4. Monta widget GLOBALE (nascosto di default)
        if (window.mountElevenLabsConvai) {
          const widget = window.mountElevenLabsConvai(config.agentId, 'global-widget');
          
          // Nascondi widget globale con multiple proprietà per assicurare che rimanga nascosto
          if (widget) {
            const hideWidget = () => {
              widget.style.display = 'none';
              widget.style.visibility = 'hidden';
              widget.style.opacity = '0';
              widget.style.pointerEvents = 'none';
            };
            
            hideWidget();
            // Riapplica dopo render per assicurare che funzioni
            requestAnimationFrame(hideWidget);
            setTimeout(hideWidget, 100);
            setTimeout(hideWidget, 500);
            
            console.log('Global widget mounted (hidden by default)');
          }
        } else {
          throw new Error('mountElevenLabsConvai function not available');
        }

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

    // Funzione globale per toggle visibilità widget globale
    window.toggleGlobalVoiceWidget = () => {
      const widget = document.querySelector('#global-widget') as HTMLElement;
      if (widget) {
        const isHidden = widget.style.display === 'none';
        
        if (isHidden) {
          // Mostra widget
          widget.style.display = 'block';
          widget.style.visibility = 'visible';
          widget.style.opacity = '1';
          widget.style.pointerEvents = 'auto';
        } else {
          // Nascondi widget
          widget.style.display = 'none';
          widget.style.visibility = 'hidden';
          widget.style.opacity = '0';
          widget.style.pointerEvents = 'none';
        }
        
        console.log(`Global widget ${isHidden ? 'shown' : 'hidden'}`);
        return !isHidden;
      }
      return false;
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
