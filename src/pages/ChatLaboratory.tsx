import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, Bot, User, Settings, Brain, Cpu, Sparkles, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ParticipantSelector } from '@/components/chat-laboratory/ParticipantSelector';
import { MultiAgentMessage } from '@/components/chat-laboratory/MultiAgentMessage';
import { LaboratoryPromptManager } from '@/components/chat-laboratory/LaboratoryPromptManager';
import { FileUploader, UploadedFile } from '@/components/chat/FileUploader';
import { ImageGenerator } from '@/components/chat/ImageGenerator';
import { VoiceRecorder } from '@/components/chat/VoiceRecorder';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  sender_name: string;
  content: string;
  is_visible_to_ai: boolean;
  attachments?: UploadedFile[];
  images?: string[];
  generated_images?: string[];
  token_input?: number;
  token_output?: number;
  tempo_risposta_ms?: number;
  created_at: string;
}

interface Participant {
  id: string;
  type: 'human' | 'chatgpt' | 'gemini' | 'claude';
  name: string;
  system_prompt?: string;
  is_active: boolean;
}

const ChatLaboratory = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    initializeParticipants();
  }, []);

  useEffect(() => {
    if (currentConversationId) {
      const channel = supabase
        .channel('chat-laboratory-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'chat_laboratory_messages' },
          () => loadMessages(currentConversationId)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentConversationId]);

  const initializeParticipants = async () => {
    const defaultParticipants: Participant[] = [
      { id: 'human-1', type: 'human', name: 'Tu', is_active: true },
      { id: 'chatgpt-1', type: 'chatgpt', name: 'ChatGPT', is_active: true, system_prompt: '' },
      { id: 'gemini-1', type: 'gemini', name: 'Gemini', is_active: true, system_prompt: '' },
      { id: 'claude-1', type: 'claude', name: 'Claude', is_active: true, system_prompt: '' },
    ];
    setParticipants(defaultParticipants);
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const messages = (data || []).map(msg => ({
        ...msg,
        images: Array.isArray(msg.images) ? msg.images as string[] : [],
        attachments: Array.isArray(msg.attachments) ? msg.attachments as unknown as UploadedFile[] : [],
        generated_images: Array.isArray(msg.generated_images) ? msg.generated_images as string[] : []
      })) as Message[];
      
      setMessages(messages);
    } catch (error) {
      console.error('Errore caricamento messaggi:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_conversations')
        .insert({
          titolo: `Discussione Multi-Agente ${new Date().toLocaleString()}`,
          active_participants: participants.filter(p => p.is_active).map(p => ({ type: p.type, name: p.name }))
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentConversationId(data.id);
      setMessages([]);

      // Salva partecipanti nella tabella participants
      for (const participant of participants.filter(p => p.is_active)) {
        await supabase
          .from('chat_laboratory_participants')
          .insert({
            conversation_id: data.id,
            type: participant.type,
            name: participant.name,
            system_prompt: participant.system_prompt,
            is_active: true
          });
      }
    } catch (error) {
      console.error('Errore creazione conversazione:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare la conversazione.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    const currentPrompt = prompt;
    setPrompt('');

    try {
      // Crea conversazione inline se non esiste
      let conversationId = currentConversationId;
      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('chat_laboratory_conversations')
          .insert({
            titolo: `Discussione Multi-Agente ${new Date().toLocaleString()}`,
            active_participants: participants.filter(p => p.is_active).map(p => ({ type: p.type, name: p.name }))
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
        setCurrentConversationId(conversationId);

        // Salva partecipanti
        for (const participant of participants.filter(p => p.is_active)) {
          await supabase
            .from('chat_laboratory_participants')
            .insert({
              conversation_id: conversationId,
              type: participant.type,
              name: participant.name,
              system_prompt: participant.system_prompt,
              is_active: true
            });
        }
      }

      // Salva messaggio umano
      const { error: insertError } = await supabase
        .from('chat_laboratory_messages')
        .insert([{
          conversation_id: conversationId,
          sender_type: 'human',
          sender_name: 'Tu',
          content: currentPrompt,
          is_visible_to_ai: true,
          attachments: uploadedFiles as any,
          images: uploadedFiles.filter(f => f.isImage).map(f => f.url) as any,
          generated_images: generatedImage ? [generatedImage] as any : []
        }]);

      if (insertError) throw insertError;

      setUploadedFiles([]);
      setGeneratedImage(null);

      // Chiama orchestratore
      const activeAIParticipants = participants.filter(p => p.is_active && p.type !== 'human');
      
      const { data, error } = await supabase.functions.invoke('chat-laboratory-orchestrator', {
        body: { 
          conversationId,
          userMessage: currentPrompt,
          participants: activeAIParticipants
        }
      });

      if (error) {
        console.error('❌ Errore orchestrator:', error);
        throw error;
      }

      console.log('✅ Orchestrator completato:', data);
      await loadMessages(conversationId);

    } catch (error) {
      console.error('Errore invio messaggio:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare il messaggio. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleParticipant = (participantId: string) => {
    setParticipants(prev => prev.map(p => 
      p.id === participantId ? { ...p, is_active: !p.is_active } : p
    ));
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-indigo-900/20 via-background to-violet-900/20">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/chat')}
                variant="ghost"
                size="icon"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                    Chat Laboratory
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Discussione Multi-Agente AI
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LaboratoryPromptManager />
              <ParticipantSelector
                participants={participants}
                onToggle={toggleParticipant}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Messaggi */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="container mx-auto max-w-4xl">
          {messages.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20">
                    <MessageSquare className="h-12 w-12 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Inizia una Discussione</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Gli agenti AI selezionati risponderanno in sequenza, ognuno con la propria prospettiva
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {messages.map((message) => (
            <MultiAgentMessage key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
              <span className="text-sm">Gli agenti stanno elaborando...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border/40 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 p-4">
        <div className="container mx-auto max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* File Uploads & Image Generator */}
            <div className="flex gap-2">
              <FileUploader
                onFilesUploaded={setUploadedFiles}
              />
              <ImageGenerator
                onImageGenerated={setGeneratedImage}
              />
              <VoiceRecorder
                onTranscription={(text) => setPrompt(prev => prev + ' ' + text)}
              />
            </div>

            {/* Textarea */}
            <div className="flex gap-2">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Scrivi il tuo messaggio... Gli agenti AI risponderanno in sequenza"
                className="min-h-[100px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={isLoading || !prompt.trim()}
                className="h-auto px-4"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatLaboratory;
