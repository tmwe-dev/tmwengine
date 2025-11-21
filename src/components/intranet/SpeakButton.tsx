import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';

interface SpeakButtonProps {
  text: string;
  language?: string;
}

const getLanguageLocale = (lang: string): string => {
  const localeMap: Record<string, string> = {
    'it': 'it-IT',
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'th': 'th-TH',
  };
  return localeMap[lang] || lang.includes('-') ? lang : 'it-IT';
};

export const SpeakButton = ({ text, language = 'it-IT' }: SpeakButtonProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      return;
    }

    const synth = window.speechSynthesis;

    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLanguageLocale(language);
    
    const voices = synth.getVoices();
    const voice = voices.find(v => v.lang.startsWith(language.split('-')[0])) 
                  || voices.find(v => v.lang.startsWith('it'));
    
    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synth.speak(utterance);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-auto px-2 text-xs gap-1"
      onClick={handleSpeak}
      title={isSpeaking ? 'Interrompi' : 'Ascolta messaggio'}
    >
      {isSpeaking ? (
        <VolumeX className="h-3 w-3" />
      ) : (
        <Volume2 className="h-3 w-3" />
      )}
      {isSpeaking ? 'Stop' : 'Ascolta'}
    </Button>
  );
};
