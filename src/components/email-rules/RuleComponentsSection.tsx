import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { emailRulesAPI, CreateRuleBulkRequest } from "@/lib/tmwe-email-rules-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface RuleComponentsSectionProps {
  components: CreateRuleBulkRequest["componenti"];
  onChange: (components: CreateRuleBulkRequest["componenti"]) => void;
}

export const RuleComponentsSection = ({ components, onChange }: RuleComponentsSectionProps) => {
  const { data: fields = [] } = useQuery({
    queryKey: ["email-rule-fields"],
    queryFn: () => emailRulesAPI.getAvailableFields(),
  });

  const { data: operators = [] } = useQuery({
    queryKey: ["email-rule-operators"],
    queryFn: () => emailRulesAPI.getAvailableOperators(),
  });

  const addComponent = () => {
    onChange([
      ...components,
      {
        campo: fields[0] || "from",
        operatore: operators[0] || "contains",
        valore: "",
        ordine: components.length + 1,
      },
    ]);
  };

  const removeComponent = (index: number) => {
    onChange(components.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, field: keyof CreateRuleBulkRequest["componenti"][0], value: any) => {
    const updated = [...components];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Condizioni</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addComponent}>
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi Condizione
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {components.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nessuna condizione. Aggiungi almeno una condizione.
          </p>
        ) : (
          components.map((component, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Campo</Label>
                <Select
                  value={component.campo}
                  onValueChange={(value) => updateComponent(index, "campo", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Label>Operatore</Label>
                <Select
                  value={component.operatore}
                  onValueChange={(value) => updateComponent(index, "operatore", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op} value={op}>
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Label>Valore</Label>
                <Input
                  value={component.valore}
                  onChange={(e) => updateComponent(index, "valore", e.target.value)}
                  placeholder="Inserisci valore"
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeComponent(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
