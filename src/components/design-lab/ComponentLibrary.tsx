import { useState } from "react";
import { Search, Package, Code2, Puzzle, MousePointer, Type, CheckSquare, FileText } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExtractedComponents } from "@/hooks/useExtractedComponents";
import { useExtractedFunctions } from "@/hooks/useExtractedFunctions";
import { usePlugins } from "@/hooks/usePlugins";
import { useSourcePages } from "@/hooks/useSourcePages";
import { ComponentLibraryItem } from "./ComponentLibraryItem";
import { FunctionLibraryItem } from "./FunctionLibraryItem";
import { PluginLibraryItem } from "./PluginLibraryItem";

const UI_BASE_COMPONENTS = [
  {
    id: 'button',
    type: 'button',
    label: 'Pulsante',
    icon: MousePointer,
    defaultProps: { children: 'Click me', variant: 'default' },
    defaultSize: { width: 120, height: 40 },
  },
  {
    id: 'input',
    type: 'input',
    label: 'Input',
    icon: Type,
    defaultProps: { placeholder: 'Inserisci testo...', type: 'text' },
    defaultSize: { width: 200, height: 40 },
  },
  {
    id: 'checkbox',
    type: 'checkbox',
    label: 'Checkbox',
    icon: CheckSquare,
    defaultProps: { label: 'Opzione' },
    defaultSize: { width: 100, height: 24 },
  },
  {
    id: 'textarea',
    type: 'textarea',
    label: 'Area Testo',
    icon: FileText,
    defaultProps: { placeholder: 'Inserisci testo multilinea...', rows: 4 },
    defaultSize: { width: 300, height: 100 },
  },
];

export function ComponentLibrary() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [searchQuery, setSearchQuery] = useState("");

  const { components, isLoading: componentsLoading } = useExtractedComponents();
  const { functions, isLoading: functionsLoading } = useExtractedFunctions();
  const { plugins, isLoading: pluginsLoading } = usePlugins();
  const { pages } = useSourcePages();

  const filteredComponents = components?.filter(c =>
    c.component_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFunctions = functions?.filter(f =>
    f.function_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPlugins = plugins?.filter(p =>
    p.plugin_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-80"}
      collapsible="icon"
      side="left"
    >
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && <h2 className="text-lg font-semibold">Libreria Componenti</h2>}
        <SidebarTrigger />
      </div>

      <SidebarContent>
        {!collapsed && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca componenti..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}

        <Tabs defaultValue="ui-base" className="flex-1">
          {!collapsed && (
            <TabsList className="grid w-full grid-cols-4 mx-4">
              <TabsTrigger value="ui-base" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                UI Base
              </TabsTrigger>
              <TabsTrigger value="components" className="text-xs">
                <Package className="h-3 w-3 mr-1" />
                Componenti
              </TabsTrigger>
              <TabsTrigger value="functions" className="text-xs">
                <Code2 className="h-3 w-3 mr-1" />
                Funzioni
              </TabsTrigger>
              <TabsTrigger value="plugins" className="text-xs">
                <Puzzle className="h-3 w-3 mr-1" />
                Plugin
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="ui-base" className="mt-0">
            <ScrollArea className="h-[calc(100vh-240px)]">
              <SidebarGroup>
                {!collapsed && (
                  <SidebarGroupLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Componenti UI Base ({UI_BASE_COMPONENTS.length})
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {UI_BASE_COMPONENTS.map((component) => (
                      <SidebarMenuItem key={component.id}>
                        <div
                          draggable
                          onDragStart={(e) => {
                            const dragData = {
                              type: 'ui-base',
                              component: component,
                            };
                            e.dataTransfer.setData('application/json', JSON.stringify({ data: dragData }));
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          className="group p-3 border rounded-lg hover:border-primary transition-all cursor-move bg-card m-2"
                        >
                          <div className="flex items-center gap-3">
                            <component.icon className="h-5 w-5 text-muted-foreground" />
                            {!collapsed && (
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{component.label}</h4>
                                <p className="text-xs text-muted-foreground">{component.type}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="components" className="mt-0">
            <ScrollArea className="h-[calc(100vh-240px)]">
              <SidebarGroup>
                {!collapsed && (
                  <SidebarGroupLabel className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Componenti Estratti ({filteredComponents?.length || 0})
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {componentsLoading ? (
                      <div className="p-4 text-sm text-muted-foreground">
                        Caricamento...
                      </div>
                    ) : filteredComponents?.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground">
                        Nessun componente trovato
                      </div>
                    ) : (
                      filteredComponents?.map((component) => (
                        <SidebarMenuItem key={component.id}>
                          <ComponentLibraryItem
                            component={component}
                            collapsed={collapsed}
                          />
                        </SidebarMenuItem>
                      ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="functions" className="mt-0">
            <ScrollArea className="h-[calc(100vh-240px)]">
              <SidebarGroup>
                {!collapsed && (
                  <SidebarGroupLabel className="flex items-center gap-2">
                    <Code2 className="h-4 w-4" />
                    Funzioni Estratte ({filteredFunctions?.length || 0})
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {functionsLoading ? (
                      <div className="p-4 text-sm text-muted-foreground">
                        Caricamento...
                      </div>
                    ) : filteredFunctions?.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground">
                        Nessuna funzione trovata
                      </div>
                    ) : (
                      filteredFunctions?.map((func) => (
                        <SidebarMenuItem key={func.id}>
                          <FunctionLibraryItem
                            functionItem={func}
                            collapsed={collapsed}
                          />
                        </SidebarMenuItem>
                      ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="plugins" className="mt-0">
            <ScrollArea className="h-[calc(100vh-240px)]">
              <SidebarGroup>
                {!collapsed && (
                  <SidebarGroupLabel className="flex items-center gap-2">
                    <Puzzle className="h-4 w-4" />
                    Plugin Disponibili ({filteredPlugins?.length || 0})
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {pluginsLoading ? (
                      <div className="p-4 text-sm text-muted-foreground">
                        Caricamento...
                      </div>
                    ) : filteredPlugins?.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground">
                        Nessun plugin trovato
                      </div>
                    ) : (
                      filteredPlugins?.map((plugin) => (
                        <SidebarMenuItem key={plugin.id}>
                          <PluginLibraryItem
                            plugin={plugin}
                            collapsed={collapsed}
                          />
                        </SidebarMenuItem>
                      ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SidebarContent>
    </Sidebar>
  );
}
