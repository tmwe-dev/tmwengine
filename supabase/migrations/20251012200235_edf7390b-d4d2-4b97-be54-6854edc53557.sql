-- Create enum for node types
CREATE TYPE knowledge_node_type AS ENUM ('Topic', 'Claim', 'Evidence', 'Decision', 'Action');

-- Create enum for edge types
CREATE TYPE knowledge_edge_type AS ENUM ('supports', 'disputes', 'relates_to', 'derives', 'duplicates');

-- Create knowledge_nodes table
CREATE TABLE knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_laboratory_conversations(id) ON DELETE CASCADE,
  node_type knowledge_node_type NOT NULL,
  text TEXT NOT NULL,
  source_msg_id UUID REFERENCES chat_laboratory_messages(id) ON DELETE SET NULL,
  embedding vector(1536),
  confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create knowledge_edges table
CREATE TABLE knowledge_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_laboratory_conversations(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  edge_type knowledge_edge_type NOT NULL,
  weight FLOAT DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_node_id != target_node_id)
);

-- Create indexes for performance
CREATE INDEX idx_knowledge_nodes_conversation ON knowledge_nodes(conversation_id);
CREATE INDEX idx_knowledge_nodes_type ON knowledge_nodes(node_type);
CREATE INDEX idx_knowledge_nodes_source_msg ON knowledge_nodes(source_msg_id);
CREATE INDEX idx_knowledge_nodes_embedding ON knowledge_nodes USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX idx_knowledge_edges_conversation ON knowledge_edges(conversation_id);
CREATE INDEX idx_knowledge_edges_source ON knowledge_edges(source_node_id);
CREATE INDEX idx_knowledge_edges_target ON knowledge_edges(target_node_id);
CREATE INDEX idx_knowledge_edges_type ON knowledge_edges(edge_type);

-- Enable RLS
ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_edges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_nodes
CREATE POLICY "Users can view nodes from their conversations"
  ON knowledge_nodes FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM chat_laboratory_conversations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert nodes"
  ON knowledge_nodes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update nodes"
  ON knowledge_nodes FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete nodes from their conversations"
  ON knowledge_nodes FOR DELETE
  USING (
    conversation_id IN (
      SELECT id FROM chat_laboratory_conversations
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for knowledge_edges
CREATE POLICY "Users can view edges from their conversations"
  ON knowledge_edges FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM chat_laboratory_conversations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert edges"
  ON knowledge_edges FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete edges from their conversations"
  ON knowledge_edges FOR DELETE
  USING (
    conversation_id IN (
      SELECT id FROM chat_laboratory_conversations
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE knowledge_nodes IS 'Knowledge graph nodes extracted from conversations';
COMMENT ON TABLE knowledge_edges IS 'Relationships between knowledge graph nodes';
COMMENT ON COLUMN knowledge_nodes.embedding IS 'Vector embedding for semantic search';
COMMENT ON COLUMN knowledge_nodes.confidence IS 'Confidence score of the extracted node (0-1)';
COMMENT ON COLUMN knowledge_edges.weight IS 'Strength of the relationship (0-1)';