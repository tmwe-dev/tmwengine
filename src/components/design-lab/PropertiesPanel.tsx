import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DesignLabComponent } from "@/types/design-lab";
import { Trash2, Save } from "lucide-react";
import { LogicEditor } from "./LogicEditor";
import { SaveVariantDialog } from './SaveVariantDialog';
import { useComponentVariants } from '@/hooks/useComponentVariants';

interface PropertiesPanelProps {
  component: DesignLabComponent | null;
  onUpdateProps: (props: Record<string, any>) => void;
  onUpdatePosition: (position: any) => void;
  onDelete: () => void;
}

export const PropertiesPanel = ({
  component,
  onUpdateProps,
  onUpdatePosition,
  onDelete,
}: PropertiesPanelProps) => {
  const [saveVariantOpen, setSaveVariantOpen] = useState(false);
  const { createVariant, isCreating } = useComponentVariants();

  if (!component) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Nessun componente selezionato</p>
            <p className="text-xs mt-1">
              Seleziona un componente sul canvas per modificarlo
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const position = component.position as { x: number; y: number; width: number; height: number };

  const handlePropChange = (key: string, value: any) => {
    onUpdateProps({
      ...component.props,
      [key]: value,
    });
  };

  const handlePositionChange = (key: string, value: number) => {
    onUpdatePosition({
      ...position,
      [key]: value,
    });
  };

  const handleSaveVariant = async (variantName: string) => {
    await createVariant({
      originalComponentId: component.id,
      variantName,
      modifiedProps: component.props,
    });
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Proprietà</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveVariantOpen(true)}
            >
              <Save className="h-4 w-4 mr-2" />
              Salva Variante
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="props" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="props">Props</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="logic">Logic</TabsTrigger>
            </TabsList>

            <TabsContent value="props" className="mt-0">
              <ScrollArea className="h-[600px]">
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <Input value={component.component_type} disabled />
                  </div>

                  {component.component_type === 'input' && (
                    <div className="space-y-2">
                      <Label>Placeholder</Label>
                      <Input
                        value={component.props?.placeholder || ''}
                        onChange={(e) => handlePropChange('placeholder', e.target.value)}
                      />
                    </div>
                  )}

                  {component.component_type === 'button' && (
                    <div className="space-y-2">
                      <Label>Testo</Label>
                      <Input
                        value={component.props?.children || ''}
                        onChange={(e) => handlePropChange('children', e.target.value)}
                      />
                    </div>
                  )}

                  {component.component_type === 'checkbox' && (
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Input
                        value={component.props?.label || ''}
                        onChange={(e) => handlePropChange('label', e.target.value)}
                      />
                    </div>
                  )}

                  {component.component_type === 'textarea' && (
                    <div className="space-y-2">
                      <Label>Placeholder</Label>
                      <Input
                        value={component.props?.placeholder || ''}
                        onChange={(e) => handlePropChange('placeholder', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="style" className="mt-0">
              <ScrollArea className="h-[600px]">
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>X</Label>
                      <Input
                        type="number"
                        value={position.x}
                        onChange={(e) => handlePositionChange('x', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Y</Label>
                      <Input
                        type="number"
                        value={position.y}
                        onChange={(e) => handlePositionChange('y', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Larghezza</Label>
                      <Input
                        type="number"
                        value={position.width}
                        onChange={(e) => handlePositionChange('width', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Altezza</Label>
                      <Input
                        type="number"
                        value={position.height}
                        onChange={(e) => handlePositionChange('height', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="logic" className="mt-0">
              <ScrollArea className="h-[600px]">
                <div className="p-4">
                  <LogicEditor componentId={component.id} />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <SaveVariantDialog
        open={saveVariantOpen}
        onOpenChange={setSaveVariantOpen}
        onSave={handleSaveVariant}
        originalComponentName={component.component_type}
        isLoading={isCreating}
      />
    </>
  );
};
