import { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Network, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Node {
  id: string;
  text: string;
  node_type: string;
  confidence: number;
  source_msg_id?: string;
}

interface DBEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
  weight: number;
}

interface GraphData {
  nodes: Array<{ id: string; label: string; type: string; val: number }>;
  links: Array<{ source: string; target: string; label: string; value: number }>;
}

interface Props {
  conversationId: string;
  height?: number;
}

const nodeColors: Record<string, string> = {
  Topic: '#8b5cf6',      // purple
  Claim: '#3b82f6',      // blue
  Evidence: '#10b981',   // green
  Decision: '#f59e0b',   // amber
  Action: '#ef4444'      // red
};

export const KnowledgeGraphViewer = ({ conversationId, height = 400 }: Props) => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);
  const graphRef = useRef<any>();
  const { toast } = useToast();

  const loadGraph = async () => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      // Fetch nodes
      const { data: nodes, error: nodesError } = await supabase
        .from('knowledge_nodes')
        .select('*')
        .eq('conversation_id', conversationId);

      if (nodesError) throw nodesError;

      // Fetch edges
      const { data: edges, error: edgesError } = await supabase
        .from('knowledge_edges')
        .select('*')
        .eq('conversation_id', conversationId);

      if (edgesError) throw edgesError;

      // Transform to graph format
      const graphNodes = (nodes || []).map((node: Node) => ({
        id: node.id,
        label: node.text,
        type: node.node_type,
        val: node.confidence * 10 // size based on confidence
      }));

      const graphLinks = (edges || []).map((edge: DBEdge) => ({
        source: edge.source_node_id,
        target: edge.target_node_id,
        label: edge.edge_type,
        value: edge.weight
      }));

      setGraphData({ nodes: graphNodes, links: graphLinks });
      setNodeCount(graphNodes.length);
      setEdgeCount(graphLinks.length);

      if (graphNodes.length === 0) {
        toast({
          title: "📊 Knowledge Graph vuoto",
          description: "Invia messaggi per costruire il grafo della conoscenza",
        });
      }

    } catch (error) {
      console.error('Error loading knowledge graph:', error);
      toast({
        title: "Errore caricamento grafo",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, [conversationId]);

  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.2, 400);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.2, 400);
    }
  };

  const handleFitView = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50);
    }
  };

  return (
    <Card className="bg-background/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Knowledge Graph</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {nodeCount} nodi
            </Badge>
            <Badge variant="outline" className="text-xs">
              {edgeCount} relazioni
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadGraph}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {graphData.nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <Network className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm">Nessun nodo nel grafo</p>
            <p className="text-xs mt-2">I messaggi AI generano automaticamente il grafo</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <Button
                variant="secondary"
                size="icon"
                onClick={handleZoomIn}
                className="h-8 w-8"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleZoomOut}
                className="h-8 w-8"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleFitView}
                className="h-8 px-2 text-xs"
              >
                Fit View
              </Button>
            </div>
            
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              height={height}
              nodeLabel="label"
              nodeColor={(node: any) => nodeColors[node.type] || '#6b7280'}
              nodeVal="val"
              linkLabel="label"
              linkColor={() => '#4b5563'}
              linkWidth={(link: any) => link.value * 2}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              linkCurvature={0.2}
              backgroundColor="transparent"
              enableNodeDrag={true}
              enableZoomInteraction={true}
              cooldownTicks={100}
              onNodeClick={(node: any) => {
                toast({
                  title: node.type,
                  description: node.label,
                });
              }}
            />
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(nodeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground">{type}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};