import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, MessageSquare } from 'lucide-react';

const Chat = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    
    try {
      // TODO: Implementare chiamata API per ChatGPT
      console.log('Prompt inviato:', prompt);
      
      // Simulazione chiamata API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPrompt('');
    } catch (error) {
      console.error('Errore invio prompt:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary" />
          Chat AI
        </h1>
        <p className="text-muted-foreground mt-2">
          Inserisci il tuo prompt per interagire con l'intelligenza artificiale
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prompt di Comando</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Inserisci qui il tuo prompt..."
                className="min-h-[120px] resize-none"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={!prompt.trim() || isLoading}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {isLoading ? 'Invio...' : 'Invia Prompt'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Cronologia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Le conversazioni appariranno qui...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Chat;