import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, Undo2, Redo2, Eye } from "lucide-react";
import { useDesignLabPages } from "@/hooks/useDesignLabPages";
import { useDesignLabComponents } from "@/hooks/useDesignLabComponents";
import { useDesignLabLogic } from "@/hooks/useDesignLabLogic";
import { useCommandHistory, MoveComponentCommand, UpdatePropsCommand } from "@/hooks/useCommandHistory";
import { useAutoSave } from "@/hooks/useAutoSave";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ComponentLibrary } from "@/components/design-lab/ComponentLibrary";
import { Canvas } from "@/components/design-lab/Canvas";
import { PropertiesPanel } from "@/components/design-lab/PropertiesPanel";
import { RuntimePreview } from "@/components/design-lab/RuntimePreview";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DesignLabEditor = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const { toast } = useToast();
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const { pages } = useDesignLabPages();
  const { 
    components, 
    createComponent, 
    updateComponent, 
    deleteComponent 
  } = useDesignLabComponents(pageId || null);

  const { logicRules } = useDesignLabLogic(null); // Get all logic rules for preview

  const { executeCommand, undo, redo, canUndo, canRedo } = useCommandHistory();

  const currentPage = pages?.find(p => p.id === pageId);
  const selectedComponent = components?.find(c => c.id === selectedComponentId) || null;

  // Auto-save components data
  useAutoSave(components, {
    delay: 2000,
    onSave: async () => {
      console.log('Auto-saving components...');
    },
    onSuccess: () => {
      console.log('Components auto-saved');
    },
  });

  const handleDropComponent = async (componentData: any, position: { x: number; y: number }) => {
    if (!pageId) return;

    await createComponent({
      page_id: pageId,
      component_type: componentData.type,
      props: componentData.defaultProps,
      position: {
        x: position.x,
        y: position.y,
        width: componentData.defaultSize.width,
        height: componentData.defaultSize.height,
      },
      order_index: (components?.length || 0) + 1,
    });

    toast({ title: `${componentData.label || componentData.type} aggiunto al canvas` });
  };

  const handleDropFromLibrary = async (dropData: any, position: { x: number; y: number }) => {
    if (!pageId) return;

    // Convert ExtractedComponent/Function/Plugin → DesignLabComponent
    let componentData;
    
    if (dropData.type === 'extracted-component') {
      componentData = {
        type: dropData.component.component_type,
        label: dropData.component.component_name,
        defaultProps: dropData.component.props_schema || {},
        defaultSize: {
          width: dropData.component.position_in_source?.width || 300,
          height: dropData.component.position_in_source?.height || 200
        }
      };
    } else if (dropData.type === 'extracted-function') {
      componentData = {
        type: 'custom-function',
        label: dropData.functionItem.function_name,
        defaultProps: {
          functionName: dropData.functionItem.function_name,
          code: dropData.functionItem.code_generic
        },
        defaultSize: { width: 200, height: 100 }
      };
    } else if (dropData.type === 'plugin') {
      componentData = {
        type: 'plugin',
        label: dropData.plugin.plugin_name,
        defaultProps: { pluginId: dropData.plugin.id },
        defaultSize: { width: 400, height: 300 }
      };
    }

    if (componentData) {
      await handleDropComponent(componentData, position);
    }
  };

  const handleUpdatePosition = async (id: string, newPosition: any) => {
    const component = components?.find(c => c.id === id);
    if (!component) return;

    const oldPosition = component.position;

    await executeCommand(
      new MoveComponentCommand(
        id,
        oldPosition as any,
        newPosition,
        async (componentId, pos) => {
          await updateComponent({ id: componentId, position: pos });
        }
      )
    );
  };

  const handleUpdateProps = async (props: Record<string, any>) => {
    if (!selectedComponent) return;

    const oldProps = selectedComponent.props;

    await executeCommand(
      new UpdatePropsCommand(
        selectedComponent.id,
        oldProps as any,
        props,
        async (componentId, newProps) => {
          await updateComponent({ id: componentId, props: newProps });
        }
      )
    );
  };

  const handleDeleteComponent = async () => {
    if (!selectedComponentId) return;

    await deleteComponent(selectedComponentId);
    setSelectedComponentId(null);
  };

  const handleSaveNow = () => {
    toast({ title: 'Pagina salvata manualmente' });
  };

  if (!pageId) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Nessuna pagina selezionata</h1>
          <p className="text-muted-foreground mt-2">
            Torna alla dashboard per selezionare o creare una pagina
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex flex-col bg-background w-full">
        {/* Top Toolbar */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h1 className="font-semibold">{currentPage?.page_name || 'Design Lab'}</h1>
              <p className="text-xs text-muted-foreground">
                {currentPage?.description || 'Editor visuale'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => undo()}
              disabled={!canUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => redo()}
              disabled={!canRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleSaveNow}>
              <Save className="h-4 w-4 mr-2" />
              Salva
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab(activeTab === 'editor' ? 'preview' : 'editor')}
            >
              <Eye className="h-4 w-4 mr-2" />
              {activeTab === 'editor' ? 'Preview' : 'Editor'}
            </Button>
          </div>
        </div>
      </div>

        {/* Main Layout */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'editor' ? (
            <>
              {/* Left: Component Library Sidebar */}
              <ComponentLibrary />

              {/* Center: Canvas */}
              <div className="flex-1 p-4 overflow-auto animate-fade-in">
                <Canvas
                  components={components || []}
                  selectedComponentId={selectedComponentId}
                  onSelectComponent={setSelectedComponentId}
                  onDropComponent={handleDropFromLibrary}
                  onUpdatePosition={handleUpdatePosition}
                />
              </div>

            {/* Right: Properties Panel */}
            <div className="w-80 border-l bg-card p-4 overflow-auto animate-fade-in">
              <PropertiesPanel
                component={selectedComponent}
                onUpdateProps={handleUpdateProps}
                onUpdatePosition={(position) => {
                  if (selectedComponent) {
                    handleUpdatePosition(selectedComponent.id, position);
                  }
                }}
                onDelete={handleDeleteComponent}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 p-4 overflow-auto animate-fade-in">
            <RuntimePreview
              components={components || []}
              logicRules={logicRules || []}
            />
          </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DesignLabEditor;

