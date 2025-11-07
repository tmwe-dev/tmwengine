import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Sparkles, Loader2, Brain } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function CompanyProfileSettings() {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isGeneratingKB, setIsGeneratingKB] = useState(false);
  const { profile, updateProfile } = useUserProfile();
  
  const [companyDescription, setCompanyDescription] = useState('');

  useEffect(() => {
    if (open && profile) {
      setCompanyDescription(profile.companyDescription || '');
    }
  }, [open, profile]);

  const handleOptimizeWithAI = async () => {
    if (!companyDescription.trim()) {
      toast.error('Inserisci prima una descrizione aziendale');
      return;
    }

    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-company-profile', {
        body: { user_description: companyDescription }
      });

      if (error) throw error;

      await updateProfile({
        companyDescription,
        companyContextAi: data.optimized_context,
        companyContextUpdatedAt: new Date().toISOString()
      });

      toast.success('Profilo aziendale ottimizzato con AI');
    } catch (error) {
      console.error('Error optimizing profile:', error);
      toast.error('Errore durante l\'ottimizzazione AI');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleGenerateKnowledgeBase = async () => {
    setIsGeneratingKB(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Non autenticato');

      // Carica TUTTI i gruppi esistenti
      const { data: groups, error: groupsError } = await supabase
        .from('email_sender_groups')
        .select('id, nome_gruppo');

      if (groupsError) throw groupsError;
      if (!groups || groups.length === 0) {
        toast.error('Nessun gruppo trovato');
        return;
      }

      // Conta mittenti per ogni gruppo
      const { data: rulesCount, error: rulesError } = await supabase
        .from('email_sender_rules')
        .select('group_id, sender_email')
        .in('group_id', groups.map(g => g.id));

      if (rulesError) throw rulesError;

      // Filtra gruppi con almeno 3 mittenti
      const sendersByGroup = new Map();
      (rulesCount || []).forEach(rule => {
        sendersByGroup.set(rule.group_id, (sendersByGroup.get(rule.group_id) || 0) + 1);
      });

      const qualifiedGroups = groups.filter(g => (sendersByGroup.get(g.id) || 0) >= 3);

      if (qualifiedGroups.length === 0) {
        toast.error('Nessun gruppo ha almeno 3 mittenti assegnati');
        return;
      }

      toast.info(`Generazione KB per ${qualifiedGroups.length} gruppi in corso...`);

      let successCount = 0;
      let errorCount = 0;

      // Genera KB per ogni gruppo qualificato
      for (const group of qualifiedGroups) {
        try {
          const { error } = await supabase.functions.invoke('generate-group-context', {
            body: {
              group_id: group.id,
              user_email: user.email
            }
          });

          if (error) throw error;
          successCount++;
          
          // Delay tra richieste (rate limiting)
          if (qualifiedGroups.indexOf(group) < qualifiedGroups.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err) {
          console.error(`KB error for ${group.nome_gruppo}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`✅ Knowledge Base generata per ${successCount}/${qualifiedGroups.length} gruppi`);
      } else {
        toast.error('Generazione fallita. Verifica configurazione AI.');
      }

    } catch (error) {
      console.error('KB generation error:', error);
      toast.error(error.message || 'Errore generazione Knowledge Base');
    } finally {
      setIsGeneratingKB(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateProfile({
        companyDescription
      });

      if (result.success) {
        toast.success('Profilo aziendale salvato');
        setOpen(false);
      } else {
        toast.error('Errore nel salvataggio del profilo');
      }
    } catch (error) {
      console.error('Error saving company profile:', error);
      toast.error('Errore nel salvataggio del profilo');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Building2 className="w-4 h-4 mr-2" />
          Profilo Aziendale
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profilo Aziendale</DialogTitle>
          <DialogDescription>
            Descrivi la tua azienda per aiutare l'AI a comprendere meglio il contesto delle email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Company Description */}
          <div className="space-y-2">
            <Label htmlFor="company-description">
              Descrizione Azienda
            </Label>
            <Textarea
              id="company-description"
              placeholder="Descrivi la tua azienda: settore, attività principali, tipo di clienti, prodotti/servizi offerti, contesto operativo..."
              value={companyDescription}
              onChange={(e) => setCompanyDescription(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Questa descrizione verrà utilizzata dall'AI per comprendere meglio il contesto delle tue email
            </p>
          </div>

          {/* AI Optimized Context (Read-only) */}
          {profile?.companyContextAi && (
            <div className="space-y-2">
              <Label>Contesto AI Ottimizzato</Label>
              <div className="p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm whitespace-pre-wrap">{profile.companyContextAi}</p>
              </div>
              {profile.companyContextUpdatedAt && (
                <p className="text-xs text-muted-foreground">
                  Ultimo aggiornamento: {new Date(profile.companyContextUpdatedAt).toLocaleString('it-IT')}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSaving || isOptimizing || isGeneratingKB}
            >
              Annulla
            </Button>
            <Button
              variant="secondary"
              onClick={handleOptimizeWithAI}
              disabled={isSaving || isOptimizing || isGeneratingKB || !companyDescription.trim()}
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ottimizzazione...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Ottimizza con AI
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateKnowledgeBase}
              disabled={isSaving || isOptimizing || isGeneratingKB}
            >
              {isGeneratingKB ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generazione KB...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Genera Knowledge Base
                </>
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || isOptimizing || isGeneratingKB}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
