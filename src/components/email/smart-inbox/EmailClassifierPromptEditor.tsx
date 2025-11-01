import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Copy, Plus, Trash2, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EmailClassifierPrompt {
  id: string;
  name: string;
  content: string;
  target_agent: string;
  created_at: string;
  updated_at: string;
}

interface EmailClassifierPromptEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_PROMPT = `Sei un assistente AI specializzato nella classificazione automatica di email per un'azienda di trasporti e spedizioni internazionali.

CATEGORIE DISPONIBILI:
1. Fatture - Fatture, invoices, ricevute fiscali
2. Bolle / Packing List - DDT, bolle di accompagnamento, packing list
3. Preventivi / Quotazioni - Richieste preventivo, quotazioni, offerte commerciali
4. Rate Aeree / Rate Navali - Tariffe aeree e marittime
5. Documenti Spedizione - Documenti doganali, CMR, AWB
6. Offerte di Lavoro - Proposte di lavoro, recruiting
7. Marketing / Pubblicità - Newsletter, pubblicità, promozioni
8. Spam / Non Rilevante - Spam, email irrilevanti

ISTRUZIONI:
- Analizza l'oggetto e il mittente dell'email
- Classifica l'email nella categoria più appropriata
- Fornisci un riassunto di max 100 parole
- Estrai 3-5 keywords principali
- Assegna un punteggio di confidenza (0-100)
- Se non sei sicuro al 100%, suggerisci 2-3 categorie alternative

OUTPUT FORMATO JSON:
{
  "category": "Nome Categoria",
  "confidence": 85,
  "ai_summary": "Riassunto breve dell'email...",
  "keywords": ["parola1", "parola2", "parola3"],
  "alternative_categories": ["Categoria2", "Categoria3"]
}

REGOLE:
- Priorità a fatture, preventivi e documenti operativi
- Spam solo se chiaramente irrilevante
- Confidenza >90 solo se categoria evidente
- Riassunto conciso e informativo`;

