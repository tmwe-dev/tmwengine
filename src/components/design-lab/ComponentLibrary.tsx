import { useState, useEffect } from "react";
import { Search, Package, Code2, Puzzle, MousePointer, Type, CheckSquare, FileText, Image, Loader2, Filter, ArrowUpDown, Grid3x3, List } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ThumbnailBatchGenerator, ThumbnailPreview } from "@/lib/design-lab/thumbnail-generator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThumbnailSidebarPreview } from "./ThumbnailSidebarPreview";
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
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const [missingThumbnailsCount, setMissingThumbnailsCount] = useState(0);
  const [thumbnailProgress, setThumbnailProgress] = useState({ current: 0, total: 0 });
  const [generatedThumbnails, setGeneratedThumbnails] = useState<ThumbnailPreview[]>([]);
  const [showThumbnailPreview, setShowThumbnailPreview] = useState(false);
  
  // Filters
  const [uiCategoryFilter, setUiCategoryFilter] = useState<string>("all");
  const [complexityFilter, setComplexityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const { toast } = useToast();

  const { components, isLoading: componentsLoading, refetch: refetchComponents } = useExtractedComponents();
  const { functions, isLoading: functionsLoading } = useExtractedFunctions();
  const { plugins, isLoading: pluginsLoading } = usePlugins();
  const { pages } = useSourcePages();

  // Count components without thumbnails
  useEffect(() => {
    if (components) {
      const count = components.filter(c => !c.thumbnail_url).length;
      setMissingThumbnailsCount(count);
    }
  }, [components]);

  const handleRegenerateThumbnails = async () => {
    setIsGeneratingThumbnails(true);
    setGeneratedThumbnails([]);
    setShowThumbnailPreview(true);

    const generator = new ThumbnailBatchGenerator(3);

    generator.onProgress((state) => {
      setThumbnailProgress({ current: state.currentIndex, total: state.totalComponents });
    });

    generator.onThumbnailCreated((preview) => {
      setGeneratedThumbnails(prev => [preview, ...prev]);
    });

    try {
      await generator.start();
      const finalState = generator.getState();

      toast({
        title: "Miniature generate!",
        description: `${finalState.successCount} successo, ${finalState.failedCount} errori`,
      });

      refetchComponents();
    } catch (error) {
      toast({
        title: "Errore generazione miniature",
        description: error instanceof Error ? error.message : "Errore sconosciuto",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingThumbnails(false);
      setTimeout(() => {
        setShowThumbnailPreview(false);
        setGeneratedThumbnails([]);
      }, 3000);
    }
  };

  // Advanced filtering
  const filteredComponents = components
    ?.filter(c => {
      const matchesSearch = c.component_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = uiCategoryFilter === "all" || c.ui_category === uiCategoryFilter;
      const matchesComplexity = complexityFilter === "all" || c.complexity_level === complexityFilter;
      return matchesSearch && matchesCategory && matchesComplexity;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.component_name.localeCompare(b.component_name);
      if (sortBy === "complexity") {
        const complexityOrder = { low: 1, medium: 2, high: 3 };
        return (complexityOrder[a.complexity_level as keyof typeof complexityOrder] || 0) - 
               (complexityOrder[b.complexity_level as keyof typeof complexityOrder] || 0);
      }
      if (sortBy === "created") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

  // Extract unique categories
  const uiCategories = Array.from(new Set(components?.map(c => c.ui_category).filter(Boolean)));
  const complexityLevels = ["low", "medium", "high"];

  const filteredFunctions = functions?.filter(f =>
    f.function_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPlugins = plugins?.filter(p =>
    p.plugin_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Sidebar
        className={collapsed ? "w-14" : "w-96"}
        collapsible="icon"
        side="left"
      >
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1">
            <h2 className="text-lg font-semibold">Libreria Componenti</h2>
            {missingThumbnailsCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {missingThumbnailsCount} senza miniatura
              </Badge>
            )}
          </div>
        )}
        <SidebarTrigger />
      </div>

      {!collapsed && missingThumbnailsCount > 0 && (
        <div className="p-4 border-b bg-muted/50">
          <Button
            onClick={handleRegenerateThumbnails}
            disabled={isGeneratingThumbnails}
            size="sm"
            className="w-full"
            variant="outline"
          >
            {isGeneratingThumbnails ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generazione {thumbnailProgress.current}/{thumbnailProgress.total}
              </>
            ) : (
              <>
                <Image className="mr-2 h-4 w-4" />
                Genera Miniature Mancanti
              </>
            )}
          </Button>
        </div>
      )}

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
        {!collapsed && (
          <div className="px-4 py-3 border-t space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtri</span>
            </div>
            
            <div className="space-y-2">
              <Select value={uiCategoryFilter} onValueChange={setUiCategoryFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Categoria UI" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  {uiCategories.map(cat => (
                    <SelectItem key={cat} value={cat || ""}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={complexityFilter} onValueChange={setComplexityFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Complessità" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  {complexityLevels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Ordina per" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome A-Z</SelectItem>
                  <SelectItem value="complexity">Complessità</SelectItem>
                  <SelectItem value="created">Data creazione</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-3 w-3" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>

    {/* Thumbnail Preview Sidebar */}
    {showThumbnailPreview && (
      <div className="fixed right-0 top-0 bottom-0 z-50 animate-slide-in-right">
        <ThumbnailSidebarPreview
          thumbnails={generatedThumbnails}
          currentProgress={thumbnailProgress.current}
          totalComponents={thumbnailProgress.total}
        />
      </div>
    )}
    </>
  );
}
