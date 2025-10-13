import { useEffect } from 'react';
import { toast } from 'sonner';

interface BarVoiceWidgetConfig {
  agentId: string;
  enabled: boolean;
}

export const useBarVoiceWidget = (
  isActive: boolean, 
  agentId: string | null,
  onTranscriptionComplete?: (text: string) => void
) => {
  useEffect(() => {
    const loadAndMountBarWidget = async () => {
      if (!isActive || !agentId) {
        // Rimuovi widget Bar se non attivo
        const widget = document.querySelector('#bar-widget');
        if (widget) {
          widget.remove();
          console.log('Bar widget removed');
        }
        return;
      }

      try {
        // 1. Richiedi permesso microfono
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('Microphone permission granted for Bar widget');
        } catch (error) {
          console.error('Microphone permission denied:', error);
          toast.error('Permesso microfono richiesto', {
            description: 'Il widget vocale richiede l\'accesso al microfono.',
          });
          return;
        }

        // 2. Carica script ElevenLabs se non presente
        const loadScript = () => {
          return new Promise<void>((resolve, reject) => {
            if (!window.ElevenLabsConvaiLoader) {
              const loaderScript = document.createElement('script');
              loaderScript.src = '/js/elevenlabs-convai-loader.js';
              loaderScript.async = true;
              
              loaderScript.onload = () => {
                console.log('Loader script loaded for Bar widget');
                window.ElevenLabsConvaiLoader.loadScript(() => {
                  resolve();
                });
              };
              
              loaderScript.onerror = () => {
                reject(new Error('Failed to load loader script'));
              };
              
              document.body.appendChild(loaderScript);
            } else {
              window.ElevenLabsConvaiLoader.loadScript(() => {
                resolve();
              });
            }
          });
        };

        await loadScript();

        // 3. Monta widget BAR MODE con ID univoco
        if (window.mountElevenLabsConvai) {
          const widget = window.mountElevenLabsConvai(agentId, 'bar-widget');
          if (widget) {
            widget.style.display = 'block';
            
            // Aggiungi event listener per trascrizioni
            widget.addEventListener('message', (event: any) => {
              console.log('🎤 [Bar Widget] Evento ricevuto:', event.detail);
              
              if (event.detail?.type === 'transcript' && event.detail?.text) {
                console.log('📝 [Bar Widget] Trascrizione:', event.detail.text);
                
                if (onTranscriptionComplete) {
                  onTranscriptionComplete(event.detail.text);
                }
              }
            });
            
            console.log('Bar widget event listeners attached');
          }
          console.log('Bar widget mounted successfully');
          
          toast.success('Widget Bar attivo', {
            description: 'Puoi iniziare a parlare',
          });
        } else {
          throw new Error('mountElevenLabsConvai function not available');
        }

      } catch (error) {
        console.error('Error loading Bar widget:', error);
        toast.error('Errore', {
          description: 'Impossibile caricare il widget vocale Bar.',
        });
      }
    };

    loadAndMountBarWidget();

    // Cleanup quando componente smonta o isActive diventa false
    return () => {
      // SEMPRE rimuovi widget nel cleanup, indipendentemente da isActive
      const widget = document.querySelector('#bar-widget');
      if (widget) {
        widget.remove();
        console.log('Bar widget cleanup');
      }
    };
  }, [isActive, agentId]);
};
