import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2 } from 'lucide-react';
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

  if (!component) return null;

  const propsSchema = component.props_schema || {};
  const hasProps = Object.keys(propsSchema).length > 0;

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
          <Input
            type="number"
            value={currentValue}
            onChange={(e) => handlePropChange(propName, parseFloat(e.target.value))}
            placeholder={propInfo.defaultValue?.toString() || '0'}
          />
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
          <Input
            value={currentValue}
            onChange={(e) => handlePropChange(propName, e.target.value)}
            placeholder={propInfo.defaultValue || `Inserisci ${propName}...`}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Configura: {component.component_name}
            <Badge variant="outline">{component.component_type}</Badge>
          </DialogTitle>
        </DialogHeader>

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
