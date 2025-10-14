import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emailRulesAPI, EmailRule, CreateRuleBulkRequest } from "@/lib/tmwe-email-rules-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { RuleComponentsSection } from "./RuleComponentsSection";
import { RuleActionsSection } from "./RuleActionsSection";

interface EmailRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: EmailRule | null;
}

export const EmailRuleDialog = ({ open, onOpenChange, rule }: EmailRuleDialogProps) => {
  const queryClient = useQueryClient();
  const isEdit = !!rule?.id_rule;

  const [components, setComponents] = useState<CreateRuleBulkRequest["componenti"]>([]);
  const [actions, setActions] = useState<CreateRuleBulkRequest["azioni"]>([]);

  const { register, handleSubmit, reset, watch, setValue } = useForm<EmailRule>({
    defaultValues: rule || {
      nome: "",
      descrizione: "",
      attivo: true,
      priorita: 100,
      azione_finale: "continue",
    },
  });

  useEffect(() => {
    if (rule) {
      reset(rule);
      if (rule.id_rule) {
        loadRuleDetails(rule.id_rule);
      }
    } else {
      reset({
        nome: "",
        descrizione: "",
        attivo: true,
        priorita: 100,
        azione_finale: "continue",
      });
      setComponents([]);
      setActions([]);
    }
  }, [rule, reset]);

  const loadRuleDetails = async (ruleId: number) => {
    try {
      const [comps, acts] = await Promise.all([
        emailRulesAPI.getComponents({ id_rule: ruleId }),
        emailRulesAPI.getActions({ id_rule: ruleId }),
      ]);
      
      setComponents(comps.map(c => ({
        campo: c.campo,
        operatore: c.operatore,
        valore: c.valore,
        ordine: c.ordine,
      })));
      
      setActions(acts.map(a => ({
        tipo_azione: a.tipo_azione,
        parametri: a.parametri,
        ordine: a.ordine,
      })));
    } catch (error) {
      toast.error("Errore nel caricamento dei dettagli");
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateRuleBulkRequest) => emailRulesAPI.createRuleBulk(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-rules"] });
      toast.success("Regola creata con successo");
      onOpenChange(false);
    },
    onError: () => toast.error("Errore durante la creazione"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<EmailRule>) =>
      emailRulesAPI.updateRule(rule!.id_rule!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-rules"] });
      toast.success("Regola aggiornata");
      onOpenChange(false);
    },
    onError: () => toast.error("Errore durante l'aggiornamento"),
  });

  const onSubmit = (data: EmailRule) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      if (components.length === 0) {
        toast.error("Aggiungi almeno una condizione");
        return;
      }
      if (actions.length === 0) {
        toast.error("Aggiungi almeno un'azione");
        return;
      }

      const bulkData: CreateRuleBulkRequest = {
        nome: data.nome,
        descrizione: data.descrizione,
        attivo: data.attivo,
        priorita: data.priorita,
        azione_finale: data.azione_finale,
        componenti: components,
        azioni: actions,
      };
      createMutation.mutate(bulkData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifica Regola" : "Nuova Regola"}</DialogTitle>
          <DialogDescription>
            Configura le condizioni e le azioni della regola email
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...register("nome", { required: true })} />
            </div>

            <div>
              <Label htmlFor="descrizione">Descrizione</Label>
              <Textarea id="descrizione" {...register("descrizione")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priorita">Priorità</Label>
                <Input
                  id="priorita"
                  type="number"
                  {...register("priorita", { valueAsNumber: true })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="attivo"
                  checked={watch("attivo")}
                  onCheckedChange={(checked) => setValue("attivo", checked)}
                />
                <Label htmlFor="attivo">Regola attiva</Label>
              </div>
            </div>
          </div>

          <RuleComponentsSection
            components={components}
            onChange={setComponents}
          />

          <RuleActionsSection
            actions={actions}
            onChange={setActions}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit">
              {isEdit ? "Aggiorna" : "Crea"} Regola
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
