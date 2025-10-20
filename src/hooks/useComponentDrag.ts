import { useState, useCallback } from "react";
import { ExtractedComponent } from "@/types/design-lab-scanner";
import { ExtractedFunction } from "@/types/design-lab-scanner";
import { Plugin } from "@/types/design-lab-scanner";

interface DragData {
  type: "extracted-component" | "extracted-function" | "plugin";
  component?: ExtractedComponent;
  function?: ExtractedFunction;
  plugin?: Plugin;
}

export const useComponentDrag = () => {
  const [dragData, setDragData] = useState<DragData | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, canvasRef: React.RefObject<HTMLDivElement>) => {
    e.preventDefault();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json")) as DragData;
      
      if (!canvasRef.current) return null;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      return {
        data,
        position: { x, y },
      };
    } catch (error) {
      console.error("Error parsing drop data:", error);
      return null;
    }
  }, []);

  const convertToComponent = useCallback((
    dropResult: {
      data: DragData;
      position: { x: number; y: number };
    },
    pageId: string
  ) => {
    const { data, position } = dropResult;

    switch (data.type) {
      case "extracted-component":
        if (!data.component) return null;
        return {
          page_id: pageId,
          component_type: data.component.component_type,
          props: data.component.props_schema || {},
          position: {
            x: position.x,
            y: position.y,
            width: data.component.position_in_source?.width || 200,
            height: data.component.position_in_source?.height || 100,
          },
          order_index: Date.now(),
        };

      case "extracted-function":
        if (!data.function) return null;
        // Crea un componente code block per mostrare la funzione
        return {
          page_id: pageId,
          component_type: "function-block",
          props: {
            functionName: data.function.function_name,
            code: data.function.code_generic,
            isAsync: data.function.is_async,
          },
          position: {
            x: position.x,
            y: position.y,
            width: 300,
            height: 200,
          },
          order_index: Date.now(),
        };

      case "plugin":
        if (!data.plugin) return null;
        // Crea un placeholder per il plugin
        return {
          page_id: pageId,
          component_type: "plugin-container",
          props: {
            pluginId: data.plugin.id,
            pluginName: data.plugin.plugin_name,
            config: data.plugin.config_schema || {},
          },
          position: {
            x: position.x,
            y: position.y,
            width: 400,
            height: 300,
          },
          order_index: Date.now(),
        };

      default:
        return null;
    }
  }, []);

  return {
    dragData,
    setDragData,
    handleDragOver,
    handleDrop,
    convertToComponent,
  };
};
