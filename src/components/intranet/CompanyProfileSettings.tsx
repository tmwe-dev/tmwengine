import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Sparkles, Loader2 } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function CompanyProfileSettings() {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
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
              disabled={isSaving || isOptimizing}
            >
              Annulla
            </Button>
            <Button
              variant="secondary"
              onClick={handleOptimizeWithAI}
              disabled={isSaving || isOptimizing || !companyDescription.trim()}
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
              onClick={handleSave}
              disabled={isSaving || isOptimizing}
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
