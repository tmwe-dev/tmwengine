import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Lightbulb, Sparkles, AlertCircle } from 'lucide-react';
import type { ExtractedComponent } from '@/types/design-lab-scanner';

interface PropsEditorDialogProps {
  component: ExtractedComponent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (props: Record<string, any>) => void;
}

export function PropsEditorDialog({
  component,
  open,
  onOpenChange,
  onConfirm,
}: PropsEditorDialogProps) {
  const [editedProps, setEditedProps] = useState<Record<string, any>>({});

  // Auto-populate from fields_schema intelligence
  useEffect(() => {
    if (component && open) {
      const initialProps: Record<string, any> = {};
      
      // Use fields_schema for smart defaults
      if (component.fields_schema && Array.isArray(component.fields_schema)) {
        component.fields_schema.forEach((field: any) => {
          if (field.name && field.default_value !== undefined) {
            initialProps[field.name] = field.default_value;
          }
        });
      }
      
      // Fallback to props_schema defaults
      const propsSchema = component.props_schema || {};
      Object.entries(propsSchema).forEach(([key, value]: [string, any]) => {
        if (value.defaultValue !== undefined && !(key in initialProps)) {
          initialProps[key] = value.defaultValue;
        }
      });
      
      setEditedProps(initialProps);
    }
  }, [component, open]);

  if (!component) return null;

  const propsSchema = component.props_schema || {};
  const hasProps = Object.keys(propsSchema).length > 0;

  // Intelligence: generate contextual suggestions
  const suggestions = useMemo(() => {
    if (!component) return [];
    
    const hints: string[] = [];
    
    if (component.tags?.includes('form')) {
      hints.push('Considera di aggiungere validazione per i campi form');
    }
    if (component.tags?.includes('data-display')) {
      hints.push('Assicurati che i dati siano formattati correttamente');
    }
    if (component.complexity_level === 'high') {
      hints.push('Componente complesso: verifica attentamente le configurazioni');
    }
    if (component.ui_category === 'input') {
      hints.push('Ricorda di specificare placeholder e label per accessibilità');
    }
    
    return hints;
  }, [component]);

  const handlePropChange = (propName: string, value: any) => {
    setEditedProps((prev) => ({
      ...prev,
      [propName]: value,
    }));
  };

  const handleConfirm = () => {
    onConfirm(editedProps);
    onOpenChange(false);
    setEditedProps({});
  };

  const handleCancel = () => {
    onOpenChange(false);
    setEditedProps({});
  };

  const renderPropInput = (propName: string, propInfo: any) => {
    const currentValue = editedProps[propName] ?? propInfo.defaultValue ?? '';
    
    // Find matching field from fields_schema for smart hints
    const fieldSchema = component.fields_schema?.find((f: any) => f.name === propName);
    const smartPlaceholder = fieldSchema?.placeholder || propInfo.defaultValue || `Inserisci ${propName}...`;

    switch (propInfo.type) {
      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={currentValue}
              onCheckedChange={(checked) => handlePropChange(propName, checked)}
            />
            <span className="text-sm">{currentValue ? 'Attivo' : 'Inattivo'}</span>
          </div>
        );

      case 'number':
        return (
          <div className="space-y-1">
            <Input
              type="number"
              value={currentValue}
              onChange={(e) => handlePropChange(propName, parseFloat(e.target.value))}
              placeholder={smartPlaceholder}
            />
            {fieldSchema?.validation && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {fieldSchema.validation}
              </p>
            )}
          </div>
        );

      case 'enum':
        return (
          <Select
            value={currentValue}
            onValueChange={(value) => handlePropChange(propName, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona valore..." />
            </SelectTrigger>
            <SelectContent>
              {propInfo.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'object':
      case 'array':
        return (
          <Textarea
            value={typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handlePropChange(propName, parsed);
              } catch {
                handlePropChange(propName, e.target.value);
              }
            }}
            placeholder={`${propInfo.type} JSON`}
            rows={4}
            className="font-mono text-xs"
          />
        );

      default:
        return (
          <div className="space-y-1">
            <Input
              value={currentValue}
              onChange={(e) => handlePropChange(propName, e.target.value)}
              placeholder={smartPlaceholder}
            />
            {fieldSchema?.example && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                Esempio: {fieldSchema.example}
              </p>
            )}
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Configura: {component.component_name}
            <Badge variant="outline">{component.component_type}</Badge>
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 mt-2">
            {component.ui_category && (
              <Badge variant="secondary" className="text-xs">
                {component.ui_category}
              </Badge>
            )}
            {component.complexity_level && (
              <Badge 
                variant={component.complexity_level === 'high' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {component.complexity_level} complexity
              </Badge>
            )}
            {component.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </DialogDescription>
        </DialogHeader>

        {/* Intelligence suggestions */}
        {suggestions.length > 0 && (
          <Card className="p-3 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary">Suggerimenti intelligenti</p>
                <ul className="text-xs text-primary/80 space-y-0.5">
                  {suggestions.map((hint, i) => (
                    <li key={i}>• {hint}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        <ScrollArea className="max-h-[50vh] pr-4">
          {hasProps ? (
            <div className="space-y-6 py-4">
              {Object.entries(propsSchema).map(([propName, propInfo]: [string, any]) => (
                <div key={propName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <code className="text-sm font-mono">{propName}</code>
                      <Badge variant="secondary" className="text-xs">
                        {propInfo.type || 'any'}
                      </Badge>
                      {propInfo.required && (
                        <Badge variant="destructive" className="text-xs">
                          richiesto
                        </Badge>
                      )}
                    </Label>
                  </div>

                  {propInfo.description && (
                    <p className="text-xs text-muted-foreground">
                      {propInfo.description}
                    </p>
                  )}

                  {renderPropInput(propName, propInfo)}

                  {propInfo.defaultValue !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      Default: <code className="bg-muted px-1 py-0.5 rounded">
                        {JSON.stringify(propInfo.defaultValue)}
                      </code>
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm">Questo componente non ha props configurabili</p>
              <p className="text-xs mt-2">Verrà inserito con le impostazioni predefinite</p>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Annulla
          </Button>
          <Button onClick={handleConfirm}>
            Inserisci Componente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
