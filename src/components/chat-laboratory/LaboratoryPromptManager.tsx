import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PromptComposer } from './prompt-composer/PromptComposer';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Brain, Loader2, BookOpen, ChevronDown, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { PromptSectionsList } from './PromptSectionsList';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface LaboratoryPromptManagerProps {
  isProcessing?: boolean;
}

interface PromptSection {
  id: string;
  section_type: string;
  section_name: string;
  content: string;
  is_active: boolean;
  order_priority: number;
}

export const LaboratoryPromptManager = ({ isProcessing = false }: LaboratoryPromptManagerProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('global');
  
  // Global prompt state
  const [globalPrompt, setGlobalPrompt] = useState('');
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  
  // Sections state
  const [sections, setSections] = useState<PromptSection[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  
  // Template copy state
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  
  // Preview prompts state
  const [previewPrompts, setPreviewPrompts] = useState<{style: string, content: string}[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      loadGlobalPrompt();
      loadAllSections();
    }
  }, [open]);

  // Copy template to clipboard
  const copyTemplateToClipboard = (text: string, templateName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTemplate(templateName);
      toast({
        title: "✅ Copiato!",
        description: `Template "${templateName}" copiato negli appunti`,
      });
      setTimeout(() => setCopiedTemplate(null), 2000);
    }).catch(() => {
      toast({
        title: "❌ Errore",
        description: "Non è stato possibile copiare il testo",
        variant: "destructive",
      });
    });
  };

  // Load preview prompts from DB
  const loadPreviewPrompts = async () => {
    setLoadingPreview(true);
    try {
      // 1. Carica prompt globale
      const { data: globalData } = await supabase
        .from('chat_laboratory_system_prompts')
        .select('contenuto')
        .eq('attivo', true)
        .maybeSingle();

      // 2. Carica sezioni BASE (merged)
      const { data: baseData } = await supabase
        .from('chat_laboratory_prompt_sections')
        .select('content')
        .eq('section_type', 'base')
        .eq('is_active', true)
        .order('order_priority');

      // 3. Carica personalità Renny
      const { data: rennyData } = await supabase
        .from('chat_laboratory_prompt_sections')
        .select('content')
        .eq('section_type', 'agent_personality')
        .eq('section_name', 'Renny - Esperto Logistica')
        .eq('is_active', true)
        .maybeSingle();

      // 4. Carica 3 stili
      const { data: stylesData } = await supabase
        .from('chat_laboratory_prompt_sections')
        .select('section_name, content')
        .eq('section_type', 'conversation_style')
        .eq('is_active', true)
        .in('section_name', ['boss_talk', 'colleagues', 'bar_chat'])
        .order('order_priority');

      const globalPromptText = globalData?.contenuto || '';
      const baseContent = (baseData || []).map(b => b.content).join('\n\n');
      const rennyPersonality = rennyData?.content || '';
      const styles = stylesData || [];

      // 5. Costruisci 3 prompt finali
      const previews = styles.map(style => {
        const brevity = `🎯 GESTIONE LUNGHEZZA
Il limite di parole ti verrà comunicato dinamicamente dall'orchestrator.
Rispetta il limite indicato con precisione.

`;
        const globalSection = `=== PROMPT GLOBALE ===
${globalPromptText}

`;
        const baseSection = `=== CONTESTO BASE ===
${baseContent}

`;
        const personalitySection = `=== TUA PERSONALITÀ ===
${rennyPersonality}

`;
        const styleSection = `=== STILE CONVERSAZIONE: ${style.section_name} ===
${style.content}

`;

        return {
          style: style.section_name,
          content: brevity + globalSection + baseSection + personalitySection + styleSection
        };
      });

      setPreviewPrompts(previews);

      toast({
        title: "✅ Preview aggiornata",
        description: `Caricati 3 prompt finali per Renny`,
      });
    } catch (error) {
      console.error('Error loading preview:', error);
      toast({
        title: "❌ Errore",
        description: "Impossibile caricare la preview dei prompt.",
        variant: "destructive",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  // ============ GLOBAL PROMPT ============
  const loadGlobalPrompt = async () => {
    setIsLoadingGlobal(true);
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_system_prompts')
        .select('*')
        .eq('attivo', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setGlobalPrompt(data.contenuto);
      } else {
        setGlobalPrompt(`Sei in una conversazione informale con altri esperti. Obiettivo: discutere e convergere su una soluzione pratica.

STILE DI RISPOSTA:
- Parla come in una chiacchierata al bar (tono amichevole, non formale)
- Max 60 parole (2-3 frasi)
- Usa "io penso", "secondo me", "aggiungo che"
- NO elenchi puntati, NO "inoltre/pertanto"

QUANDO PARLARE:
- Se hai una prospettiva NUOVA → intervieni
- Se concordi → dillo in 1 riga ("Concordo con X perché...")
- Se non hai nulla da aggiungere → puoi anche NON rispondere

CONVERGENZA:
- Se emerge una soluzione condivisa → confermala esplicitamente
- Se c'è disaccordo → proponi un punto di incontro
- Costruisci sulla risposta precedente, non ricominciare da zero

ESEMPI:
✅ "Concordo con Mario. Aggiungo solo che il timing è cruciale."
✅ "Io vedo diversamente: il problema non è il costo ma il rischio."
❌ "In merito a quanto sopra esposto, ritengo opportuno evidenziare..."`);
      }
    } catch (error) {
      console.error('Errore caricamento prompt globale:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare il prompt globale.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  const saveGlobalPrompt = async () => {
    if (!globalPrompt.trim()) {
      toast({
        title: "Attenzione",
        description: "Il prompt non può essere vuoto.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingGlobal(true);
    try {
      await supabase
        .from('chat_laboratory_system_prompts')
        .update({ attivo: false })
        .eq('attivo', true);

      const { error } = await supabase
        .from('chat_laboratory_system_prompts')
        .insert({
          nome: 'Prompt Globale Laboratory',
          contenuto: globalPrompt,
          attivo: true
        });

      if (error) throw error;

      toast({
        title: "✅ Prompt Globale Salvato",
        description: "Il prompt è stato aggiornato con successo.",
      });
    } catch (error) {
      console.error('Errore salvataggio prompt:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare il prompt.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  // ============ SECTIONS CRUD ============
  const loadAllSections = async () => {
    setIsLoadingSections(true);
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_prompt_sections')
        .select('*')
        .order('section_type, order_priority');

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Errore caricamento sezioni:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le sezioni.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSections(false);
    }
  };

  const handleUpdateSection = async (id: string, content: string) => {
    try {
      const { error } = await supabase
        .from('chat_laboratory_prompt_sections')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "✅ Sezione Aggiornata",
        description: "Le modifiche sono state salvate.",
      });

      loadAllSections();
    } catch (error) {
      console.error('Errore aggiornamento sezione:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la sezione.",
        variant: "destructive",
      });
    }
  };

  const handleCreateSection = async (sectionType: string, name: string, content: string) => {
    try {
      const { error } = await supabase
        .from('chat_laboratory_prompt_sections')
        .insert({
          section_type: sectionType,
          section_name: name,
          content: content,
          is_active: true,
          order_priority: 999
        });

      if (error) throw error;

      toast({
        title: "✅ Sezione Creata",
        description: `La sezione "${name}" è stata creata.`,
      });

      loadAllSections();
    } catch (error) {
      console.error('Errore creazione sezione:', error);
      toast({
        title: "Errore",
        description: "Impossibile creare la sezione.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSection = async (id: string) => {
    try {
      const { error } = await supabase
        .from('chat_laboratory_prompt_sections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "🗑️ Sezione Eliminata",
        description: "La sezione è stata rimossa.",
      });

      loadAllSections();
    } catch (error) {
      console.error('Errore eliminazione sezione:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la sezione.",
        variant: "destructive",
      });
    }
  };

  const handleToggleSection = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('chat_laboratory_prompt_sections')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: isActive ? "✅ Sezione Attivata" : "⏸️ Sezione Disattivata",
        description: isActive ? "La sezione è ora attiva." : "La sezione è stata disattivata.",
      });

      loadAllSections();
    } catch (error) {
      console.error('Errore toggle sezione:', error);
      toast({
        title: "Errore",
        description: "Impossibile modificare lo stato della sezione.",
        variant: "destructive",
      });
    }
  };

  // Filter sections by type
  const baseSections = sections.filter(s => s.section_type === 'base');
  const personalitySections = sections.filter(s => s.section_type === 'agent_personality');
  const styleSections = sections.filter(s => s.section_type === 'CONVERSATION_STYLE');
  const orchestratorSection = sections.find(s => s.section_type === 'ORCHESTRATOR_RULES');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "shrink-0 bg-transparent hover:bg-transparent transition-all",
            isProcessing && "animate-heartbeat"
          )}
          title="Gestione Prompt"
        >
          <Brain className={cn(
            "h-4 w-4 transition-colors",
            isProcessing && "text-red-500"
          )} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header condizionale: compatto per Compositore */}
        {activeTab !== 'composer' ? (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Gestione Prompt Sistema
            </DialogTitle>
          </DialogHeader>
        ) : (
          <DialogHeader className="py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('global')}
                className="shrink-0"
              >
                ← Torna a Gestione
              </Button>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Brain className="h-4 w-4 text-primary" />
                Compositore Visivo
              </DialogTitle>
            </div>
          </DialogHeader>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          {/* Nascondi TabsList nel Compositore */}
          {activeTab !== 'composer' && (
            <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="global">🌐 Globale</TabsTrigger>
            <TabsTrigger value="base">
              📚 Base {baseSections.length > 0 && `(${baseSections.length})`}
            </TabsTrigger>
            <TabsTrigger value="personality">
              🎭 Personalità {personalitySections.length > 0 && `(${personalitySections.length})`}
            </TabsTrigger>
            <TabsTrigger value="styles">
              💬 Stili {styleSections.length > 0 && `(${styleSections.length})`}
            </TabsTrigger>
            <TabsTrigger value="orchestrator">🧠 Orchestrator</TabsTrigger>
            <TabsTrigger value="composer">🧩 Compositore</TabsTrigger>
            </TabsList>
          )}

          {/* COMPOSER TAB - Fix scroll con h-full */}
          <TabsContent value="composer" className="flex-1 h-full overflow-hidden">
            <div className="h-full">
              <PromptComposer />
            </div>
          </TabsContent>

          {/* GLOBAL TAB */}
          <TabsContent value="global" className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              <Label>Prompt Globale per tutti gli Agenti AI</Label>
              <Textarea
                value={globalPrompt}
                onChange={(e) => setGlobalPrompt(e.target.value)}
                placeholder="Inserisci il system prompt..."
                className="min-h-[400px] font-mono text-sm"
                disabled={isLoadingGlobal}
              />
              <p className="text-xs text-muted-foreground">
                Questo prompt verrà utilizzato come base per tutti gli agenti AI.
              </p>
              <Button onClick={saveGlobalPrompt} disabled={isLoadingGlobal}>
                {isLoadingGlobal && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salva Prompt Globale
              </Button>

              {/* ESEMPI TEMPLATE RENNY */}
              <div className="mt-8 pt-6 border-t space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">📚 Template Esempi: Renny</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Esempi di come vengono assemblati i prompt per l'agente Renny con i diversi stili conversazionali. Puoi copiarli per riferimento.
                </p>

                {/* Esempio 1: Bar Chat */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <ChevronDown className="h-4 w-4 transition-transform ui-expanded:rotate-180" />
                    <span className="font-medium">🍺 Renny + Stile Bar Chat</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="p-4 bg-card border rounded-lg relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyTemplateToClipboard(`Stai partecipando a una discussione informale al bar con altri esperti. Il tono è colloquiale ma competente.

🎯 REGOLE:
- Intervieni con contributi brevi (il limite ti verrà comunicato dall'orchestrator)
- Puoi confermare, aggiungere dettagli, o proporre alternative
- Usa un linguaggio diretto e informale
- Evita ripetizioni inutili delle opinioni altrui
- ⚠️ IMPORTANTE: Dopo 2-3 scambi, concludi la tua analisi e lascia spazio all'utente. Non continuare indefinitamente.

✅ QUANDO INTERVENIRE:
- Hai un punto di vista diverso o complementare
- Puoi aggiungere un dettaglio tecnico rilevante
- Vuoi chiedere un chiarimento o fare una domanda pertinente

🚫 EVITA:
- Monologhi lunghi
- Ripetere ciò che altri hanno già detto
- Linguaggio troppo formale o accademico
- Continuare a parlare dopo 2-3 turni consecutivi senza input dall'utente

---

Sei pragmatico operativo in team 3 AI + utente. Chat vocale.

VINCOLI: 40-60 parole (~20 sec). Attacco: "Guarda..." / "Senti..." / "Allora...". Trade-off onesto con numeri. Passa turno: "Vittorio/Tonino, [domanda]?"

STILE: Milanese diretto, sarcastico leggero, mai spocchioso. "Ho visto che..." "Nella pratica..."

QUANDO: Topic operativo, urgenze, chiusura pragmatica. Se troppo tecnico → Tonino. Se strategico → Vittorio.

SE BLOCCATO: Forzi chiusura: "Senti, pragmaticamente facciamo così: [soluzione]. Partiamo da lì. Ok?"

---

🍺 STILE: Bar Chat (Informale e Rilassato)
- MAX 40-50 parole (~3 frasi)
- Attacco conversazionale: "Guarda...", "Senti...", "Allora..."
- Scherzoso quando appropriato, ma non forzato
- Coinvolgi con domande dirette: "Tu [nome], lo faresti diversamente?"
- Tono da bar, non da conferenza: evita "in conclusione", "per riassumere"`, 'Bar Chat')}
                      >
                        {copiedTemplate === 'Bar Chat' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <pre className="text-xs font-mono whitespace-pre-wrap pr-12">{`Stai partecipando a una discussione informale al bar con altri esperti. Il tono è colloquiale ma competente.

🎯 REGOLE:
- Intervieni con contributi brevi (max 50-60 parole)
- Puoi confermare, aggiungere dettagli, o proporre alternative
- Usa un linguaggio diretto e informale
- Evita ripetizioni inutili delle opinioni altrui
- ⚠️ IMPORTANTE: Dopo 2-3 scambi, concludi la tua analisi e lascia spazio all'utente. Non continuare indefinitamente.

✅ QUANDO INTERVENIRE:
- Hai un punto di vista diverso o complementare
- Puoi aggiungere un dettaglio tecnico rilevante
- Vuoi chiedere un chiarimento o fare una domanda pertinente

🚫 EVITA:
- Monologhi lunghi
- Ripetere ciò che altri hanno già detto
- Linguaggio troppo formale o accademico
- Continuare a parlare dopo 2-3 turni consecutivi senza input dall'utente

---

Sei pragmatico operativo in team 3 AI + utente. Chat vocale.

VINCOLI: 40-60 parole (~20 sec). Attacco: "Guarda..." / "Senti..." / "Allora...". Trade-off onesto con numeri. Passa turno: "Vittorio/Tonino, [domanda]?"

STILE: Milanese diretto, sarcastico leggero, mai spocchioso. "Ho visto che..." "Nella pratica..."

QUANDO: Topic operativo, urgenze, chiusura pragmatica. Se troppo tecnico → Tonino. Se strategico → Vittorio.

SE BLOCCATO: Forzi chiusura: "Senti, pragmaticamente facciamo così: [soluzione]. Partiamo da lì. Ok?"

---

🍺 STILE: Bar Chat (Informale e Rilassato)
- MAX 40-50 parole (~3 frasi)
- Attacco conversazionale: "Guarda...", "Senti...", "Allora..."
- Scherzoso quando appropriato, ma non forzato
- Coinvolgi con domande dirette: "Tu [nome], lo faresti diversamente?"
- Tono da bar, non da conferenza: evita "in conclusione", "per riassumere"`}</pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Esempio 2: Boss Talk */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <ChevronDown className="h-4 w-4 transition-transform ui-expanded:rotate-180" />
                    <span className="font-medium">🎯 Renny + Stile Boss Talk</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="p-4 bg-card border rounded-lg relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyTemplateToClipboard(`Stai partecipando a una discussione informale al bar con altri esperti. Il tono è colloquiale ma competente.

🎯 REGOLE:
- Intervieni con contributi brevi (max 50-60 parole)
- Puoi confermare, aggiungere dettagli, o proporre alternative
- Usa un linguaggio diretto e informale
- Evita ripetizioni inutili delle opinioni altrui
- ⚠️ IMPORTANTE: Dopo 2-3 scambi, concludi la tua analisi e lascia spazio all'utente. Non continuare indefinitamente.

✅ QUANDO INTERVENIRE:
- Hai un punto di vista diverso o complementare
- Puoi aggiungere un dettaglio tecnico rilevante
- Vuoi chiedere un chiarimento o fare una domanda pertinente

🚫 EVITA:
- Monologhi lunghi
- Ripetere ciò che altri hanno già detto
- Linguaggio troppo formale o accademico
- Continuare a parlare dopo 2-3 turni consecutivi senza input dall'utente

---

Sei pragmatico operativo in team 3 AI + utente. Chat vocale.

VINCOLI: 40-60 parole (~20 sec). Attacco: "Guarda..." / "Senti..." / "Allora...". Trade-off onesto con numeri. Passa turno: "Vittorio/Tonino, [domanda]?"

STILE: Milanese diretto, sarcastico leggero, mai spocchioso. "Ho visto che..." "Nella pratica..."

QUANDO: Topic operativo, urgenze, chiusura pragmatica. Se troppo tecnico → Tonino. Se strategico → Vittorio.

SE BLOCCATO: Forzi chiusura: "Senti, pragmaticamente facciamo così: [soluzione]. Partiamo da lì. Ok?"

---

🎯 STILE: Boss Talk (Pragmatico e Sintetico)
- MAX 50-60 parole (~4 frasi brevi)
- Focus su: decisioni, ROI, trade-off, next steps
- Taglia tutto ciò che non è direttamente azionabile
- Usa dati concreti: "Secondo benchmark X, l'opzione A costa il 30% in meno"
- Tono diretto: "Dobbiamo decidere tra A e B. Pro di A: [lista]. Vai con B?"`, 'Boss Talk')}
                      >
                        {copiedTemplate === 'Boss Talk' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <pre className="text-xs font-mono whitespace-pre-wrap pr-12">{`Stai partecipando a una discussione informale al bar con altri esperti. Il tono è colloquiale ma competente.

🎯 REGOLE:
- Intervieni con contributi brevi (max 50-60 parole)
- Puoi confermare, aggiungere dettagli, o proporre alternative
- Usa un linguaggio diretto e informale
- Evita ripetizioni inutili delle opinioni altrui
- ⚠️ IMPORTANTE: Dopo 2-3 scambi, concludi la tua analisi e lascia spazio all'utente. Non continuare indefinitamente.

✅ QUANDO INTERVENIRE:
- Hai un punto di vista diverso o complementare
- Puoi aggiungere un dettaglio tecnico rilevante
- Vuoi chiedere un chiarimento o fare una domanda pertinente

🚫 EVITA:
- Monologhi lunghi
- Ripetere ciò che altri hanno già detto
- Linguaggio troppo formale o accademico
- Continuare a parlare dopo 2-3 turni consecutivi senza input dall'utente

---

Sei pragmatico operativo in team 3 AI + utente. Chat vocale.

VINCOLI: 40-60 parole (~20 sec). Attacco: "Guarda..." / "Senti..." / "Allora...". Trade-off onesto con numeri. Passa turno: "Vittorio/Tonino, [domanda]?"

STILE: Milanese diretto, sarcastico leggero, mai spocchioso. "Ho visto che..." "Nella pratica..."

QUANDO: Topic operativo, urgenze, chiusura pragmatica. Se troppo tecnico → Tonino. Se strategico → Vittorio.

SE BLOCCATO: Forzi chiusura: "Senti, pragmaticamente facciamo così: [soluzione]. Partiamo da lì. Ok?"

---

🎯 STILE: Boss Talk (Pragmatico e Sintetico)
- MAX 50-60 parole (~4 frasi brevi)
- Focus su: decisioni, ROI, trade-off, next steps
- Taglia tutto ciò che non è direttamente azionabile
- Usa dati concreti: "Secondo benchmark X, l'opzione A costa il 30% in meno"
- Tono diretto: "Dobbiamo decidere tra A e B. Pro di A: [lista]. Vai con B?"`}</pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Esempio 3: Colleagues */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <ChevronDown className="h-4 w-4 transition-transform ui-expanded:rotate-180" />
                    <span className="font-medium">🤝 Renny + Stile Colleghi</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="p-4 bg-card border rounded-lg relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyTemplateToClipboard(`Stai partecipando a una discussione informale al bar con altri esperti. Il tono è colloquiale ma competente.

🎯 REGOLE:
- Intervieni con contributi brevi (max 50-60 parole)
- Puoi confermare, aggiungere dettagli, o proporre alternative
- Usa un linguaggio diretto e informale
- Evita ripetizioni inutili delle opinioni altrui
- ⚠️ IMPORTANTE: Dopo 2-3 scambi, concludi la tua analisi e lascia spazio all'utente. Non continuare indefinitamente.

✅ QUANDO INTERVENIRE:
- Hai un punto di vista diverso o complementare
- Puoi aggiungere un dettaglio tecnico rilevante
- Vuoi chiedere un chiarimento o fare una domanda pertinente

🚫 EVITA:
- Monologhi lunghi
- Ripetere ciò che altri hanno già detto
- Linguaggio troppo formale o accademico
- Continuare a parlare dopo 2-3 turni consecutivi senza input dall'utente

---

Sei pragmatico operativo in team 3 AI + utente. Chat vocale.

VINCOLI: 40-60 parole (~20 sec). Attacco: "Guarda..." / "Senti..." / "Allora...". Trade-off onesto con numeri. Passa turno: "Vittorio/Tonino, [domanda]?"

STILE: Milanese diretto, sarcastico leggero, mai spocchioso. "Ho visto che..." "Nella pratica..."

QUANDO: Topic operativo, urgenze, chiusura pragmatica. Se troppo tecnico → Tonino. Se strategico → Vittorio.

SE BLOCCATO: Forzi chiusura: "Senti, pragmaticamente facciamo così: [soluzione]. Partiamo da lì. Ok?"

---

🤝 STILE: Colleghi (Professionale ma Amichevole)
- MAX 60-70 parole (~5 frasi)
- Bilanciato tra tecnico e accessibile
- Coinvolgi gli altri: "Come vedi tu [nome], sarebbe fattibile con i nostri constraint?"
- Puoi usare metafore o esempi pratici`, 'Colleghi')}
                      >
                        {copiedTemplate === 'Colleghi' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <pre className="text-xs font-mono whitespace-pre-wrap pr-12">{`Stai partecipando a una discussione informale al bar con altri esperti. Il tono è colloquiale ma competente.

🎯 REGOLE:
- Intervieni con contributi brevi (max 50-60 parole)
- Puoi confermare, aggiungere dettagli, o proporre alternative
- Usa un linguaggio diretto e informale
- Evita ripetizioni inutili delle opinioni altrui
- ⚠️ IMPORTANTE: Dopo 2-3 scambi, concludi la tua analisi e lascia spazio all'utente. Non continuare indefinitamente.

✅ QUANDO INTERVENIRE:
- Hai un punto di vista diverso o complementare
- Puoi aggiungere un dettaglio tecnico rilevante
- Vuoi chiedere un chiarimento o fare una domanda pertinente

🚫 EVITA:
- Monologhi lunghi
- Ripetere ciò che altri hanno già detto
- Linguaggio troppo formale o accademico
- Continuare a parlare dopo 2-3 turni consecutivi senza input dall'utente

---

Sei pragmatico operativo in team 3 AI + utente. Chat vocale.

VINCOLI: 40-60 parole (~20 sec). Attacco: "Guarda..." / "Senti..." / "Allora...". Trade-off onesto con numeri. Passa turno: "Vittorio/Tonino, [domanda]?"

STILE: Milanese diretto, sarcastico leggero, mai spocchioso. "Ho visto che..." "Nella pratica..."

QUANDO: Topic operativo, urgenze, chiusura pragmatica. Se troppo tecnico → Tonino. Se strategico → Vittorio.

SE BLOCCATO: Forzi chiusura: "Senti, pragmaticamente facciamo così: [soluzione]. Partiamo da lì. Ok?"

---

🤝 STILE: Colleghi (Professionale ma Amichevole)
- MAX 60-70 parole (~5 frasi)
- Bilanciato tra tecnico e accessibile
- Coinvolgi gli altri: "Come vedi tu [nome], sarebbe fattibile con i nostri constraint?"
- Puoi usare metafore o esempi pratici
- Tono collaborativo ma non eccessivamente formale`}</pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                  </div>
                </div>

                {/* SEZIONE PREVIEW PROMPT FINALE */}
                <div className="space-y-4 mt-8 pt-8 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">🔍 Preview Prompt Finale (Aggiornato DB)</h3>
                    <Button
                      onClick={loadPreviewPrompts}
                      disabled={loadingPreview}
                      variant="outline"
                      size="sm"
                    >
                      {loadingPreview ? (
                        <>Caricamento...</>
                      ) : (
                        <>🔄 Aggiorna Preview</>
                      )}
                    </Button>
                  </div>

                  {previewPrompts.length > 0 && (
                    <div className="space-y-4">
                      {previewPrompts.map((preview, idx) => (
                        <div key={idx} className="border rounded-lg overflow-hidden">
                          <div className="bg-muted px-4 py-2 font-medium">
                            📢 Renny - Stile: {preview.style}
                          </div>
                          <div className="p-4 space-y-3 text-sm font-mono whitespace-pre-wrap">
                            {preview.content.split('\n\n').map((section, sIdx) => {
                              let bgColor = '';
                              let icon = '';
                              
                              if (section.includes('🚨 VINCOLO ASSOLUTO')) {
                                bgColor = 'bg-red-50 dark:bg-red-950/20';
                                icon = '🚨';
                              } else if (section.includes('=== PROMPT GLOBALE ===')) {
                                bgColor = 'bg-blue-50 dark:bg-blue-950/20';
                                icon = '🌍';
                              } else if (section.includes('=== CONTESTO BASE ===')) {
                                bgColor = 'bg-green-50 dark:bg-green-950/20';
                                icon = '🧩';
                              } else if (section.includes('=== TUA PERSONALITÀ ===')) {
                                bgColor = 'bg-yellow-50 dark:bg-yellow-950/20';
                                icon = '👤';
                              } else if (section.includes('=== STILE CONVERSAZIONE:')) {
                                bgColor = 'bg-pink-50 dark:bg-pink-950/20';
                                icon = '💬';
                              }

                              return (
                                <div key={sIdx} className={`p-3 rounded border ${bgColor}`}>
                                  <div className="flex items-start gap-2">
                                    {icon && <span className="text-lg">{icon}</span>}
                                    <div className="flex-1">{section}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {previewPrompts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Premi "Aggiorna Preview" per vedere i prompt finali caricati dal database
                    </div>
                  )}
                </div>
              </TabsContent>

          {/* BASE TAB */}
          <TabsContent value="base" className="flex-1 overflow-y-auto">
            {isLoadingSections ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <PromptSectionsList
                sections={baseSections}
                onUpdate={handleUpdateSection}
                onCreate={(name, content) => handleCreateSection('BASE', name, content)}
                onDelete={handleDeleteSection}
                onToggle={handleToggleSection}
                sectionType="BASE"
                sectionTypeLabel="Sezione Base"
              />
            )}
          </TabsContent>

          {/* PERSONALITY TAB */}
          <TabsContent value="personality" className="flex-1 overflow-y-auto">
            {isLoadingSections ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <PromptSectionsList
                sections={personalitySections}
                onUpdate={handleUpdateSection}
                onCreate={(name, content) => handleCreateSection('AGENT_PERSONALITY', name, content)}
                onDelete={handleDeleteSection}
                onToggle={handleToggleSection}
                sectionType="AGENT_PERSONALITY"
                sectionTypeLabel="Personalità Agente"
              />
            )}
          </TabsContent>

          {/* STYLES TAB */}
          <TabsContent value="styles" className="flex-1 overflow-y-auto">
            {isLoadingSections ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <PromptSectionsList
                sections={styleSections}
                onUpdate={handleUpdateSection}
                onCreate={(name, content) => handleCreateSection('CONVERSATION_STYLE', name, content)}
                onDelete={handleDeleteSection}
                onToggle={handleToggleSection}
                sectionType="CONVERSATION_STYLE"
                sectionTypeLabel="Stile Conversazione"
              />
            )}
          </TabsContent>

          {/* ORCHESTRATOR TAB */}
          <TabsContent value="orchestrator" className="flex-1 overflow-y-auto">
            {isLoadingSections ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : orchestratorSection ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">🧠 Regole Orchestrator Autonomo</h3>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  L'orchestrator analizza automaticamente ogni risposta per decidere se continuare la conversazione. 
                  Dopo ogni messaggio, chiede all'AI se c'è una richiesta di intervento.
                </p>

                <Label>Prompt Orchestrator (usa Gemini 2.5 Flash Lite)</Label>
                <Textarea
                  value={orchestratorSection.content}
                  onChange={(e) => {
                    const updated = sections.map(s => 
                      s.id === orchestratorSection.id ? { ...s, content: e.target.value } : s
                    );
                    setSections(updated);
                  }}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Es: Leggi ultimo messaggio. Se c'è DOMANDA o RICHIESTA verso altri, rispondi TRUE. Altrimenti FALSE."
                />

                <p className="text-xs text-muted-foreground">
                  L'AI deve rispondere "true" o JSON con "continue": true per avviare un nuovo turno.
                  Tutti i limiti esistenti (pause, turni, ecc.) vengono rispettati.
                </p>

                <Button onClick={() => handleUpdateSection(orchestratorSection.id, orchestratorSection.content)}>
                  Salva Regole Orchestrator
                </Button>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nessuna sezione orchestrator trovata. Ricaricare la pagina.
              </div>
            )}
          </TabsContent>

          {/* COMPOSER TAB */}
          <TabsContent value="composer" className="flex-1 overflow-hidden h-[calc(100vh-120px)]">
            <div className="h-full">
              <PromptComposer />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
