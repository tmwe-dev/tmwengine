import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const IntranetSetupChecker = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [checks, setChecks] = useState({
    globalPrompt: false,
    userProfile: false,
    hasRoom: false,
  });
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    runChecks();
  }, []);

  const runChecks = async () => {
    setIsChecking(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsChecking(false);
        return;
      }

      // Check 1: Prompt globale esiste
      const { data: promptData } = await supabase
        .from('intranet_global_ai_prompt')
        .select('id')
        .eq('attivo', true)
        .maybeSingle();

      // Check 2: Profilo utente esiste
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Check 3: Almeno una stanza disponibile
      const { data: roomMembership } = await supabase
        .from('intranet_room_members')
        .select('room_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      const checkResults = {
        globalPrompt: !!promptData,
        userProfile: !!profileData,
        hasRoom: !!roomMembership,
      };

      setChecks(checkResults);
      setIsComplete(Object.values(checkResults).every(v => v));
    } catch (error) {
      console.error('Error running checks:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile verificare la configurazione',
        variant: 'destructive'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const initializeGlobalPrompt = async () => {
    try {
      const defaultPrompt = `Sei un assistente AI per la traduzione e comunicazione in tempo reale in una chat aziendale.

COMPITI PRINCIPALI:
1. Traduzione automatica: Traduci i messaggi tra diverse lingue mantenendo il tono e il contesto
2. Suggerimenti di risposta: Fornisci suggerimenti contestuali quando richiesto
3. Auto-speaker: Converti il testo in formato vocale quando abilitato

LINEE GUIDA:
- Mantieni sempre un tono professionale ma cordiale
- Rispetta le preferenze linguistiche di ogni utente
- Preserva formattazione, emoticon e contesto culturale
- Segnala quando una traduzione potrebbe avere multiple interpretazioni
- Non tradurre nomi propri, brand o termini tecnici specifici`;

      const { error } = await supabase
        .from('intranet_global_ai_prompt')
        .insert({
          prompt_contenuto: defaultPrompt,
          attivo: true
        });

      if (error) throw error;

      toast({
        title: 'Prompt inizializzato',
        description: 'Il prompt AI globale è stato configurato'
      });

      runChecks();
    } catch (error) {
      console.error('Error initializing prompt:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile inizializzare il prompt',
        variant: 'destructive'
      });
    }
  };

  if (isChecking) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isComplete) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-green-700 dark:text-green-400">
          L'intranet è configurata correttamente e pronta all'uso!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurazione Intranet</CardTitle>
        <CardDescription>
          Alcuni passaggi di configurazione richiedono attenzione
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {!checks.globalPrompt && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Prompt AI globale non configurato</span>
                <Button size="sm" onClick={initializeGlobalPrompt}>
                  Inizializza
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!checks.userProfile && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Profilo utente mancante (verrà creato automaticamente al login)
              </AlertDescription>
            </Alert>
          )}

          {!checks.hasRoom && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nessuna stanza disponibile. Crea una stanza per iniziare.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Button onClick={runChecks} variant="outline" className="w-full">
          Ricontrolla
        </Button>
      </CardContent>
    </Card>
  );
};
