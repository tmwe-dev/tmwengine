import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Zap, Shield, AlertTriangle } from 'lucide-react';

interface AutoExecuteConfig {
  auto_execute_enabled: boolean;
  confidence_threshold: number;
  allowed_auto_actions: string[];
  require_confirmation_actions: string[];
  max_auto_actions_per_day: number;
}

interface AutoExecuteConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_LABELS: Record<string, string> = {
  archive: 'Archivia',
  delete: 'Elimina',
  mark_urgent: 'Segna come urgente',
  reply: 'Rispondi',
  forward: 'Inoltra',
  create_task: 'Crea attività',
};

export function AutoExecuteConfigDialog({ open, onOpenChange }: AutoExecuteConfigDialogProps) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AutoExecuteConfig>({
    auto_execute_enabled: false,
    confidence_threshold: 0.90,
    allowed_auto_actions: ['archive', 'delete', 'mark_urgent'],
    require_confirmation_actions: ['reply', 'forward', 'create_task'],
    max_auto_actions_per_day: 50,
  });

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const loadConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('email_automation_config')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading config:', error);
        return;
      }

      if (data) {
        setConfig({
          auto_execute_enabled: data.auto_execute_enabled,
          confidence_threshold: Number(data.confidence_threshold),
          allowed_auto_actions: data.allowed_auto_actions || [],
          require_confirmation_actions: data.require_confirmation_actions || [],
          max_auto_actions_per_day: data.max_auto_actions_per_day,
        });
      }
    } catch (error) {
      console.error('Error loading auto-execute config:', error);
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Utente non autenticato');
        return;
      }

      const { error } = await supabase
        .from('email_automation_config')
        .upsert({
          user_id: user.id,
          auto_execute_enabled: config.auto_execute_enabled,
          confidence_threshold: config.confidence_threshold,
          allowed_auto_actions: config.allowed_auto_actions,
          require_confirmation_actions: config.require_confirmation_actions,
          max_auto_actions_per_day: config.max_auto_actions_per_day,
        });

      if (error) {
        console.error('Error saving config:', error);
        toast.error('Errore nel salvataggio configurazione');
        return;
      }

      toast.success('✅ Configurazione salvata');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Errore imprevisto');
    } finally {
      setLoading(false);
    }
  };

  const toggleAction = (action: string, isAutoAction: boolean) => {
    if (isAutoAction) {
      setConfig(prev => ({
        ...prev,
        allowed_auto_actions: prev.allowed_auto_actions.includes(action)
          ? prev.allowed_auto_actions.filter(a => a !== action)
          : [...prev.allowed_auto_actions, action],
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        require_confirmation_actions: prev.require_confirmation_actions.includes(action)
          ? prev.require_confirmation_actions.filter(a => a !== action)
          : [...prev.require_confirmation_actions, action],
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurazione Auto-Esecuzione
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enable Auto-Execute */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="auto-execute" className="font-semibold">
                  Abilita Esecuzione Automatica
                </Label>
                <p className="text-sm text-muted-foreground">
                  Le azioni ad alta confidenza verranno eseguite automaticamente
                </p>
              </div>
            </div>
            <Switch
              id="auto-execute"
              checked={config.auto_execute_enabled}
              onCheckedChange={(checked) =>
                setConfig(prev => ({ ...prev, auto_execute_enabled: checked }))
              }
            />
          </div>

          {/* Confidence Threshold */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <Label>Soglia di Confidenza: {(config.confidence_threshold * 100).toFixed(0)}%</Label>
            </div>
            <Slider
              value={[config.confidence_threshold]}
              onValueChange={([value]) =>
                setConfig(prev => ({ ...prev, confidence_threshold: value }))
              }
              min={0.5}
              max={1.0}
              step={0.05}
              disabled={!config.auto_execute_enabled}
            />
            <p className="text-sm text-muted-foreground">
              Solo azioni con confidenza superiore verranno eseguite automaticamente
            </p>
          </div>

          {/* Allowed Auto Actions */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Azioni Eseguibili Automaticamente
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {['archive', 'delete', 'mark_urgent'].map((action) => (
                <div
                  key={action}
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => toggleAction(action, true)}
                >
                  <Switch
                    checked={config.allowed_auto_actions.includes(action)}
                    disabled={!config.auto_execute_enabled}
                  />
                  <span className="text-sm">{ACTION_LABELS[action]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Require Confirmation Actions */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Azioni che Richiedono Conferma
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {['reply', 'forward', 'create_task'].map((action) => (
                <div
                  key={action}
                  className="flex items-center gap-2 p-3 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20"
                >
                  <Shield className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">{ACTION_LABELS[action]}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Queste azioni richiedono sempre conferma manuale
            </p>
          </div>

          {/* Max actions per day */}
          <div className="space-y-2">
            <Label>Limite Giornaliero: {config.max_auto_actions_per_day} azioni/giorno</Label>
            <Slider
              value={[config.max_auto_actions_per_day]}
              onValueChange={([value]) =>
                setConfig(prev => ({ ...prev, max_auto_actions_per_day: value }))
              }
              min={10}
              max={200}
              step={10}
              disabled={!config.auto_execute_enabled}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={saveConfig} disabled={loading}>
            {loading ? 'Salvataggio...' : 'Salva Configurazione'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
