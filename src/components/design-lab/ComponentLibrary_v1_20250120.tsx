import { useState, useMemo } from "react";
import { Search, Package, Code2, Puzzle, FileCode } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Filter } from "lucide-react";
import { useExtractedComponents } from "@/hooks/useExtractedComponents";
import { useExtractedFunctions } from "@/hooks/useExtractedFunctions";
import { usePlugins } from "@/hooks/usePlugins";
import { useSourcePages } from "@/hooks/useSourcePages";
import { ComponentLibraryItem } from "./ComponentLibraryItem";
import { FunctionLibraryItem } from "./FunctionLibraryItem";
import { PluginLibraryItem } from "./PluginLibraryItem";

export function ComponentLibrary() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyReusable, setOnlyReusable] = useState(false);
  const [componentTypeFilter, setComponentTypeFilter] = useState<string>('all');

  const { components, isLoading: componentsLoading } = useExtractedComponents();
  const { functions, isLoading: functionsLoading } = useExtractedFunctions();
  const { plugins, isLoading: pluginsLoading } = usePlugins();
  const { pages } = useSourcePages();

  // Filter and group components by category
  const filteredAndGroupedComponents = useMemo(() => {
    if (!components) return {};

    let filtered = components.filter((c) => {
      const matchesSearch = c.component_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesReusable = !onlyReusable || c.is_reusable;
      const matchesType = componentTypeFilter === 'all' || c.component_type === componentTypeFilter;
      return matchesSearch && matchesReusable && matchesType;
    });

    // Group by source page category
    const grouped = filtered.reduce((acc, component) => {
      const sourcePage = pages?.find(p => p.id === component.source_page_id);
      const category = sourcePage?.category || 'Uncategorized';
      
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(component);
      return acc;
    }, {} as Record<string, typeof components>);

    return grouped;
  }, [components, pages, searchQuery, onlyReusable, componentTypeFilter]);

  // Get unique component types for filter
  const componentTypes = useMemo(() => {
    if (!components) return [];
    const types = new Set(components.map(c => c.component_type));
    return Array.from(types).sort();
  }, [components]);

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
      side="right"
    >
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && <h2 className="text-lg font-semibold">Libreria Componenti</h2>}
        <SidebarTrigger />
      </div>

      <SidebarContent>
        {!collapsed && (
          <div className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca componenti..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters */}
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filtri</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="reusable"
                  checked={onlyReusable}
                  onCheckedChange={(checked) => setOnlyReusable(checked as boolean)}
                />
                <Label htmlFor="reusable" className="text-sm cursor-pointer">
                  Solo riutilizzabili
                </Label>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tipo componente</Label>
                <Select value={componentTypeFilter} onValueChange={setComponentTypeFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i tipi</SelectItem>
                    {componentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="components" className="flex-1">
          {!collapsed && (
            <TabsList className="grid w-full grid-cols-3 mx-4">
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

          <TabsContent value="components" className="mt-0">
            <ScrollArea className="h-[calc(100vh-340px)]">
              {componentsLoading ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Caricamento...
                </div>
              ) : Object.keys(filteredAndGroupedComponents).length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Nessun componente trovato
                </div>
              ) : (
                <div className="p-4">
                  <Accordion type="multiple" className="space-y-2">
                    {Object.entries(filteredAndGroupedComponents).map(([category, categoryComponents]) => (
                      <AccordionItem key={category} value={category} className="border rounded-lg">
                        <AccordionTrigger className="px-3 py-2 hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-2">
                            <span className="text-sm font-medium">{category}</span>
                            <Badge variant="secondary" className="ml-2">
                              {categoryComponents.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3 space-y-2">
                          {categoryComponents.map((component) => (
                            <ComponentLibraryItem
                              key={component.id}
                              component={component}
                              collapsed={false}
                            />
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}
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
