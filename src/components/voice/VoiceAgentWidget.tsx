import { useElevenLabsWidget } from '@/hooks/useElevenLabsWidget';

export const VoiceAgentWidget = () => {
  // Il widget viene caricato e montato automaticamente dall'hook
  useElevenLabsWidget();
  
  // Il web component viene inserito direttamente nel DOM dal loader
  // Non c'è bisogno di renderizzare nulla qui
  return null;
};
