import { useCallback, useRef } from 'react';

interface Message {
  id: string;
  audio_url?: string;
}

export const useClassicModeAudio = (
  messages: Message[],
  messagesEndRef: React.RefObject<HTMLDivElement>
) => {
  const currentPlayingIndex = useRef<number>(-1);

  const handleAudioEnd = useCallback((messageId: string) => {
    console.log(`🎵 [ClassicMode] Audio terminato per messaggio: ${messageId}`);
    
    const currentIndex = messages.findIndex(m => m.id === messageId);
    
    if (currentIndex === -1) {
      console.warn(`⚠️ [ClassicMode] Messaggio ${messageId} non trovato nell'array`);
      return;
    }
    
    // Trova il prossimo messaggio con audio
    let nextIndex = currentIndex + 1;
    while (nextIndex < messages.length) {
      if (messages[nextIndex].audio_url) {
        currentPlayingIndex.current = nextIndex;
        
        console.log(`📜 [ClassicMode] Scroll automatico al messaggio ${messages[nextIndex].id}`);
        
        // Scroll al messaggio successivo dopo 100ms
        setTimeout(() => {
          const nextElement = document.getElementById(`message-${messages[nextIndex].id}`);
          if (nextElement) {
            nextElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            console.warn(`⚠️ [ClassicMode] Elemento DOM non trovato per messaggio ${messages[nextIndex].id}`);
          }
        }, 100);
        
        return;
      }
      nextIndex++;
    }
    
    // Se non ci sono più messaggi con audio, scrolla alla fine
    if (nextIndex >= messages.length) {
      currentPlayingIndex.current = -1;
      console.log(`✅ [ClassicMode] Nessun messaggio con audio successivo, scroll alla fine`);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, messagesEndRef]);

  return { handleAudioEnd };
};
