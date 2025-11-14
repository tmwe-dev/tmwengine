/**
 * AI Sidebar Slider - Slide-out AI assistant da sinistra
 * Utilizzabile in tutta la sezione email (Management, Smart Inbox, ecc.)
 */

import { useState, useEffect } from 'react';
import { Sparkles, ChevronRight, Send, Loader2, X, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useGlobalAICanvas } from '@/hooks/useGlobalAICanvas';
import { AIPromptLibrarySelector } from './AIPromptLibrarySelector';

interface AISidebarSliderProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  senderEmail?: string | null;
  onPromptCreated?: (data: { prompt_name: string; system_prompt: string; sender_email?: string }) => void;
  hideButton?: boolean;
}

export function AISidebarSlider({ 
  isOpen, 
  onClose,
  onToggle,
  senderEmail,
  onPromptCreated,
  hideButton = false
}: AISidebarSliderProps) {
  const { state, sendMessage, clearMessages } = useGlobalAICanvas();
  const [input, setInput] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);

  // Quando la sidebar si apre con un sender, imposta il context
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

  return (
    <>
      {/* Backdrop - UNIFORMATO */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-transparent backdrop-blur-sm z-[60] transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar scorrevole - UNIFORMATO */}
      <div className={cn(
        "fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-80 bg-background border-r shadow-2xl z-[61]",
        "transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header uniforme */}
        <div className="p-4 border-b flex items-center justify-between shrink-0 bg-background">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">AI Assistant</h2>
          </div>
          <div className="flex items-center gap-2">
            {senderEmail && (
              <Badge variant="outline" className="text-xs">
                {senderEmail}
              </Badge>
            )}
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
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
                      ? "bg-primary text-primary-foreground ml-8" 
                      : "bg-muted mr-8"
                  )}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  {msg.proposal && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <Badge variant="secondary" className="text-xs">
                        {msg.proposal.actions.length} azioni proposte
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
              {state.isProcessing && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">AI sta pensando...</span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input prompt */}
        <div className="p-4 border-t shrink-0 space-y-3">
          <Textarea
            placeholder={senderEmail ? `Chiedi all'AI riguardo ${senderEmail}...` : "Chiedi all'AI..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={state.isProcessing}
            className="min-h-[80px] resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLibrary(!showLibrary)}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Library
            </Button>
            <div className="flex gap-2">
              {state.messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearMessages}
                  disabled={state.isProcessing}
                >
                  Reset
                </Button>
              )}
              <Button
                onClick={handleSend}
                disabled={!input.trim() || state.isProcessing}
                className="gap-2"
              >
                {state.isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Invia
              </Button>
            </div>
          </div>
        </div>

        {/* Prompt Library Selector */}
        {showLibrary && (
          <div className="p-4 border-t shrink-0 bg-muted/50">
            <AIPromptLibrarySelector onSelect={handlePromptSelect} />
          </div>
        )}
      </div>

      {/* Linguetta trigger - UNIFORMATO */}
      {!hideButton && (
        <button
          onClick={onToggle}
          className={cn(
            "fixed left-0 top-1/2 -translate-y-1/2 z-[62]",
            "w-12 h-20 bg-transparent rounded-r-lg border border-border/20",
            "flex items-center justify-center",
            "transition-all duration-300",
            "hover:bg-muted/50",
            isOpen && "translate-x-80"
          )}
          aria-label="Toggle AI Assistant"
        >
          <Sparkles 
            className="w-6 h-6 text-primary/80 transition-colors duration-300" 
            strokeWidth={1}
          />
        </button>
      )}
    </>
  );
}
