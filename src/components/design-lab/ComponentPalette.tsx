import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Type, Square, CheckSquare, FileText, Download, Code, Plus, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExtractedComponents } from "@/hooks/useExtractedComponents";
import { usePlugins } from "@/hooks/usePlugins";
import { useExtractedFunctions } from "@/hooks/useExtractedFunctions";
import { useSourcePages } from "@/hooks/useSourcePages";
import { useState } from "react";

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
  const [sourcePageFilter, setSourcePageFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const { pages } = useSourcePages();
  const { components } = useExtractedComponents();
  const { plugins } = usePlugins(categoryFilter !== 'all' ? categoryFilter : undefined);
  const { functions } = useExtractedFunctions();

  const handleDragStart = (e: React.DragEvent, component: ComponentItem) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(component));
    onComponentDragStart?.(component);
  };

  const filteredComponents = components?.filter(comp => 
    sourcePageFilter === 'all' || comp.source_page_id === sourcePageFilter
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Componenti</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="basic">Base</TabsTrigger>
            <TabsTrigger value="pages">Pagine</TabsTrigger>
            <TabsTrigger value="plugins">Plugin</TabsTrigger>
            <TabsTrigger value="functions">Funzioni</TabsTrigger>
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

          <TabsContent value="pages" className="mt-0">
            <div className="p-4 space-y-4">
              <Select value={sourcePageFilter} onValueChange={setSourcePageFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtra per pagina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le pagine</SelectItem>
                  {pages?.map(page => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.page_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ScrollArea className="h-[520px]">
                <div className="space-y-3">
                  {filteredComponents?.map(comp => (
                    <Card key={comp.id} className="cursor-move hover:shadow-lg transition-shadow">
                      <CardHeader className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-sm">{comp.component_name}</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {comp.component_type}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {pages?.find(p => p.id === comp.source_page_id)?.page_name}
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                  {(!filteredComponents || filteredComponents.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      <p className="text-sm">Nessun componente trovato</p>
                      <p className="text-xs mt-1">Esegui lo scanner per estrarre componenti</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="plugins" className="mt-0">
            <div className="p-4 space-y-4">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtra per categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Chat & AI">Chat & AI</SelectItem>
                </SelectContent>
              </Select>

              <ScrollArea className="h-[520px]">
                <div className="space-y-3">
                  {plugins?.map(plugin => (
                    <Card key={plugin.id}>
                      <CardHeader className="p-3">
                        <CardTitle className="text-sm">{plugin.plugin_name}</CardTitle>
                        <CardDescription className="text-xs">
                          {plugin.description}
                        </CardDescription>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            v{plugin.version}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {Array.isArray(plugin.components_included) ? plugin.components_included.length : 0} componenti
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            <Plus className="h-3 w-3 mr-1" />
                            Usa
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!plugins || plugins.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">
                      <p className="text-sm">Nessun plugin disponibile</p>
                      <p className="text-xs mt-1">Esegui lo scanner per creare plugin</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="functions" className="mt-0">
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-2">
                {functions?.map(fn => (
                  <Card key={fn.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Code className="h-3 w-3" />
                          <span className="font-mono text-sm">{fn.function_name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {fn.description}
                        </p>
                        <div className="flex gap-1 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {fn.function_type}
                          </Badge>
                          {fn.is_async && (
                            <Badge variant="secondary" className="text-xs">async</Badge>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
                {(!functions || functions.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">
                    <p className="text-sm">Nessuna funzione estratta</p>
                    <p className="text-xs mt-1">Esegui lo scanner per estrarre funzioni</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
