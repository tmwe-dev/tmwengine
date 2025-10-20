import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DesignLabComponent, DesignLabLogic } from "@/types/design-lab";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";

interface RuntimePreviewProps {
  components: DesignLabComponent[];
  logicRules?: DesignLabLogic[];
  className?: string;
}

export const RuntimePreview = ({ components, logicRules = [], className }: RuntimePreviewProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const executeAction = async (componentId: string, eventType: string) => {
    const rules = logicRules.filter(
      (r) => r.component_id === componentId && r.event_type === eventType
    );

    for (const rule of rules) {
      try {
        switch (rule.action_type) {
          case 'show_toast':
            toast({
              title: rule.action_config.message || 'Notifica',
              variant: rule.action_config.type === 'error' ? 'destructive' : 'default',
            });
            break;

          case 'navigate':
            if (rule.action_config.path) {
              navigate(rule.action_config.path);
            }
            break;

          case 'save_to_db':
            const { table, data } = rule.action_config;
            if (table && data) {
              const { error } = await supabase.from(table).insert(data);
              if (error) throw error;
              toast({ title: 'Dati salvati con successo' });
            }
            break;

          case 'call_api':
            const { url, method, body } = rule.action_config;
            if (url && method) {
              const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined,
              });
              if (!response.ok) throw new Error('API call failed');
              toast({ title: 'API chiamata con successo' });
            }
            break;

          default:
            console.warn(`Unknown action type: ${rule.action_type}`);
        }
      } catch (error) {
        console.error('Action execution error:', error);
        toast({
          title: 'Errore esecuzione azione',
          description: (error as Error).message,
          variant: 'destructive',
        });
      }
    }
  };

  const renderComponent = (component: DesignLabComponent) => {
    const position = component.position as { x: number; y: number; width: number; height: number };

    const commonHandlers = {
      onClick: () => executeAction(component.id, 'onClick'),
      onChange: () => executeAction(component.id, 'onChange'),
      onSubmit: (e: React.FormEvent) => {
        e.preventDefault();
        executeAction(component.id, 'onSubmit');
      },
    };

    let ComponentElement;

    switch (component.component_type) {
      case 'input':
        ComponentElement = (
          <Input {...component.props} {...commonHandlers} />
        );
        break;

      case 'button':
        ComponentElement = (
          <Button {...component.props} onClick={commonHandlers.onClick}>
            {component.props?.children || 'Button'}
          </Button>
        );
        break;

      case 'checkbox':
        ComponentElement = (
          <div className="flex items-center space-x-2">
            <Checkbox {...component.props} onCheckedChange={commonHandlers.onChange} />
            <label className="text-sm">{component.props?.label || 'Checkbox'}</label>
          </div>
        );
        break;

      case 'textarea':
        ComponentElement = (
          <Textarea {...component.props} {...commonHandlers} />
        );
        break;

      default:
        ComponentElement = (
          <div className="p-2 border rounded bg-muted">
            Unknown: {component.component_type}
          </div>
        );
    }

    return (
      <div
        key={component.id}
        className="absolute"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${position.width}px`,
          height: `${position.height}px`,
        }}
      >
        {ComponentElement}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Play className="h-4 w-4" />
          Runtime Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative bg-background border rounded-lg" style={{ minHeight: '600px' }}>
          {components.map(renderComponent)}

          {components.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">Nessun componente da visualizzare</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
