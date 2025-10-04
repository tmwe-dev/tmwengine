import { useState } from "react";
import { Brain, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChatPopupProps {
  pageRoute: string;
}

export function AIChatPopup({ pageRoute }: AIChatPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!prompt.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setIsLoading(true);

    try {
      // Get page-specific system prompt
      const { data: pagePrompt } = await supabase
        .from("page_system_prompts")
        .select("system_prompt")
        .eq("page_route", pageRoute)
        .eq("attivo", true)
        .single();

      const systemPrompt = pagePrompt?.system_prompt || "Sei un assistente AI per il CRM FindAir.";

      // Call AI chat function
      const { data, error } = await supabase.functions.invoke("chat-with-openai", {
        body: {
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: prompt },
          ],
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response || "Errore nella risposta AI",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error calling AI:", error);
      toast({
        title: "Errore AI",
        description: "Impossibile contattare l'assistente AI",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="icon"
        className="relative"
      >
        <Brain className="h-5 w-5" />
      </Button>

      {/* Chat Popup - Centered on page */}
      {isOpen && (
        <Card 
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-[600px] shadow-2xl z-50 flex flex-col bg-background/95"
          style={{ backgroundImage: 'var(--gradient-page)', backgroundBlendMode: 'overlay' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              <h3 className="font-semibold">AI Assistant CRM</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="hover:bg-primary-foreground/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chiedimi qualsiasi cosa sul CRM!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Scrivi il tuo messaggio..."
                className="resize-none"
                rows={2}
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!prompt.trim() || isLoading}
                size="icon"
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
