import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSystemActions } from "@/hooks/useSystemActions";
import { useDesignLabLogic } from "@/hooks/useDesignLabLogic";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface LogicEditorProps {
  componentId: string;
}

export const LogicEditor = ({ componentId }: LogicEditorProps) => {
  const { actions, isLoading: loadingActions } = useSystemActions();
  const { logicRules, createLogic, deleteLogic } = useDesignLabLogic(componentId);

  const [selectedEvent, setSelectedEvent] = useState<string>('onClick');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [actionConfig, setActionConfig] = useState<Record<string, any>>({});

  const eventTypes = [
    { value: 'onClick', label: 'On Click' },
    { value: 'onChange', label: 'On Change' },
    { value: 'onSubmit', label: 'On Submit' },
    { value: 'onLoad', label: 'On Load' },
  ];

  const selectedActionData = actions?.find(a => a.action_id === selectedAction);

  const handleConfigChange = (key: string, value: any) => {
    setActionConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleAddLogic = async () => {
    if (!selectedAction) return;

    await createLogic({
      component_id: componentId,
      event_type: selectedEvent as any,
      action_type: selectedAction,
      action_config: actionConfig,
    });

    // Reset form
    setSelectedAction('');
    setActionConfig({});
  };

  const handleDeleteLogic = async (logicId: string) => {
    await deleteLogic(logicId);
  };

  const renderConfigInput = (key: string, schema: any) => {
    switch (schema.type) {
      case 'string':
        if (schema.enum) {
          return (
            <Select
              value={actionConfig[key] || ''}
              onValueChange={(value) => handleConfigChange(key, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Seleziona ${key}`} />
              </SelectTrigger>
              <SelectContent>
                {schema.enum.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return (
          <Input
            value={actionConfig[key] || ''}
            onChange={(e) => handleConfigChange(key, e.target.value)}
            placeholder={`Inserisci ${key}`}
          />
        );

      case 'object':
        return (
          <Textarea
            value={JSON.stringify(actionConfig[key] || {}, null, 2)}
            onChange={(e) => {
              try {
                handleConfigChange(key, JSON.parse(e.target.value));
              } catch {
                // Invalid JSON, ignore
              }
            }}
            placeholder={`{}`}
            rows={3}
          />
        );

      default:
        return (
          <Input
            value={actionConfig[key] || ''}
            onChange={(e) => handleConfigChange(key, e.target.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Existing Logic Rules */}
      {logicRules && logicRules.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Azioni Configurate</Label>
          <div className="space-y-2">
            {logicRules.map((rule) => {
              const action = actions?.find(a => a.action_id === rule.action_type);
              return (
                <Card key={rule.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {rule.event_type}
                        </Badge>
                        <span className="text-sm font-medium truncate">
                          {action?.name || rule.action_type}
                        </span>
                      </div>
                      {action?.description && (
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLogic(rule.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Separator />

      {/* Add New Logic */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Aggiungi Nuova Azione</Label>

        <div className="space-y-2">
          <Label className="text-xs">Evento</Label>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map((event) => (
                <SelectItem key={event.value} value={event.value}>
                  {event.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Azione</Label>
          <Select
            value={selectedAction}
            onValueChange={(value) => {
              setSelectedAction(value);
              const action = actions?.find(a => a.action_id === value);
              setActionConfig(action?.example_config || {});
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona azione..." />
            </SelectTrigger>
            <SelectContent>
              {loadingActions ? (
                <SelectItem value="loading" disabled>
                  Caricamento...
                </SelectItem>
              ) : (
                actions?.map((action) => (
                  <SelectItem key={action.action_id} value={action.action_id}>
                    {action.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Dynamic Config Inputs */}
        {selectedActionData?.required_config_schema && (
          <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
            <Label className="text-xs font-medium">Configurazione</Label>
            {Object.entries(
              (selectedActionData.required_config_schema as any).properties || {}
            ).map(([key, schema]: [string, any]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">
                  {key}
                  {(selectedActionData.required_config_schema as any).required?.includes(key) && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                {renderConfigInput(key, schema)}
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={handleAddLogic}
          disabled={!selectedAction}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Azione
        </Button>
      </div>
    </div>
  );
};
