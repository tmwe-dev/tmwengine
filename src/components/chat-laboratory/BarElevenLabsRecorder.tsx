import { useState } from 'react';
import { VoiceRecorder } from './VoiceRecorder';
import { AudioPlayer } from './AudioPlayer';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BarElevenLabsRecorderProps {
  conversationId: string | null;
  onTranscriptionComplete: (text: string) => void;
  isDisabled?: boolean;
  isAISpeaking?: boolean;
  activeAgentId?: string;
}

export const BarElevenLabsRecorder = ({
  conversationId,
  onTranscriptionComplete,
  isDisabled = false,
  isAISpeaking = false,
  activeAgentId
}: BarElevenLabsRecorderProps) => {
  const [isActive, setIsActive] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);

  const handleTranscription = async (text: string) => {
    console.log('📝 Trascrizione ricevuta:', text);
    
    // Passa il testo all'orchestratore
    onTranscriptionComplete(text);
    
    // Chiama orchestratore per ottenere risposta
    try {
      const { data, error } = await supabase.functions.invoke('bar-chat-orchestrator', {
        body: {
          conversationId,
          userMessage: text,
          voiceMode: true,
        },
      });

      if (error) throw error;

      if (data?.response) {
        console.log('🤖 Risposta AI:', data.response);
        
        // Genera audio della risposta
        const { data: ttsData, error: ttsError } = await supabase.functions.invoke('text-to-speech', {
          body: {
            text: data.response,
            voice_id: data.voice_id || '9BWtsMINqrJLrRacOk9x',
            model_id: 'eleven_turbo_v2_5',
          },
        });

        if (ttsError) throw ttsError;

        if (ttsData?.audio) {
          console.log('🔊 Audio generato, riproduzione...');
          setAudioBase64(ttsData.audio);
        }
      }
    } catch (error) {
      console.error('Errore orchestratore:', error);
      toast.error('Errore', {
        description: error.message,
      });
    }
  };

  return (
    <>
      <VoiceRecorder
        onTranscriptionComplete={handleTranscription}
        isActive={isActive}
        onActiveChange={setIsActive}
        disabled={isDisabled}
      />
      
      {/* Audio player per riprodurre la risposta AI */}
      {audioBase64 && (
        <AudioPlayer
          audioBase64={audioBase64}
          onPlaybackComplete={() => setAudioBase64(null)}
        />
      )}
    </>
  );
};
