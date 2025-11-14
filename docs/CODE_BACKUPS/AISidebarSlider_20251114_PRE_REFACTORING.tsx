/**
 * AI Sidebar Slider - Slide-out AI assistant uniformato
 * Supporta audio + testo come ChatLaboratory/RadioChat
 */

import { useState, useEffect } from 'react';
import { Sparkles, Send, Loader2, X, BookOpen, Keyboard, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useGlobalAICanvas } from '@/hooks/useGlobalAICanvas';
import { AIPromptLibrarySelector } from './AIPromptLibrarySelector';
import { AudioModeSelector, AudioMode } from '@/components/chat-laboratory/AudioModeSelector';

interface AISidebarSliderProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  senderEmail?: string | null;
  onPromptCreated?: (data: { prompt_name: string; system_prompt: string; sender_email?: string }) => void;
  hideButton?: boolean;
  enableAudio?: boolean;
  conversationId?: string | null;
}

export function AISidebarSlider({ 
  isOpen, 
  onClose,
  onToggle,
  senderEmail,
  onPromptCreated,
  hideButton = false,
  enableAudio = false,
  conversationId = null
}: AISidebarSliderProps) {
  const { state, sendMessage, clearMessages } = useGlobalAICanvas();
  const [input, setInput] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const [audioMode, setAudioMode] = useState<'text' | 'audio'>('text');
  const [audioInputMode, setAudioInputMode] = useState<AudioMode>('stable');

  useEffect(() => {
    if (isOpen && senderEmail && !state.context) {
      // Il context verrà impostato quando user invia il primo messaggio
    }
  }, [isOpen, senderEmail, state.context]);

  const handleSend = async () => {
    if (!input.trim() || state.isProcessing) return;
    
    await sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePromptSelect = (prompt: { system_prompt: string }) => {
    setInput(prompt.system_prompt);
    setShowLibrary(false);
  };

  const handleTranscription = async (text: string) => {
    console.log('🎤 Transcription ricevuta:', text);
    await sendMessage(text);
  };

  return (
    <>
      {/* Backdrop - UNIFORMATO */}
      {isOpen && (
        <div 
          className="fixed left-0 right-0 bottom-0 top-14 bg-transparent backdrop-blur-sm z-40 animate-in fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar scorrevole - UNIFORMATO */}
      <div className={cn(
        "fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-80 bg-background border-r z-50",
        "transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full hidden"
      )}>
        {/* Header con linguette Audio/Text */}
        <div className="p-4 border-b flex items-center justify-between shrink-0 bg-background">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">AI Assistant</h2>
          </div>
          
          {enableAudio && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={audioMode === 'text' ? 'default' : 'ghost'}
                onClick={() => setAudioMode('text')}
              >
                <Keyboard className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={audioMode === 'audio' ? 'default' : 'ghost'}
                onClick={() => setAudioMode('audio')}
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Canvas conversazione */}
        <ScrollArea className="flex-1 p-4">
          {state.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">
                Inizia una conversazione con l'AI Assistant
              </p>
              {senderEmail && (
                <p className="text-xs mt-2">
                  Context: {senderEmail}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {state.messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={cn(
                    "p-3 rounded-lg",
                    msg.role === 'user' 
                      ? "bg-primary/10 ml-4" 
                      : "bg-muted mr-4"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                  
                  {msg.proposal && msg.proposal.actions && msg.proposal.actions.length > 0 && (
                    <div className="mt-3 p-2 bg-background rounded border">
                      <p className="text-xs font-semibold mb-1">Azioni proposte:</p>
                      {msg.proposal.actions.map((action, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground">
                          {action.type}: {action.description}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {state.isProcessing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI sta pensando...</span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input area condizionale */}
        <div className="p-4 border-t bg-background shrink-0">
          {audioMode === 'text' || !enableAudio ? (
            // Input testuale
            <div className="space-y-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scrivi un messaggio..."
                className="min-h-[100px] resize-none"
                disabled={state.isProcessing}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowLibrary(true)}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Library
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={clearMessages}
                  disabled={state.messages.length === 0}
                >
                  Reset
                </Button>
                <Button 
                  onClick={handleSend} 
                  disabled={!input.trim() || state.isProcessing}
                  className="ml-auto"
                >
                  {state.isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // Integrazione AudioModeSelector
            <div className="space-y-2">
              <AudioModeSelector
                conversationId={conversationId}
                onTranscriptionComplete={handleTranscription}
                isAISpeaking={state.isProcessing}
                audioMode={audioInputMode}
                onModeChange={setAudioInputMode}
                showOnlyRecorder={true}
              />
              <Button 
                size="sm" 
                variant="outline" 
                onClick={clearMessages}
                disabled={state.messages.length === 0}
                className="w-full"
              >
                Reset
              </Button>
            </div>
          )}
        </div>

        {/* AI Prompt Library Modal */}
        {showLibrary && (
          <div className="absolute inset-0 bg-background z-10 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Prompt Library</h3>
              <Button size="icon" variant="ghost" onClick={() => setShowLibrary(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <AIPromptLibrarySelector 
                onSelect={handlePromptSelect}
              />
            </div>
          </div>
        )}
      </div>

      {/* Toggle button (solo se non hidden) */}
      {!hideButton && (
        <button
          onClick={onToggle}
          className={cn(
            "fixed left-0 top-1/2 -translate-y-1/2 z-30",
            "w-8 h-16 bg-primary/10 hover:bg-primary/20 backdrop-blur-sm",
            "border border-l-0 border-border rounded-r-lg",
            "flex items-center justify-center",
            "transition-all duration-300",
            isOpen ? "translate-x-80" : "translate-x-0"
          )}
        >
          <Sparkles className="w-4 h-4" />
        </button>
      )}
    </>
  );
}
