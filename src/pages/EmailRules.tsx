import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { emailRulesAPI, EmailRule } from "@/lib/tmwe-email-rules-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { EmailRuleDialog } from "@/components/email-rules/EmailRuleDialog";

const EmailRules = () => {
  const queryClient = useQueryClient();
  const [selectedRule, setSelectedRule] = useState<EmailRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["email-rules"],
    queryFn: () => emailRulesAPI.getRules({ show_all: true }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => emailRulesAPI.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-rules"] });
      toast.success("Regola eliminata");
    },
    onError: () => toast.error("Errore durante l'eliminazione"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, attivo }: { id: number; attivo: boolean }) =>
      emailRulesAPI.updateRule(id, { attivo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-rules"] });
      toast.success("Stato aggiornato");
    },
    onError: () => toast.error("Errore durante l'aggiornamento"),
  });

  const handleEdit = (rule: EmailRule) => {
    setSelectedRule(rule);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedRule(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Sei sicuro di voler eliminare questa regola?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggle = (rule: EmailRule) => {
    if (rule.id_rule) {
      toggleMutation.mutate({ id: rule.id_rule, attivo: !rule.attivo });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Email Rules</h1>
          <p className="text-muted-foreground">Gestisci le regole di automazione email</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuova Regola
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Caricamento...</div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nessuna regola configurata
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id_rule}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {rule.nome}
                      <Badge variant={rule.attivo ? "default" : "secondary"}>
                        {rule.attivo ? "Attiva" : "Disattivata"}
                      </Badge>
                      {rule.priorita && (
                        <Badge variant="outline">Priorità: {rule.priorita}</Badge>
                      )}
                    </CardTitle>
                    {rule.descrizione && (
                      <CardDescription className="mt-2">{rule.descrizione}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggle(rule)}
                      title={rule.attivo ? "Disattiva" : "Attiva"}
                    >
                      {rule.attivo ? (
                        <Power className="h-4 w-4" />
                      ) : (
                        <PowerOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(rule)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => rule.id_rule && handleDelete(rule.id_rule)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <EmailRuleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        rule={selectedRule}
      />
    </div>
  );
};

export default EmailRules;
