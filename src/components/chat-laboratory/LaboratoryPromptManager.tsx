import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Brain, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { PromptSectionsList } from './PromptSectionsList';

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
  
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      loadGlobalPrompt();
      loadAllSections();
    }
  }, [open]);

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
  const baseSections = sections.filter(s => s.section_type === 'BASE');
  const personalitySections = sections.filter(s => s.section_type === 'AGENT_PERSONALITY');
  const styleSections = sections.filter(s => s.section_type === 'CONVERSATION_STYLE');

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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Gestione Prompt Sistema
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
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
          </TabsList>

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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
