import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Type, Square, CheckSquare, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ComponentItem {
  id: string;
  type: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultProps: Record<string, any>;
  defaultSize: { width: number; height: number };
}

const BASIC_COMPONENTS: ComponentItem[] = [
  {
    id: 'input',
    type: 'input',
    label: 'Input',
    icon: Type,
    defaultProps: { placeholder: 'Inserisci testo...' },
    defaultSize: { width: 300, height: 40 },
  },
  {
    id: 'button',
    type: 'button',
    label: 'Button',
    icon: Square,
    defaultProps: { children: 'Clicca qui' },
    defaultSize: { width: 120, height: 40 },
  },
  {
    id: 'checkbox',
    type: 'checkbox',
    label: 'Checkbox',
    icon: CheckSquare,
    defaultProps: { label: 'Accetta termini' },
    defaultSize: { width: 200, height: 32 },
  },
  {
    id: 'textarea',
    type: 'textarea',
    label: 'Textarea',
    icon: FileText,
    defaultProps: { placeholder: 'Inserisci descrizione...' },
    defaultSize: { width: 300, height: 120 },
  },
];

interface ComponentPaletteProps {
  onComponentDragStart?: (component: ComponentItem) => void;
}

export const ComponentPalette = ({ onComponentDragStart }: ComponentPaletteProps) => {
  const handleDragStart = (e: React.DragEvent, component: ComponentItem) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(component));
    onComponentDragStart?.(component);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Componenti</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="basic">Base</TabsTrigger>
            <TabsTrigger value="saved">Salvati</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-0">
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-2">
                {BASIC_COMPONENTS.map((component) => {
                  const Icon = component.icon;
                  return (
                    <Button
                      key={component.id}
                      variant="outline"
                      className="w-full justify-start cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={(e) => handleDragStart(e, component)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {component.label}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="saved" className="mt-0">
            <ScrollArea className="h-[600px]">
              <div className="p-4 text-center text-muted-foreground">
                <p className="text-sm">Nessun componente salvato</p>
                <p className="text-xs mt-1">
                  Salva strutture riutilizzabili per velocizzare lo sviluppo
                </p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
