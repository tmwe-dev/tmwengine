import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export const VoiceAgentWidget = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<{
    agentId: string;
    enabled: boolean;
  } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  // Carica configurazione
  useEffect(() => {
    const savedConfig = localStorage.getItem('voice_agent_config');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Error loading config:', error);
      }
    }
  }, []);

  // Funzione per riprodurre audio
  const playAudioChunk = async (audioData: Int16Array) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }

    const float32Array = new Float32Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      float32Array[i] = audioData[i] / 32768.0;
    }

    const audioBuffer = audioContextRef.current.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.start();

    source.onended = () => {
      if (audioQueueRef.current.length > 0) {
        const nextChunk = audioQueueRef.current.shift()!;
        playAudioChunk(nextChunk);
      } else {
        isPlayingRef.current = false;
        setIsSpeaking(false);
      }
    };
  };

  const processAudioQueue = () => {
    if (!isPlayingRef.current && audioQueueRef.current.length > 0) {
      isPlayingRef.current = true;
      const chunk = audioQueueRef.current.shift()!;
      playAudioChunk(chunk);
    }
  };

  // Client tools handler
  const handleClientTool = async (toolName: string, parameters: any) => {
    console.log('Tool called:', toolName, parameters);

    try {
      switch (toolName) {
        case 'analyzeEmails':
          const { data: emailData, error: emailError } = await supabase.functions.invoke('ai-email-actions', {
            body: { action: 'analyze', query: parameters.query }
          });
          if (emailError) throw emailError;
          return { success: true, results: emailData };

        case 'executeEmailAction':
          const { data: actionData, error: actionError } = await supabase.functions.invoke('ai-email-actions', {
            body: {
              action: parameters.action,
              emailId: parameters.emailId,
              folderId: parameters.folderId
            }
          });
          if (actionError) throw actionError;
          return { success: true, message: `Azione ${parameters.action} completata` };

        case 'sendTemplatedEmail':
          const { data: sendData, error: sendError } = await supabase.functions.invoke('ai-send-templated-email', {
            body: parameters
          });
          if (sendError) throw sendError;
          return { success: true, message: 'Email inviata con successo' };

        case 'createActivity':
          const { data: createData, error: createError } = await supabase.functions.invoke('ai-crm-manager', {
            body: { action: 'create_activity', ...parameters }
          });
          if (createError) throw createError;
          return { success: true, activityId: createData.id, message: 'Attività creata' };

        case 'updateActivity':
          const { data: updateData, error: updateError } = await supabase.functions.invoke('ai-crm-manager', {
            body: { action: 'update_activity', ...parameters }
          });
          if (updateError) throw updateError;
          return { success: true, message: 'Attività aggiornata' };

        default:
          return { success: false, error: 'Tool non riconosciuto' };
      }
    } catch (error) {
      console.error('Tool error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Errore' };
    }
  };

  const handleStartConversation = async () => {
    if (!config?.agentId) {
      toast({
        title: 'Configurazione mancante',
        description: 'Configura l\'Agent ID nelle impostazioni.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Richiedi permesso microfono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Ottieni signed URL
      const { data, error } = await supabase.functions.invoke('elevenlabs-conversation-token', {
        body: { agentId: config.agentId }
      });

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Nessun signed URL ricevuto');

      // Connetti WebSocket
      const ws = new WebSocket(data.signedUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connesso');
        setIsConnected(true);
        toast({
          title: 'Connesso',
          description: 'Agente vocale connesso.',
        });
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Messaggio ricevuto:', message.type);

          // Gestisci audio in arrivo
          if (message.type === 'audio' && message.audio) {
            const audioData = Uint8Array.from(atob(message.audio), c => c.charCodeAt(0));
            const int16Array = new Int16Array(audioData.buffer);
            audioQueueRef.current.push(int16Array);
            setIsSpeaking(true);
            processAudioQueue();
          }

          // Gestisci chiamata a client tool
          if (message.type === 'client_tool_call') {
            const result = await handleClientTool(message.tool_name, message.parameters);
            ws.send(JSON.stringify({
              type: 'client_tool_result',
              tool_call_id: message.tool_call_id,
              result: JSON.stringify(result)
            }));
          }
        } catch (error) {
          console.error('Errore processamento messaggio:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: 'Errore',
          description: 'Errore di connessione.',
          variant: 'destructive',
        });
      };

      ws.onclose = () => {
        console.log('WebSocket chiuso');
        setIsConnected(false);
        stream.getTracks().forEach(track => track.stop());
        toast({
          title: 'Disconnesso',
          description: 'Agente vocale disconnesso.',
        });
      };

      // Setup audio input
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const int16Array = new Int16Array(inputData.length);
          
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(int16Array.buffer)));
          ws.send(JSON.stringify({
            type: 'audio',
            audio: base64Audio
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Impossibile avviare la conversazione',
        variant: 'destructive',
      });
    }
  };

  const handleEndConversation = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsConnected(false);
    setIsSpeaking(false);
  };

  if (!config?.enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col items-end gap-3">
        {isConnected && (
          <div className="bg-card border border-border rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-3 h-3 rounded-full',
                isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-muted'
              )} />
              <span className="text-sm text-muted-foreground">
                {isSpeaking ? 'In ascolto...' : 'Pronto'}
              </span>
            </div>
          </div>
        )}

        {!isConnected ? (
          <Button
            onClick={handleStartConversation}
            size="lg"
            className="rounded-full h-16 w-16 shadow-lg"
          >
            <Phone className="h-6 w-6" />
          </Button>
        ) : (
          <Button
            onClick={handleEndConversation}
            size="lg"
            variant="destructive"
            className="rounded-full h-16 w-16 shadow-lg"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
};
