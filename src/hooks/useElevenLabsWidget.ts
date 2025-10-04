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

        // 4. Monta widget
        if (window.mountElevenLabsConvai) {
          window.mountElevenLabsConvai(config.agentId);
          console.log('Widget mounted successfully');
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

    loadAndMountWidget();

    // Cleanup: rimuovi widget quando componente viene smontato
    return () => {
      const widget = document.querySelector('elevenlabs-convai');
      if (widget) {
        widget.remove();
      }
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
    mountElevenLabsConvai: (agentId: string) => void;
    executeAppCommand: (params: any) => any;
    read_page_content: () => any;
  }
}
