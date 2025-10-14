import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { emailRulesAPI, CreateRuleBulkRequest } from "@/lib/tmwe-email-rules-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface RuleActionsSectionProps {
  actions: CreateRuleBulkRequest["azioni"];
  onChange: (actions: CreateRuleBulkRequest["azioni"]) => void;
}

export const RuleActionsSection = ({ actions, onChange }: RuleActionsSectionProps) => {
  const { data: metadata } = useQuery({
    queryKey: ["email-rule-actions-metadata"],
    queryFn: () => emailRulesAPI.getActionsMetadata(),
  });

  const availableActions = metadata?.azioni_disponibili || [];

  const addAction = () => {
    const firstAction = availableActions[0];
    onChange([
      ...actions,
      {
        tipo_azione: firstAction?.tipo || "move_to_folder",
        parametri: {},
        ordine: actions.length + 1,
      },
    ]);
  };

  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: keyof CreateRuleBulkRequest["azioni"][0], value: any) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const updateParameter = (actionIndex: number, paramName: string, value: any) => {
    const updated = [...actions];
    updated[actionIndex] = {
      ...updated[actionIndex],
      parametri: {
        ...updated[actionIndex].parametri,
        [paramName]: value,
      },
    };
    onChange(updated);
  };

  const getActionMetadata = (tipo: string) => {
    return availableActions.find((a) => a.tipo === tipo);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Azioni</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addAction}>
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi Azione
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nessuna azione. Aggiungi almeno un'azione.
          </p>
        ) : (
          actions.map((action, index) => {
            const actionMeta = getActionMetadata(action.tipo_azione);
            
            return (
              <Card key={index}>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>Tipo Azione</Label>
                      <Select
                        value={action.tipo_azione}
                        onValueChange={(value) => {
                          updateAction(index, "tipo_azione", value);
                          updateAction(index, "parametri", {});
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableActions.map((act) => (
                            <SelectItem key={act.tipo} value={act.tipo}>
                              {act.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAction(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {actionMeta && actionMeta.parametri.length > 0 && (
                    <div className="space-y-3 pl-4 border-l-2">
                      <p className="text-sm font-medium">Parametri</p>
                      {actionMeta.parametri.map((param) => (
                        <div key={param.nome}>
                          <Label>
                            {param.nome}
                            {param.richiesto && <span className="text-destructive">*</span>}
                          </Label>
                          {param.valori_possibili ? (
                            <Select
                              value={action.parametri?.[param.nome] || param.valore_default || ""}
                              onValueChange={(value) => updateParameter(index, param.nome, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={param.descrizione} />
                              </SelectTrigger>
                              <SelectContent>
                                {param.valori_possibili.map((val) => (
                                  <SelectItem key={val} value={val}>
                                    {val}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={action.parametri?.[param.nome] || param.valore_default || ""}
                              onChange={(e) => updateParameter(index, param.nome, e.target.value)}
                              placeholder={param.descrizione}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
