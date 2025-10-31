import { useState, useRef, useEffect } from 'react';
import { useGlobalAICanvas } from '@/contexts/GlobalAICanvasContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X, Send, Trash2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';

/**
 * GlobalAICanvas - Canvas AI globale accessibile da tutte le sezioni email
 * 
 * Features:
 * - Context-aware: adapts to email/sender/general context
 * - Conversational interface with AI
 * - Action proposals with confirmation
 * - Context injection automatic
 * - Prompt library integration
 */
export const GlobalAICanvas = () => {
  const { state, closeCanvas, sendMessage, clearMessages } = useGlobalAICanvas();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || state.isProcessing) return;
    
    await sendMessage(inputMessage);
    setInputMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!state.isOpen) return null;

  const getContextBadge = () => {
    if (!state.context) return null;
    
    switch (state.context.type) {
      case 'email':
        return <Badge variant="secondary">📧 Email Context</Badge>;
      case 'sender':
        return <Badge variant="secondary">👤 Sender: {state.context.senderEmail}</Badge>;
      case 'general':
        return <Badge variant="secondary">💬 General</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>AI Canvas</CardTitle>
                {getContextBadge()}
              </div>
              <CardDescription>
                Interagisci con l'AI per analizzare email, creare automazioni o ottenere suggerimenti
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {state.messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearMessages}
                  title="Cancella conversazione"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={closeCanvas}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-6">
            {state.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-muted-foreground">
                <Sparkles className="h-12 w-12 opacity-50" />
                <div className="space-y-2">
                  <p className="font-medium">Nessun messaggio ancora</p>
                  <p className="text-sm max-w-md">
                    Inizia una conversazione con l'AI. Puoi chiedere di analizzare email,
                    creare automazioni, o ricevere suggerimenti su come gestire la corrispondenza.
                  </p>
                </div>
                {state.context?.type === 'sender' && (
                  <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
                    <p className="font-medium mb-2">Esempi di domande:</p>
                    <ul className="text-left space-y-1">
                      <li>• "Analizza le email da questo mittente"</li>
                      <li>• "Crea un'automazione per archiviare le email promozionali"</li>
                      <li>• "Suggerisci come rispondere professionalmente"</li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {state.messages.map((msg, idx) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          )}
                          
                          {msg.proposal && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <p className="text-xs font-medium mb-2">🎯 Azioni Proposte:</p>
                              <div className="space-y-2">
                                {msg.proposal.actions.map((action, i) => (
                                  <div key={i} className="text-xs bg-background/50 rounded p-2">
                                    <span className="font-medium">{action.type}:</span>{' '}
                                    {action.description}
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs mt-2 opacity-70">
                                Confidence: {msg.proposal.confidence}%
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs opacity-50 mt-2">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {state.isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </CardContent>

        <Separator />

        <CardFooter className="p-4">
          <div className="flex w-full gap-2">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi un messaggio all'AI... (Shift+Enter per nuova riga)"
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={state.isProcessing}
            />
            <Button
              onClick={handleSend}
              disabled={!inputMessage.trim() || state.isProcessing}
              size="icon"
              className="h-[60px] w-[60px]"
            >
              {state.isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
