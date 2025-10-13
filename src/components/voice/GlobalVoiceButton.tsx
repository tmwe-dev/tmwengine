import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export const GlobalVoiceButton = () => {
  const [isActive, setIsActive] = useState(false);

  // Verifica se widget è già presente all'avvio
  useEffect(() => {
    const widget = document.querySelector('#global-widget');
    setIsActive(!!widget);
  }, []);

  const toggleWidget = () => {
    if (window.toggleGlobalVoiceWidget) {
      const newState = window.toggleGlobalVoiceWidget();
      setIsActive(newState);
    }
  };

  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="icon"
      onClick={toggleWidget}
      className={cn(
        "fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg",
        "hover:scale-110 transition-all duration-200",
        isActive && "bg-primary animate-pulse"
      )}
      title={isActive ? "Nascondi assistente vocale" : "Mostra assistente vocale"}
    >
      {isActive ? (
        <Mic className="h-6 w-6" />
      ) : (
        <MicOff className="h-6 w-6" />
      )}
    </Button>
  );
};
