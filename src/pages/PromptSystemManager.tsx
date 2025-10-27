import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PromptComposer } from '@/components/chat-laboratory/prompt-composer/PromptComposer';
import { ReadyPromptsList } from '@/components/chat-laboratory/ReadyPromptsList';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Brain, Loader2, BookOpen, ChevronDown, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PromptSectionsList } from '@/components/chat-laboratory/PromptSectionsList';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PromptSection {
  id: string;
  section_type: string;
  section_name: string;
  content: string;
  is_active: boolean;
  order_priority: number;
}

export default function PromptSystemManager() {
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

  useEffect(() => {
    loadGlobalPrompt();
    loadAllSections();
  }, []);

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
      const { data: globalData } = await supabase
        .from('chat_laboratory_system_prompts')
        .select('contenuto')
        .eq('attivo', true)
        .maybeSingle();

      const { data: baseData } = await supabase
        .from('chat_laboratory_prompt_sections')
        .select('content')
        .eq('section_type', 'base')
        .eq('is_active', true)
        .order('order_priority');

      const { data: rennyData } = await supabase
        .from('chat_laboratory_prompt_sections')
        .select('content')
        .eq('section_type', 'agent_personality')
        .eq('section_name', 'Renny - Esperto Logistica')
        .eq('is_active', true)
        .maybeSingle();

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

      setSections(prev => prev.map(section => 
        section.id === id 
          ? { ...section, content, updated_at: new Date().toISOString() }
          : section
      ));

      toast({
        title: "✅ Sezione Aggiornata",
        description: "Le modifiche sono state salvate.",
      });
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

      setSections(prev => prev.filter(section => section.id !== id));

      toast({
        title: "🗑️ Sezione Eliminata",
        description: "La sezione è stata rimossa.",
      });
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

      setSections(prev => prev.map(section => 
        section.id === id 
          ? { ...section, is_active: isActive }
          : section
      ));

      toast({
        title: isActive ? "✅ Sezione Attivata" : "⏸️ Sezione Disattivata",
        description: isActive ? "La sezione è ora attiva." : "La sezione è stata disattivata.",
      });
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
  const baseSections = sections.filter(s => s.section_type.toLowerCase() === 'base');
  const personalitySections = sections.filter(s => s.section_type.toLowerCase() === 'agent_personality');
  const styleSections = sections.filter(s => s.section_type.toLowerCase() === 'conversation_style');
  const orchestratorSection = sections.find(s => s.section_type.toLowerCase() === 'orchestrator_rules');

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header fisso */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Gestione Prompt Sistema</h1>
            <p className="text-sm text-muted-foreground">
              Configura prompt globali, personalità, stili e compositore avanzato
            </p>
          </div>
        </div>
      </div>

      {/* Content area with tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tabs navigation */}
          <div className="border-b px-4 bg-background flex-shrink-0">
            <TabsList className="w-full justify-start h-12">
              <TabsTrigger value="global">🌐 Globale</TabsTrigger>
              <TabsTrigger value="base">📚 Base</TabsTrigger>
              <TabsTrigger value="personality">🎭 Personalità</TabsTrigger>
              <TabsTrigger value="styles">💬 Stili</TabsTrigger>
              <TabsTrigger value="orchestrator">🧠 Orchestrator</TabsTrigger>
              <TabsTrigger value="composer">🧩 Compositore</TabsTrigger>
              <TabsTrigger value="ready">📦 Prompt Pronti</TabsTrigger>
            </TabsList>
          </div>

          {/* Tab contents */}
          <div className="flex-1 overflow-hidden">
          {/* TAB COMPOSER - Full height senza scroll wrapper */}
          <TabsContent value="composer" className="h-full m-0 p-0">
            <PromptComposer />
          </TabsContent>

          {/* TAB GLOBALE - Con scroll interno */}
          <TabsContent value="global" className="h-full overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex flex-col min-h-0">
                <Label htmlFor="global-prompt" className="mb-2">Prompt Globale per tutti gli Agenti AI</Label>
                <Textarea
                  id="global-prompt"
                  value={globalPrompt}
                  onChange={(e) => setGlobalPrompt(e.target.value)}
                  placeholder="Inserisci il prompt di sistema globale..."
                  className="font-mono text-sm resize-none min-h-[400px]"
                  disabled={isLoadingGlobal}
                />
              </div>
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
                    <ChevronDown className="h-4 w-4 transition-transform" />
                    <span className="font-medium">🍺 Renny + Stile Bar Chat</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="p-4 bg-card border rounded-lg relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyTemplateToClipboard(`Template Bar Chat esempio completo`, 'Bar Chat')}
                      >
                        {copiedTemplate === 'Bar Chat' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <pre className="text-xs font-mono whitespace-pre-wrap pr-12">Template esempio Bar Chat</pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Esempio 2: Boss Talk */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <ChevronDown className="h-4 w-4 transition-transform" />
                    <span className="font-medium">🎯 Renny + Stile Boss Talk</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="p-4 bg-card border rounded-lg relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyTemplateToClipboard(`Template Boss Talk esempio completo`, 'Boss Talk')}
                      >
                        {copiedTemplate === 'Boss Talk' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <pre className="text-xs font-mono whitespace-pre-wrap pr-12">Template esempio Boss Talk</pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Esempio 3: Colleagues */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <ChevronDown className="h-4 w-4 transition-transform" />
                    <span className="font-medium">🤝 Renny + Stile Colleghi</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="p-4 bg-card border rounded-lg relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyTemplateToClipboard(`Template Colleghi esempio completo`, 'Colleghi')}
                      >
                        {copiedTemplate === 'Colleghi' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <pre className="text-xs font-mono whitespace-pre-wrap pr-12">Template esempio Colleghi</pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
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
            </div>
          </TabsContent>

          {/* TAB BASE */}
          <TabsContent value="base" className="h-full overflow-y-auto p-6">
            {isLoadingSections ? (
              <div className="flex items-center justify-center h-full">
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

          {/* TAB PERSONALITY */}
          <TabsContent value="personality" className="h-full overflow-y-auto p-6">
            {isLoadingSections ? (
              <div className="flex items-center justify-center h-full">
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

          {/* TAB STYLES */}
          <TabsContent value="styles" className="h-full overflow-y-auto p-6">
            {isLoadingSections ? (
              <div className="flex items-center justify-center h-full">
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

          {/* TAB ORCHESTRATOR */}
          <TabsContent value="orchestrator" className="h-full overflow-y-auto p-6">
            {isLoadingSections ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : orchestratorSection ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">🧠 Regole Orchestrator Autonomo</h3>
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
                  className="font-mono text-sm resize-none min-h-[400px]"
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
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nessuna sezione orchestrator trovata. Ricaricare la pagina.
              </div>
            )}
          </TabsContent>

          {/* TAB READY PROMPTS */}
          <TabsContent value="ready" className="h-full m-0 p-0">
            <ReadyPromptsList />
          </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