export const EmailClassifierPromptEditor = ({ open, onOpenChange }: EmailClassifierPromptEditorProps) => {
  const [prompts, setPrompts] = useState<EmailClassifierPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [currentName, setCurrentName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');

  // Carica tutti i prompt email classifier
  const loadPrompts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_composed_prompts')
        .select('*')
        .eq('target_agent', 'email_classifier')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPrompts(data || []);
      
      // Seleziona il primo prompt se disponibile
      if (data && data.length > 0) {
        const firstPrompt = data[0];
        setSelectedPromptId(firstPrompt.id);
        setCurrentPrompt(firstPrompt.content);
        setCurrentName(firstPrompt.name);
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
      toast.error('Errore nel caricamento dei prompt');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPrompts();
    }
  }, [open]);

  // Cambia prompt selezionato
  const handleSelectPrompt = (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (prompt) {
      setSelectedPromptId(promptId);
      setCurrentPrompt(prompt.content);
      setCurrentName(prompt.name);
    }
  };

  // Salva modifiche al prompt esistente
  const handleSave = async () => {
    if (!selectedPromptId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('chat_laboratory_composed_prompts')
        .update({
          content: currentPrompt,
          name: currentName,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPromptId);

      if (error) throw error;

      toast.success('✅ Prompt salvato');
      await loadPrompts();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  // Salva come nuovo prompt
  const handleSaveAs = async () => {
    if (!newPromptName.trim()) {
      toast.error('Inserisci un nome per il nuovo prompt');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('chat_laboratory_composed_prompts')
        .insert({
          name: newPromptName,
          content: currentPrompt,
          target_agent: 'email_classifier',
          section_ids: []
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`✅ Nuovo prompt "${newPromptName}" creato`);
      setShowSaveAsDialog(false);
      setNewPromptName('');
      await loadPrompts();
      if (data) {
        setSelectedPromptId(data.id);
      }
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast.error('Errore nella creazione');
    } finally {
      setIsSaving(false);
    }
  };

  // Elimina prompt
  const handleDelete = async () => {
    if (!selectedPromptId || prompts.length <= 1) {
      toast.error('Non puoi eliminare l\'ultimo prompt');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('chat_laboratory_composed_prompts')
        .delete()
        .eq('id', selectedPromptId);

      if (error) throw error;

      toast.success('🗑️ Prompt eliminato');
      setShowDeleteDialog(false);
      await loadPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Errore nell\'eliminazione');
    } finally {
      setIsSaving(false);
    }
  };

  // Ripristina prompt default
  const handleRestoreDefault = () => {
    setCurrentPrompt(DEFAULT_PROMPT);
    toast.info('📝 Prompt default ripristinato (non salvato)');
  };

  // Copia negli appunti
  const handleCopy = () => {
    navigator.clipboard.writeText(currentPrompt);
    toast.success('📋 Prompt copiato negli appunti');
  };

  const selectedPrompt = prompts.find(p => p.id === selectedPromptId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] bg-gradient-to-br from-[#1c1c28]/95 via-[#23233a]/90 to-[#0e0e18]/95 backdrop-blur-xl border-white/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white/90">
              <span className="text-2xl">🤖</span>
              Editor Prompt Classificazione Email AI
            </DialogTitle>
          </DialogHeader>

          {/* Selector Prompt */}
          <div className="space-y-2">
            <Label className="text-white/70">Prompt Attivo</Label>
            <Select value={selectedPromptId} onValueChange={handleSelectPrompt} disabled={isLoading}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white/90">
                <SelectValue placeholder="Seleziona un prompt..." />
              </SelectTrigger>
              <SelectContent>
                {prompts.map((prompt) => (
                  <SelectItem key={prompt.id} value={prompt.id}>
                    {prompt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nome Prompt */}
          <div className="space-y-2">
            <Label className="text-white/70">Nome Prompt</Label>
            <Input
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              className="bg-white/5 border-white/10 text-white/90"
              placeholder="Nome del prompt..."
            />
          </div>

          {/* Editor Prompt */}
          <div className="space-y-2 flex-1">
            <Label className="text-white/70">Contenuto Prompt</Label>
            <ScrollArea className="h-[400px]">
              <Textarea
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                className="min-h-[400px] bg-white/5 border-white/10 text-white/85 font-mono text-sm leading-relaxed"
                placeholder="Inserisci il prompt..."
              />
            </ScrollArea>
          </div>

          {/* Metadati */}
          {selectedPrompt && (
            <div className="flex gap-2 flex-wrap text-xs">
              <Badge variant="secondary" className="bg-white/10 border-white/20 text-white/70">
                Creato: {new Date(selectedPrompt.created_at).toLocaleDateString('it-IT')}
              </Badge>
              <Badge variant="secondary" className="bg-white/10 border-white/20 text-white/70">
                Modificato: {new Date(selectedPrompt.updated_at).toLocaleDateString('it-IT')}
              </Badge>
              <Badge variant="secondary" className="bg-emerald-500/20 border-emerald-500/30 text-emerald-100">
                Modello: google/gemini-2.5-flash
              </Badge>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="bg-white/5 border-white/10 hover:bg-white/10"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copia
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestoreDefault}
              className="bg-white/5 border-white/10 hover:bg-white/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Ripristina Default
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveAsDialog(true)}
              className="bg-white/5 border-white/10 hover:bg-white/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Salva Come...
            </Button>
            {prompts.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="bg-red-500/20 border-red-500/30 hover:bg-red-500/30"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Elimina
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Salva Come */}
      <AlertDialog open={showSaveAsDialog} onOpenChange={setShowSaveAsDialog}>
        <AlertDialogContent className="bg-[#1c1c28] border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white/90">Salva Come Nuovo Prompt</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Inserisci un nome per il nuovo prompt
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newPromptName}
            onChange={(e) => setNewPromptName(e.target.value)}
            placeholder="Nome del nuovo prompt..."
            className="bg-white/5 border-white/10 text-white/90"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveAs();
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAs} disabled={isSaving}>
              Crea
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Conferma Elimina */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1c1c28] border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white/90">Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Sei sicuro di voler eliminare il prompt "{selectedPrompt?.name}"? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSaving}
              className="bg-red-500 hover:bg-red-600"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
