-- Create function for semantic similarity search on knowledge nodes
CREATE OR REPLACE FUNCTION match_knowledge_nodes(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 5,
  p_conversation_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  node_type knowledge_node_type,
  text text,
  confidence float,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kn.id,
    kn.conversation_id,
    kn.node_type,
    kn.text,
    kn.confidence,
    1 - (kn.embedding <=> query_embedding) AS similarity
  FROM knowledge_nodes kn
  WHERE 
    (p_conversation_id IS NULL OR kn.conversation_id = p_conversation_id)
    AND kn.embedding IS NOT NULL
    AND 1 - (kn.embedding <=> query_embedding) > match_threshold
  ORDER BY kn.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_knowledge_nodes IS 'Search for semantically similar knowledge nodes using vector similarity';