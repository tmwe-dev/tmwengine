import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Image, Smile, Mic, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AISuggestions } from './AISuggestions';
import { AutoSpeakerToggle } from './AutoSpeakerToggle';
import { VideoCallButton } from './VideoCallButton';
import { AIChatInvoker } from './AIChatInvoker';
import { TtsControls } from './TtsControls';
import { useAutoSpeaker } from '@/hooks/useAutoSpeaker';
import { UserLanguageSettings } from './UserLanguageSettings';
import { IntranetVoiceToText } from './IntranetVoiceToText';

interface FileAttachment {
  file: File;
  preview?: string;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
}

interface MessageInputWithAttachmentsProps {
  roomId: string;
  roomName?: string;
  settingsButton?: React.ReactNode;
  ttsEngine?: string;
  selectedVoice?: string;
  onEngineChange?: (value: string) => void;
  onVoiceChange?: (value: string) => void;
  elevenLabsVoices?: ElevenLabsVoice[];
  isLoadingVoices?: boolean;
}

const EMOTICONS = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '✨', '💯', '🤔', '👏', '🙌', '💪', '🎯', '⚡', '🌟'];

export const MessageInputWithAttachments = ({ 
  roomId,
  roomName = '',
  settingsButton,
  ttsEngine = 'native',
  selectedVoice = '',
  onEngineChange = () => {},
  onVoiceChange = () => {},
  elevenLabsVoices = [],
  isLoadingVoices = false
}: MessageInputWithAttachmentsProps) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const { isSpeaking } = useAutoSpeaker({ messages: [], currentUserId: '' });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newAttachments: FileAttachment[] = files.map(file => ({ file }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newAttachments: FileAttachment[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      if (newAttachments[index].preview) {
        URL.revokeObjectURL(newAttachments[index].preview!);
      }
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
        setAttachments(prev => [...prev, { file: audioFile }]);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: 'Registrazione in corso',
        description: 'Clicca di nuovo per terminare',
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile avviare la registrazione audio',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      return new Promise<void>((resolve) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) return resolve();
        
        const handleStop = async () => {
          setIsRecording(false);
          // Aspetta che l'attachment sia aggiunto
          await new Promise(r => setTimeout(r, 100));
          resolve();
        };
        
        recorder.addEventListener('stop', handleStop, { once: true });
        recorder.stop();
      });
    }
  };

  const uploadAttachments = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const attachment of attachments) {
      const fileName = `${Date.now()}-${attachment.file.name}`;
      const filePath = `${roomId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, attachment.file);

      if (error) {
        console.error('Error uploading file:', error);
        toast({
          title: 'Errore upload',
          description: `Impossibile caricare ${attachment.file.name}`,
          variant: 'destructive',
        });
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const sendMessage = async () => {
    if (!message.trim() && attachments.length === 0) return;

    // Se stiamo registrando, ferma prima la registrazione
    if (isRecording) {
      await stopRecording();
      // Aspetta che l'attachment sia aggiunto
      await new Promise(r => setTimeout(r, 200));
    }

    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let attachmentUrl: string | undefined;
      let messageType = 'text';

      if (attachments.length > 0) {
        const uploadedUrls = await uploadAttachments();
        attachmentUrl = uploadedUrls[0]; // Per ora supportiamo un allegato alla volta
        
        if (attachments[0].file.type.startsWith('image/')) {
          messageType = 'image';
        } else if (attachments[0].file.type.startsWith('audio/')) {
          messageType = 'audio';
        } else {
          messageType = 'file';
        }
      }

      const { error } = await supabase
        .from('intranet_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          content: message.trim() || '📎 Allegato',
          message_type: messageType,
          attachment_url: attachmentUrl
        });

      if (error) throw error;

      setMessage('');
      setAttachments([]);
      
      // Cleanup preview URLs
      attachments.forEach(att => {
        if (att.preview) URL.revokeObjectURL(att.preview);
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile inviare il messaggio',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const insertEmoticon = (emoticon: string) => {
    setMessage(prev => prev + emoticon);
  };

  const handleSuggestionSelect = (text: string) => {
    setMessage(text);
  };

  const handleTranscription = (text: string) => {
    setMessage(prev => prev + text);
  };

  return (
    <>
      <div className="border-t-2 border-border bg-transparent p-2">
        {/* AI Suggestions - spazio fisso */}
        <div className="mb-2">
          <AISuggestions 
            roomId={roomId} 
            onSelectSuggestion={handleSuggestionSelect}
          />
        </div>

        {/* Preview allegati - scroll orizzontale */}
        {attachments.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto h-20">
            {attachments.map((attachment, index) => (
              <div key={index} className="relative group flex-shrink-0">
                {attachment.preview ? (
                  <div className="relative">
                    <img 
                      src={attachment.preview} 
                      alt="Preview" 
                      className="h-16 w-16 object-cover rounded-lg border"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border h-16">
                    <Paperclip className="h-4 w-4" />
                    <span className="text-xs max-w-[100px] truncate">
                      {attachment.file.name}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-4 w-4 ml-2"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {/* Icone - barra scorrevole orizzontalmente */}
          <ScrollArea className="w-full">
            <div className="flex gap-1 pb-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                multiple
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                title="Allega file"
                disabled={isSending}
                className="flex-shrink-0"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <input
                type="file"
                ref={imageInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageSelect}
                multiple
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => imageInputRef.current?.click()}
                title="Allega immagine"
                disabled={isSending}
                className="flex-shrink-0"
              >
                <Image className="h-4 w-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Emoticon"
                    disabled={isSending}
                    className="flex-shrink-0"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="grid grid-cols-5 gap-2">
                    {EMOTICONS.map((emoticon, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        className="text-2xl hover:scale-125 transition-transform"
                        onClick={() => insertEmoticon(emoticon)}
                      >
                        {emoticon}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Invoker AI Albert */}
              <div className="flex-shrink-0">
                <AIChatInvoker roomId={roomId} />
              </div>

              {/* Voice to Text - NUOVO */}
              <div className="flex-shrink-0">
                <IntranetVoiceToText
                  onTranscriptionComplete={handleTranscription}
                  isDisabled={isSending}
                  vadTimeout={2000}
                />
              </div>

              {/* Voice Message - ESISTENTE */}
              <Button
                size="icon"
                variant={isRecording ? "destructive" : "ghost"}
                onClick={isRecording ? stopRecording : startRecording}
                title={isRecording ? "Termina registrazione" : "Registra messaggio vocale"}
                disabled={isSending}
                className="flex-shrink-0"
              >
                <Mic className="h-4 w-4" />
              </Button>

              <div className="flex-shrink-0">
                <AutoSpeakerToggle isSpeaking={isSpeaking} />
              </div>
              
              {/* Settings button */}
              {settingsButton && (
                <div className="flex-shrink-0">
                  {settingsButton}
                </div>
              )}
              
              {/* Language Settings button */}
              <div className="flex-shrink-0">
                <UserLanguageSettings />
              </div>
            </div>
          </ScrollArea>

          {/* Input testo con VideoCall a sinistra e pulsante invio a destra */}
          <div className="flex items-center gap-2">
            {/* VideoCall button a sinistra */}
            {roomName && (
              <VideoCallButton 
                roomId={roomId} 
                roomName={roomName}
              />
            )}
            
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onPaste={(e) => {
                // Permetti l'incollaggio di testo
                const pastedText = e.clipboardData.getData('text');
                if (pastedText) {
                  const newValue = message + pastedText;
                  setMessage(newValue);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Scrivi un messaggio..."
              className="w-full sm:flex-1 resize-none rounded-lg border bg-background px-2 sm:px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[40px] max-h-[80px]"
              disabled={isSending}
              rows={1}
            />
            
            <Button
              onClick={sendMessage}
              disabled={(!message.trim() && attachments.length === 0) || isSending}
              size="icon"
              className="flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

        </div>
      </div>
    </>
  );
};
